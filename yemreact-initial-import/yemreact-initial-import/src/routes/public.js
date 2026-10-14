// المسارات العامة: التصنيفات + الرياكشنات (قائمة وتفاصيل)
import { reactionsRepo, toPublicReaction } from '../repositories/reactions.js';
import { categoriesRepo } from '../repositories/categories.js';

export default async function publicRoutes(app) {
  const categories = categoriesRepo(app.pool);
  const reactions = reactionsRepo(app.pool);
  const baseUrl = app.config.storage.publicBaseUrl;

  // قائمة التصنيفات
  app.get('/api/v1/categories', async () => {
    const list = await categories.list();
    return { categories: list };
  });

  // قائمة الرياكشنات (فلترة بالتصنيف والبحث)
  app.get('/api/v1/reactions', async (request, reply) => {
    const { cat, q, limit } = request.query;
    const rows = await reactions.listPublished({
      cat: cat || null,
      q: q || null,
      limit: Math.min(Number(limit) || 60, 100),
    });
    // تسجيل الاستعلامات الفاشلة (صفر نتيجة) لتغذية الفهرس وطابور المحتوى
    if (q && q.trim() && rows.length === 0) {
      app.repos.failedSearches.record(q, 0).catch(() => {});
    }
    return {
      query: q || null,
      category: cat || null,
      count: rows.length,
      reactions: rows.map((r) => toPublicReaction(r, baseUrl)),
    };
  });

  // تفاصيل رياكشن بمعرّف العرض
  app.get('/api/v1/reactions/:id', async (request, reply) => {
    const row = await reactions.byDisplayId(request.params.id);
    if (!row) {
      return reply.code(404).send({ error: { code: 'NOT_FOUND', message: 'الرياكشن غير موجود' } });
    }
    const related = await reactions.related(row.display_id, row.category_id, 5);
    return {
      reaction: toPublicReaction(row, baseUrl),
      related: related.map((r) => toPublicReaction(r, baseUrl)),
    };
  });
}
