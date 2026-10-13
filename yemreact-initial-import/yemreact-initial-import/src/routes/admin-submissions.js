// ============================================================
// مسارات الإدارة — مراجعة مساهمات المستخدمين
// ============================================================
import { toPublicReaction } from '../repositories/reactions.js';
import { Errors } from '../lib/errors.js';
import { makeRequireAdmin } from '../lib/admin-guard.js';

// يطبع مساهمة إلى الشكل العام (مع شارة "مساهِم موثوق" إن وُجدت)
function toPublicSubmission(s, trusted = false) {
  return {
    id: s.id,
    status: s.status,
    caption: s.caption,
    situation: s.situation,
    categoryId: s.category_id,
    source: s.source,
    contactEmail: s.contact_email || s.contact,
    ownershipAttested: s.ownership_attested,
    trusted,
    video: s.video_key ? `/media/${s.video_key}` : null,
    duration: s.duration,
    rejectReason: s.reject_reason,
    createdAt: s.created_at,
    reviewedAt: s.reviewed_at,
  };
}

export default async function adminSubmissionsRoutes(app) {
  const requireAdmin = makeRequireAdmin(app);
  const audit = app.repos.audit;
  const baseUrl = app.config.storage.publicBaseUrl;

  const service = app.submissionsService;

  // ===== قائمة المساهمات بحالة (مع شارة موثوق لكل مساهم) =====
  app.get('/api/v1/admin/submissions', {
    preHandler: requireAdmin,
  }, async (request) => {
    const { status } = request.query;
    const rows = await app.repos.submissions.listByStatus(status || null);
    const list = await Promise.all(rows.map(async (s) => {
      const trusted = s.user_id ? await service.isTrusted(s.user_id) : false;
      return toPublicSubmission(s, trusted);
    }));
    return { submissions: list, count: list.length };
  });

  // ===== قبول ونشر =====
  app.post('/api/v1/admin/submissions/:id/approve', {
    preHandler: requireAdmin,
  }, async (request, reply) => {
    const row = await service.approve(request.params.id, request.body || {});
    await audit.log('admin', 'approve', request.params.id, `قبول مساهمة ${request.params.id} → ${row.display_id}`);
    app.rebuild.schedule();
    return { ok: true, reaction: toPublicReaction(row, baseUrl) };
  });

  // ===== رفض مع سبب =====
  app.post('/api/v1/admin/submissions/:id/reject', {
    preHandler: requireAdmin,
  }, async (request, reply) => {
    const { reason } = request.body || {};
    const result = await service.reject(request.params.id, reason);
    await audit.log('admin', 'reject', request.params.id, `رفض مساهمة ${request.params.id}`);
    return result;
  });

  // ===== رفض غير معروف =====
  app.get('/api/v1/admin/submissions/:id', {
    preHandler: requireAdmin,
  }, async (request, reply) => {
    const row = await app.repos.submissions.get(request.params.id);
    if (!row) throw Errors.notFound('المساهمة غير موجودة');
    return { submission: toPublicSubmission(row) };
  });
}
