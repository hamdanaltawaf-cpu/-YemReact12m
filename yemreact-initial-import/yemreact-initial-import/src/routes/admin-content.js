// ============================================================
// مسارات الإدارة — المحتوى: التصنيفات + المجموعات + مختار الأسبوع
// ============================================================
import { Errors } from '../lib/errors.js';
import { makeRequireAdmin } from '../lib/admin-guard.js';

export default async function adminContentRoutes(app) {
  const requireAdmin = makeRequireAdmin(app);
  const categories = app.repos.categories;
  const collections = app.repos.collections;
  const settings = app.repos.settings;
  const audit = app.repos.audit;

  // ===== التصنيفات =====
  // قائمة كاملة (للإدارة)
  app.get('/api/v1/admin/categories', {
    preHandler: requireAdmin,
  }, async () => {
    return { categories: await categories.listAll() };
  });

  // تعديل تصنيف (اسم/وصف/ترتيب — اللون مقفل)
  app.patch('/api/v1/admin/categories/:id', {
    preHandler: requireAdmin,
  }, async (request, reply) => {
    const { name, description, sortOrder } = request.body || {};
    const updated = await categories.update(request.params.id, {
      name: name ?? null,
      description: description ?? null,
      sortOrder: sortOrder !== undefined ? Number(sortOrder) : null,
    });
    if (!updated) throw Errors.notFound('التصنيف غير موجود');
    await audit.log('admin', 'update', request.params.id, `تعديل تصنيف ${request.params.id}`);
    return { ok: true, category: updated };
  });

  // ===== المجموعات =====
  app.get('/api/v1/admin/collections', {
    preHandler: requireAdmin,
  }, async () => {
    return { collections: await collections.listAllAdmin() };
  });

  app.post('/api/v1/admin/collections', {
    preHandler: requireAdmin,
  }, async (request, reply) => {
    const { slug, title, description, color } = request.body || {};
    if (!slug || !title) throw Errors.badRequest('slug وtitle مطلوبان');
    const created = await collections.create({
      slug: String(slug).trim(), title: String(title).trim(), description, color,
    });
    await audit.log('admin', 'create', created.id, `إنشاء مجموعة ${title}`);
    return reply.code(201).send({ ok: true, collection: created });
  });

  app.patch('/api/v1/admin/collections/:id', {
    preHandler: requireAdmin,
  }, async (request, reply) => {
    const { slug, title, description, color, sortOrder, active } = request.body || {};
    const updated = await collections.update(request.params.id, {
      slug, title, description, color,
      sortOrder: sortOrder !== undefined ? Number(sortOrder) : null,
      active: active !== undefined ? Boolean(active) : null,
    });
    if (!updated) throw Errors.notFound('المجموعة غير موجودة');
    await audit.log('admin', 'update', request.params.id, `تعديل مجموعة ${updated.slug}`);
    return { ok: true, collection: updated };
  });

  app.delete('/api/v1/admin/collections/:id', {
    preHandler: requireAdmin,
  }, async (request, reply) => {
    const existing = await collections.getById(request.params.id);
    if (!existing) throw Errors.notFound('المجموعة غير موجودة');
    await collections.remove(request.params.id);
    await audit.log('admin', 'delete', request.params.id, `حذف مجموعة ${existing.slug}`);
    return { ok: true };
  });

  // عضوية المجموعة
  app.get('/api/v1/admin/collections/:id/items', {
    preHandler: requireAdmin,
  }, async (request, reply) => {
    const c = await collections.getById(request.params.id);
    if (!c) throw Errors.notFound('المجموعة غير موجودة');
    return { items: await collections.itemIds(request.params.id) };
  });

  app.post('/api/v1/admin/collections/:id/items', {
    preHandler: requireAdmin,
  }, async (request, reply) => {
    const c = await collections.getById(request.params.id);
    if (!c) throw Errors.notFound('المجموعة غير موجودة');
    const { reactionId } = request.body || {};
    if (!reactionId) throw Errors.badRequest('reactionId مطلوب');
    await collections.addItem(request.params.id, reactionId);
    await audit.log('admin', 'update', request.params.id, `إضافة ${reactionId} لمجموعة ${c.slug}`);
    return { ok: true };
  });

  app.delete('/api/v1/admin/collections/:id/items', {
    preHandler: requireAdmin,
  }, async (request, reply) => {
    const c = await collections.getById(request.params.id);
    if (!c) throw Errors.notFound('المجموعة غير موجودة');
    const { reactionId } = request.body || {};
    if (!reactionId) throw Errors.badRequest('reactionId مطلوب');
    await collections.removeItem(request.params.id, reactionId);
    await audit.log('admin', 'update', request.params.id, `إزالة ${reactionId} من ${c.slug}`);
    return { ok: true };
  });

  // ===== مختار الأسبوع =====
  // تعيين واحد أو أكثر (JSON array من معرّفات العرض)
  app.post('/api/v1/admin/featured', {
    preHandler: requireAdmin,
  }, async (request, reply) => {
    const { reactionIds } = request.body || {};
    if (!Array.isArray(reactionIds) || !reactionIds.length) {
      throw Errors.badRequest('reactionIds يجب أن تكون قائمة غير فارغة');
    }
    await settings.set('featured_reactions', JSON.stringify(reactionIds));
    await audit.log('admin', 'featured', null, `مختار الأسبوع: ${reactionIds.join(', ')}`);
    return { ok: true, featured: reactionIds };
  });

  // قراءة الحالي
  app.get('/api/v1/admin/featured', {
    preHandler: requireAdmin,
  }, async () => {
    const raw = await settings.get('featured_reactions');
    let list = [];
    try { list = raw ? JSON.parse(raw) : []; } catch { list = []; }
    return { featured: list };
  });
}
