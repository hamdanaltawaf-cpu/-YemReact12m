// ============================================================
// خدمة المساهمات — القبول والرفض (مع إشعار وشارة موثوق)
// ============================================================
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Errors } from '../lib/errors.js';
import { buildSearchText } from '../lib/search.js';

// يستخرج بريد الإشعار من مساهمة (بريد الحساب ← بريد التواصل ← contact إن بدا بريدًا)
function resolveEmail(sub, user) {
  if (user?.email) return user.email;
  if (sub.contact_email) return sub.contact_email;
  if (sub.contact && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sub.contact)) return sub.contact;
  return null;
}

export const submissionsService = (deps) => {
  const { submissions, reactions, media, storage, config, mail, users } = deps;

  return {
    // قبول مساهمة وتحويلها لرياكشن منشور
    async approve(submissionId, overrides = {}) {
      const sub = await submissions.get(submissionId);
      if (!sub) throw Errors.notFound('المساهمة غير موجودة');
      if (sub.status !== 'pending') {
        throw Errors.conflict(`المساهمة حالة ${sub.status} — لا يمكن قبولها`);
      }
      if (!sub.video_key) {
        throw Errors.badRequest('المساهمة بلا فيديو مرفوع');
      }

      const categoryId = overrides.category_id || sub.category_id;
      const caption = (overrides.caption !== undefined ? overrides.caption : sub.caption || '').trim();
      const situation = (overrides.situation !== undefined ? overrides.situation : sub.situation || '').trim();
      if (!categoryId) throw Errors.badRequest('التصنيف مطلوب للقبول');
      if (!caption) throw Errors.badRequest('الكابشن مطلوب');
      if (!situation) throw Errors.badRequest('الموقف مطلوب');

      const buffer = await storage.get(sub.video_key);
      if (!buffer) throw Errors.notFound('فيديو المساهمة غير موجود في التخزين');
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'yr-sub-'));
      const tmpVideo = path.join(tmpDir, 'sub.mp4');
      fs.writeFileSync(tmpVideo, buffer);

      let ingested;
      try {
        ingested = await media.ingest({
          filePath: tmpVideo,
          corner: overrides.corner || 'tr',
          watermarkPath: deps.watermarks?.[overrides.corner || 'tr'],
        });
      } finally {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      }

      const keywords = overrides.keywords ?? [];
      const row = await reactions.create({
        displayId: ingested.displayId,
        slug: ingested.displayId.toLowerCase(),
        categoryId, caption, situation,
        description: overrides.description ?? null,
        keywords, duration: ingested.duration, corner: overrides.corner || 'tr',
        source: overrides.source ?? sub.source, sourceUrl: overrides.sourceUrl ?? null,
        status: 'published', rightsStatus: 'original_submission',
        contentHash: ingested.contentHash, videoKey: ingested.videoKey, thumbKey: ingested.thumbKey,
        codec: ingested.codec, width: ingested.width, height: ingested.height, fps: ingested.fps,
        sizeBytes: ingested.sizeBytes, hasWatermark: true,
        searchText: buildSearchText({ caption, situation, description: overrides.description, keywords }),
      });

      await storage.delete(sub.video_key);
      await submissions.setStatus(submissionId, 'approved');

      // إشعار المساهم
      const user = sub.user_id ? await users.byId(sub.user_id) : null;
      const email = resolveEmail(sub, user);
      if (email) {
        await mail.sendSubmissionStatus(email, 'approved').catch(() => {});
      }

      return row;
    },

    // رفض مساهمة مع سبب
    async reject(submissionId, reason) {
      const sub = await submissions.get(submissionId);
      if (!sub) throw Errors.notFound('المساهمة غير موجودة');
      if (sub.status !== 'pending') {
        throw Errors.conflict(`المساهمة حالة ${sub.status} — لا يمكن رفضها`);
      }
      const clean = (reason || 'غير مناسب').trim().slice(0, 300) || 'غير مناسب';
      await submissions.setStatus(submissionId, 'rejected', clean);

      const user = sub.user_id ? await users.byId(sub.user_id) : null;
      const email = resolveEmail(sub, user);
      if (email) {
        await mail.sendSubmissionStatus(email, 'rejected').catch(() => {});
      }
      return { ok: true };
    },

    // هل المستخدم "مساهِم موثوق"؟ (عدد المساهمات المقبولة ≥ العتبة)
    async isTrusted(userId) {
      if (!userId) return false;
      const n = await submissions.countApprovedByUser(userId);
      return n >= config.trustedContributor.threshold;
    },
  };
};

