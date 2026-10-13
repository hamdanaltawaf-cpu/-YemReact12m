// ============================================================
// مسارات الإدارة — إدارة الرياكشنات (CRUD + رفع + إحصائيات)
// ============================================================
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';

import { mediaService } from '../services/media.service.js';
import { toPublicReaction } from '../repositories/reactions.js';
import { buildSearchText } from '../lib/search.js';
import { Errors } from '../lib/errors.js';
import { makeRequireAdmin } from '../lib/admin-guard.js';

export default async function adminReactionsRoutes(app) {
  const requireAdmin = makeRequireAdmin(app);
  const reactions = app.repos.reactions;
  const audit = app.repos.audit;
  const baseUrl = app.config.storage.publicBaseUrl;

  const media = mediaService({
    media: app.media, storage: app.storage, reactions, config: app.config,
  });

  // ===== رفع رياكشن (multipart + معالجة كاملة) =====
  app.post('/api/v1/admin/reactions', {
    preHandler: requireAdmin,
    config: { rateLimit: { max: 10, timeWindow: '1 minute' } },
  }, async (request, reply) => {
    const data = await request.file();
    if (!data) throw Errors.badRequest('أرفق ملف فيديو (حقل file)');

    const tmpPath = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'yr-up-')), 'upload.bin');
    try {
      await pipeline(data.file, fs.createWriteStream(tmpPath));
    } catch (err) {
      fs.rmSync(path.dirname(tmpPath), { recursive: true, force: true });
      throw Errors.badRequest(`تعذّر استلام الملف: ${err.message}`);
    }
    if (data.file.truncated) {
      fs.rmSync(path.dirname(tmpPath), { recursive: true, force: true });
      throw Errors.badRequest('الملف أكبر من الحد المسموح');
    }

    const f = data.fields || {};
    const corner = f.corner?.value === 'tl' ? 'tl' : 'tr';

    let ingested;
    try {
      ingested = await media.ingest({
        filePath: tmpPath, corner, watermarkPath: app.watermarks[corner],
      });
    } finally {
      fs.rmSync(path.dirname(tmpPath), { recursive: true, force: true });
    }

    const categoryId = f.category?.value;
    const caption = (f.caption?.value || '').trim();
    const situation = (f.situation?.value || '').trim();
    if (!categoryId) throw Errors.badRequest('التصنيف مطلوب');
    if (!caption) throw Errors.badRequest('الكابشن مطلوب');
    if (!situation) throw Errors.badRequest('الموقف مطلوب');

    const keywords = (f.keywords?.value || '').split(/[,،\n]/).map((k) => k.trim()).filter(Boolean);
    const searchOptimizer = (f.searchOptimizer?.value || '').trim() || null;

    const row = await reactions.create({
      displayId: ingested.displayId,
      slug: ingested.displayId.toLowerCase(),
      categoryId, caption, situation,
      description: f.description?.value || null,
      keywords, searchOptimizer, duration: ingested.duration, corner,
      source: f.source?.value || null, sourceUrl: f.sourceUrl?.value || null,
      status: f.status?.value === 'draft' ? 'draft' : 'published',
      contentHash: ingested.contentHash, videoKey: ingested.videoKey, thumbKey: ingested.thumbKey,
      codec: ingested.codec, width: ingested.width, height: ingested.height, fps: ingested.fps,
      sizeBytes: ingested.sizeBytes, hasWatermark: true,
      searchText: buildSearchText({ caption, situation, description: f.description?.value, keywords, searchOptimizer }),
    });

    await audit.log('admin', 'create', row.display_id, `رفع رياكشن ${row.display_id}`);
    app.rebuild.schedule();

    return reply.code(201).send({ ok: true, reaction: toPublicReaction(row, baseUrl) });
  });

  // ===== قائمة الرياكشنات (ترقيم + بحث + فلترة) =====
  app.get('/api/v1/admin/reactions', {
    preHandler: requireAdmin,
  }, async (request) => {
    const { status, q, cat, page, pageSize } = request.query;
    const { rows, total, page: p, pageSize: ps } = await reactions.listAllForAdmin({
      status: status || null,
      q: q || null,
      cat: cat || null,
      page: Number(page) || 1,
      pageSize: Math.min(Number(pageSize) || 30, 100),
    });
    return {
      items: rows.map((r) => toPublicReaction(r, baseUrl)),
      total, page: p, pageSize: ps,
    };
  });

  // ===== تفاصيل رياكشن واحد (للإدارة — أي حالة) =====
  app.get('/api/v1/admin/reactions/:id', {
    preHandler: requireAdmin,
  }, async (request, reply) => {
    const row = await reactions.byDisplayIdAnyStatus(request.params.id);
    if (!row) throw Errors.notFound('الرياكشن غير موجود');
    return { reaction: toPublicReaction(row, baseUrl) };
  });

  // ===== تعديل محتوى رياكشن =====
  app.patch('/api/v1/admin/reactions/:id', {
    preHandler: requireAdmin,
  }, async (request, reply) => {
    const row = await reactions.byDisplayIdAnyStatus(request.params.id);
    if (!row) throw Errors.notFound('الرياكشن غير موجود');

    const b = request.body || {};
    // حقول قابلة للتعديل (الملفات لا تُعدَّل هنا — رفع جديد لاستبدال)
    const fields = {};
    if (b.caption !== undefined) fields.caption = String(b.caption).trim();
    if (b.situation !== undefined) fields.situation = String(b.situation).trim();
    if (b.description !== undefined) fields.description = b.description || null;
    if (b.keywords !== undefined) fields.keywords = (b.keywords || []).map((k) => String(k).trim()).filter(Boolean);
    if (b.searchOptimizer !== undefined) fields.searchOptimizer = b.searchOptimizer || null;
    if (b.corner !== undefined) fields.corner = b.corner === 'tl' ? 'tl' : 'tr';
    if (b.source !== undefined) fields.source = b.source || null;
    if (b.sourceUrl !== undefined) fields.sourceUrl = b.sourceUrl || null;
    if (b.categoryId !== undefined) fields.categoryId = b.categoryId;
    if (b.rightsStatus !== undefined) fields.rightsStatus = b.rightsStatus;

    // إعادة توليد نص البحث عند تغيير المحتوى
    const caption = fields.caption !== undefined ? fields.caption : row.caption;
    const situation = fields.situation !== undefined ? fields.situation : row.situation;
    const description = fields.description !== undefined ? fields.description : row.description;
    const keywords = fields.keywords !== undefined ? fields.keywords : row.keywords;
    const searchOptimizer = fields.searchOptimizer !== undefined ? fields.searchOptimizer : row.search_optimizer;
    fields.searchText = buildSearchText({ caption, situation, description, keywords, searchOptimizer });

    const updated = await reactions.update(row.id, fields);
    await audit.log('admin', 'update', row.display_id, `تعديل رياكشن ${row.display_id}`);
    app.rebuild.schedule();

    return { ok: true, reaction: toPublicReaction(updated, baseUrl) };
  });

  // ===== تغيير الحالة (نشر/مسودة/أرشفة) =====
  app.patch('/api/v1/admin/reactions/:id/status', {
    preHandler: requireAdmin,
  }, async (request, reply) => {
    const row = await reactions.byDisplayIdAnyStatus(request.params.id);
    if (!row) throw Errors.notFound('الرياكشن غير موجود');
    const { status } = request.body || {};
    if (!['draft', 'published', 'archived', 'legal_review'].includes(status)) {
      throw Errors.badRequest('حالة غير صالحة (draft|published|archived|legal_review)');
    }
    const updated = await reactions.setStatus(row.id, status);
    await audit.log('admin', status === 'archived' ? 'archive' : 'publish', row.display_id, `حالة ${row.display_id} → ${status}`);
    app.rebuild.schedule();
    return { ok: true, reaction: toPublicReaction(updated, baseUrl) };
  });

  // ===== إحصائيات حقيقية (مجمّعة من الأحداث) =====
  app.get('/api/v1/admin/stats', {
    preHandler: requireAdmin,
  }, async () => {
    const totals = await app.pool.query(
      `SELECT
         COALESCE(SUM(views_count),0)::int AS views,
         COALESCE(SUM(saves_count),0)::int AS saves,
         COALESCE(SUM(downloads_count),0)::int AS downloads,
         COALESCE(SUM(shares_count),0)::int AS shares
       FROM reactions WHERE status = 'published'`
    );
    const byStatus = await app.pool.query(
      `SELECT status, COUNT(*)::int AS n FROM reactions GROUP BY status`
    );
    const byCategory = await app.pool.query(
      `SELECT c.id, c.name, c.color, COUNT(r.id)::int AS count,
              COALESCE(SUM(r.views_count),0)::int AS views
       FROM categories c LEFT JOIN reactions r ON r.category_id = c.id AND r.status = 'published'
       GROUP BY c.id, c.name, c.color ORDER BY c.sort_order`
    );
    const top = await app.pool.query(
      `SELECT display_id, caption, views_count FROM reactions
       WHERE status = 'published' ORDER BY views_count DESC LIMIT 8`
    );
    // سلسلة زمنية: مشاهدات آخر 14 يومًا من الأحداث الخام
    const daily = await app.pool.query(
      `SELECT to_char(created_at, 'YYYY-MM-DD') AS day, COUNT(*)::int AS n
       FROM events WHERE type = 'view' AND created_at > now() - interval '14 days'
       GROUP BY day ORDER BY day ASC`
    );
    return {
      totals: totals.rows[0],
      byStatus: Object.fromEntries(byStatus.rows.map((r) => [r.status, r.n])),
      byCategory: byCategory.rows,
      top: top.rows,
      daily: daily.rows,
    };
  });

  // ===== سجل التدقيق =====
  app.get('/api/v1/admin/audit', {
    preHandler: requireAdmin,
  }, async (request) => {
    const limit = Math.min(Number(request.query.limit) || 100, 500);
    const logs = await app.repos.audit.list(limit);
    return { logs };
  });

  // ===== الاستعلامات الفاشلة (تغذية الفهرس) =====
  app.get('/api/v1/admin/failed-searches', {
    preHandler: requireAdmin,
  }, async () => {
    const top = await app.repos.failedSearches.top(30);
    const total7d = await app.repos.failedSearches.countSince(7);
    return { failedSearches: top, total7d };
  });
}
