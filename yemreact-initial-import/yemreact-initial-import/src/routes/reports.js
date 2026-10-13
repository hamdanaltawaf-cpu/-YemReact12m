// ============================================================
// مسارات الإبلاغ — عامة (إبلاغ) + إدارية (مراجعة وحل)
// ============================================================
import { reportsService } from '../services/reports.service.js';
import { makeRequireAdmin } from '../lib/admin-guard.js';
import { Errors } from '../lib/errors.js';

export default async function reportsRoutes(app) {
  const service = reportsService({
    reports: app.repos.reports,
    reactions: app.repos.reactions,
    audit: app.repos.audit,
    storage: app.storage,
  });

  // ===== إبلاغ عام (يعلّق الرياكشن فورًا) =====
  app.post('/api/v1/reactions/:id/report', {
    config: { rateLimit: { max: 5, timeWindow: '1 minute' } },
  }, async (request, reply) => {
    const row = await app.repos.reactions.byDisplayIdAnyStatus(request.params.id);
    if (!row) throw Errors.notFound('الرياكشن غير موجود');
    const { reason, contact, email } = request.body || {};
    await service.report({ reaction: row, reason, reporterContact: contact, reporterEmail: email });
    return { ok: true, message: 'استلمنا بلاغك. عُلّق الرياكشن مؤقتًا للمراجعة.' };
  });

  // ===== الإدارة =====
  const requireAdmin = makeRequireAdmin(app);

  // قائمة البلاغات (مفتوحة أولًا)
  app.get('/api/v1/admin/reports', {
    preHandler: requireAdmin,
  }, async (request) => {
    const { all } = request.query;
    const list = all === 'true' ? await app.repos.reports.listAll(200) : await app.repos.reports.listOpen();
    return { reports: list, count: list.length };
  });

  // إعادة نشر (حل بلاغ)
  app.post('/api/v1/admin/reports/:id/republish', {
    preHandler: requireAdmin,
  }, async (request) => {
    const { note } = request.body || {};
    const result = await service.republish(request.params.id, note);
    app.rebuild.schedule();
    return result;
  });

  // حذف نهائي (حل بلاغ)
  app.post('/api/v1/admin/reports/:id/remove', {
    preHandler: requireAdmin,
  }, async (request) => {
    const { note } = request.body || {};
    const result = await service.remove(request.params.id, note);
    app.rebuild.schedule();
    return result;
  });
}
