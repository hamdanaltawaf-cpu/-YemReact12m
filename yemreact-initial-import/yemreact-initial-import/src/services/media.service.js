// ============================================================
// خدمة معالجة الوسائط — خط الإدخال الكامل
// ============================================================
// التدفق: تحقق (حجم + magic bytes) → تجزئة (كشف تكرار) → فحص مدة
//         → معالجة ffmpeg (ترميز + واترمارك + مصغّرة) → تخزين → تنظيف
// (المبدأ المعماري: المعالجة منفصلة وقابلة للتبديل خلف الواجهات)

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { sha256File } from '../lib/crypto.js';
import { assertFileSize, assertVideoMagic } from '../lib/validate.js';
import { Errors } from '../lib/errors.js';

export const mediaService = (deps) => {
  const { media, storage, reactions, config } = deps;

  return {
    // المعالجة الكاملة لملف مرفوع: يعيد بيانات جاهزة لصف قاعدة البيانات
    async ingest({ filePath, corner = 'tr', watermarkPath }) {
      // 1) حجم الملف
      assertFileSize(filePath, config.media.maxUploadBytes);

      // 2) التوقيع الثنائي (magic bytes)
      assertVideoMagic(filePath);

      // 3) تجزئة المحتوى + كشف التكرار (قبل المعالجة المكلفة)
      const contentHash = await sha256File(filePath);
      const duplicate = await reactions.byContentHash(contentHash);
      if (duplicate) {
        throw Errors.conflict(`هذا الفيديو موجود مسبقًا في المكتبة (${duplicate.display_id})`);
      }

      // 4) فحص المدة عبر ffprobe
      const probe = await media.probe(filePath);
      if (probe.duration > media.maxDurationSec) {
        throw Errors.badRequest(
          `مدة الفيديو ${probe.duration} ثانية تتجاوز الحد الأقصى ${media.maxDurationSec} ثانية`
        );
      }
      if (probe.duration <= 0) {
        throw Errors.badRequest('تعذّر قراءة مدة الفيديو — قد يكون الملف تالفًا');
      }

      // 5) المعالجة إلى مجلد مؤقت
      const displayId = await reactions.nextDisplayId();
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'yr-media-'));
      const outVideo = path.join(tmpDir, 'out.mp4');
      const outThumb = path.join(tmpDir, 'thumb.webp');

      let result;
      try {
        result = await media.process(filePath, {
          corner, watermarkPath, outputPath: outVideo, thumbPath: outThumb,
        });
      } catch (err) {
        fs.rmSync(tmpDir, { recursive: true, force: true });
        throw Errors.badRequest(`فشلت معالجة الفيديو: ${err.message}`);
      }

      // 6) التخزين (واجهة قابلة للتبديل)
      const videoKey = `videos/${displayId.toLowerCase()}.mp4`;
      const thumbKey = `thumbs/${displayId.toLowerCase()}.webp`;
      try {
        await storage.put(videoKey, fs.readFileSync(outVideo), 'video/mp4');
        await storage.put(thumbKey, fs.readFileSync(outThumb), 'image/webp');
      } finally {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      }

      // 7) النتيجة الموحّدة
      return {
        displayId,
        contentHash,
        videoKey,
        thumbKey,
        duration: result.duration,
        width: result.width,
        height: result.height,
        fps: result.fps,
        codec: result.codec,
        sizeBytes: result.sizeBytes,
        hasWatermark: true,
        corner,
      };
    },
  };
};
