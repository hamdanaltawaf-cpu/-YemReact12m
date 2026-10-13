// ============================================================
// المسارات العامة للمساهمات — "عندك رياكشن يمني يستاهل؟ أرسله لنا"
// ============================================================
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';
import { Errors } from '../lib/errors.js';
import { assertFileSize, assertVideoMagic } from '../lib/validate.js';

// يطبع مساهمة للاستعلام العام (بلا فيديو — خصوصية)
function toPublicTracking(s) {
  return {
    id: s.id,
    status: s.status,
    rejectReason: s.reject_reason,
    createdAt: s.created_at,
    reviewedAt: s.reviewed_at,
  };
}

export default async function submissionsRoutes(app) {
  const submissions = app.repos.submissions;
  const auth = app.authService; // يُحقن من app.js

  // ===== رفع مساهمة (multipart + إقرار ملكية إلزامي) =====
  app.post('/api/v1/submissions', {
    config: { rateLimit: { max: app.config.rateLimit.submissionsMax, timeWindow: '1 minute' } },
  }, async (request, reply) => {
    const data = await request.file();
    if (!data) throw Errors.badRequest('أرفق ملف فيديو (حقل file)');

    // حفظ مؤقت
    const tmpPath = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'yr-sub-up-')), 'upload.bin');
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

    try {
      // التحقق من الملف (حجم + توقيع ثنائي)
      assertFileSize(tmpPath, app.config.media.maxUploadBytes);
      assertVideoMagic(tmpPath);

      const f = data.fields || {};
      const situation = (f.situation?.value || '').trim();
      if (!situation) throw Errors.badRequest('الموقف مطلوب (لمّا... / اقتباس)');
      if (situation.length > 120) throw Errors.badRequest('الموقف أطول من 120 حرفًا');

      // إقرار الملكية إلزامي
      if (f.ownership?.value !== 'true' && f.ownership?.value !== 'on') {
        throw Errors.badRequest('يجب الإقرار بحقك في إرسال الفيديو ومنح ترخيص الاستخدام');
      }

      const caption = (f.caption?.value || '').trim().slice(0, 40) || null;
      const categoryId = f.category?.value || null;
      const source = (f.source?.value || '').trim().slice(0, 300) || null;
      const contactEmail = (f.email?.value || '').trim().slice(0, 200) || null;

      // تحديد هوية المساهم (مستخدم مسجّل أو جلسة ضيف)
      const user = await auth.userFromRequest(request);
      const sessionId = request.cookies?.yr_sid || null;

      // معرف تتبع
      const id = await submissions.nextTrackingId();
      const videoKey = `submissions/${id.toLowerCase()}.mp4`;
      const ext = detectExt(data.filename);
      const finalKey = ext && ext !== 'mp4' ? `submissions/${id.toLowerCase()}.${ext}` : videoKey;

      await app.storage.put(finalKey, fs.readFileSync(tmpPath), 'video/mp4');

      await submissions.create({
        id,
        userId: user?.id ?? null,
        sessionId,
        contact: contactEmail,
        contactEmail,
        caption,
        situation,
        categoryId,
        source,
        videoKey: finalKey,
        duration: 0,
        ownershipAttested: true,
      });

      return reply.code(201).send({
        ok: true,
        id,
        status: 'pending',
        message: 'وصلت مساهمتك وهي قيد المراجعة. احفظ رقم التتبع للمتابعة.',
      });
    } finally {
      fs.rmSync(path.dirname(tmpPath), { recursive: true, force: true });
    }
  });

  // ===== استعلام عن حالة مساهمة برقم التتبع =====
  app.get('/api/v1/submissions/:id', async (request, reply) => {
    const s = await submissions.get(request.params.id);
    if (!s) {
      return reply.code(404).send({ error: { code: 'NOT_FOUND', message: 'رقم التتبع غير موجود' } });
    }
    return { submission: toPublicTracking(s) };
  });
}

function detectExt(filename) {
  const m = /\.([a-zA-Z0-9]+)$/.exec(filename || '');
  const ext = m ? m[1].toLowerCase() : 'mp4';
  return ['mp4', 'webm', 'mov'].includes(ext) ? ext : 'mp4';
}
