// ============================================================
// خدمة الإبلاغ (Takedown)
// ============================================================
// عند الإبلاغ: يُعلَّق الرياكشن فورًا (status='legal_review' — لا يظهر في
// الواجهة العامة) ويُنشأ بلاغ مفتوح. المسؤول يعيد النشر أو يحذف نهائيًا.

import { Errors } from '../lib/errors.js';

export const reportsService = (deps) => {
  const { reports, reactions, audit } = deps;

  return {
    // إبلاغ عن رياكشن → تعليق فوري
    async report({ reaction, reason, reporterContact = null, reporterEmail = null }) {
      if (!reason || !reason.trim()) {
        throw Errors.badRequest('سبب البلاغ مطلوب');
      }
      const cleanReason = reason.trim().slice(0, 500);

      const report = await reports.create({
        reactionId: reaction.id,
        reason: cleanReason,
        reporterContact: reporterContact ? String(reporterContact).slice(0, 200) : null,
        reporterEmail: reporterEmail ? String(reporterEmail).slice(0, 200) : null,
      });

      // تعليق فوري (لا يظهر في الواجهة العامة)
      await reactions.setStatus(reaction.id, 'legal_review');

      await audit.log('report', 'report', reaction.display_id, `بلاغ على ${reaction.display_id}: ${cleanReason.slice(0, 100)}`);
      return report;
    },

    // حل بلاغ: إعادة نشر
    async republish(reportId, note = null) {
      const report = await reports.get(reportId);
      if (!report) throw Errors.notFound('البلاغ غير موجود');
      await reactions.setStatus(report.reaction_id, 'published');
      await reports.resolve(reportId, 'resolved_published', note);
      await audit.log('admin', 'republish', report.reaction_id, `إعادة نشر بعد بلاغ`);
      return { ok: true };
    },

    // حل بلاغ: حذف نهائي (صلب)
    async remove(reportId, note = null) {
      const report = await reports.get(reportId);
      if (!report) throw Errors.notFound('البلاغ غير موجود');
      // حذف ملفات الوسائط أولًا (إن توفر التخزين)
      if (deps.storage) {
        const row = await reactions.byId(report.reaction_id);
        if (row) {
          if (row.video_key) await deps.storage.delete(row.video_key).catch(() => {});
          if (row.thumb_key) await deps.storage.delete(row.thumb_key).catch(() => {});
        }
      }
      // الحذف الصلب: تُحذف الأحداث والمحفوظات تلقائيًا (ON DELETE CASCADE)
      await reactions.hardDelete(report.reaction_id);
      await reports.resolve(reportId, 'resolved_deleted', note);
      await audit.log('admin', 'takedown', report.reaction_id, `حذف نهائي بعد بلاغ`);
      return { ok: true };
    },
  };
};
