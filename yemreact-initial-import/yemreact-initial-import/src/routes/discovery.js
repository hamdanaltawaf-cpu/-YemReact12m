// ============================================================
// مسارات الاكتشاف: مختار الأسبوع + المجموعات
// ============================================================
import { toPublicReaction } from '../repositories/reactions.js';

export default async function discoveryRoutes(app) {
  const reactions = app.repos.reactions;
  const collections = app.repos.collections;
  const settings = app.repos.settings;
  const baseUrl = app.config.storage.publicBaseUrl;

  // مختار الأسبوع + جديد المكتبة
  app.get('/api/v1/featured', async () => {
    // يدعم واحدًا أو أكثر (featured_reactions = JSON array) مع توافق قديم (featured_reaction)
    const rawList = await settings.get('featured_reactions');
    let featuredIds = [];
    try { featuredIds = rawList ? JSON.parse(rawList) : []; } catch { featuredIds = []; }
    if (!featuredIds.length) {
      const legacy = await settings.get('featured_reaction');
      if (legacy) featuredIds = [legacy];
    }

    const featuredList = [];
    for (const id of featuredIds) {
      const row = await reactions.featuredByDisplayId(id);
      if (row) featuredList.push(toPublicReaction(row, baseUrl));
    }
    // حد "جديد المكتبة" قابل للضبط من الإعدادات (new_count) — افتراضي 8
    const newCount = Math.min(Number(await settings.get('new_count')) || 8, 24);
    const newest = await reactions.newest(newCount);
    return {
      featured: featuredList[0] || null,       // للتوافق مع الواجهة (البطل)
      featuredList,                              // كل المختارين
      newCount,
      newest: newest.map((r) => toPublicReaction(r, baseUrl)),
    };
  });

  // قائمة المجموعات
  app.get('/api/v1/collections', async () => {
    const list = await collections.list();
    return { collections: list };
  });

  // مجموعة واحدة مع رياكشناتها
  app.get('/api/v1/collections/:slug', async (request, reply) => {
    const collection = await collections.getBySlug(request.params.slug);
    if (!collection) {
      return reply.code(404).send({ error: { code: 'NOT_FOUND', message: 'المجموعة غير موجودة' } });
    }
    const rows = await collections.reactionsBySlug(request.params.slug);
    return {
      collection: {
        slug: collection.slug,
        title: collection.title,
        description: collection.description,
        color: collection.color,
      },
      reactions: rows.map((r) => toPublicReaction(r, baseUrl)),
    };
  });
}
