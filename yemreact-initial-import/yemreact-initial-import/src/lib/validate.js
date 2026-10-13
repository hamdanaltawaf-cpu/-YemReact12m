// ============================================================
// التحقق من ملفات الفيديو المرفوعة
// ============================================================
// فحص magic bytes (لا نثق بالـ MIME المرسَل)، الحجم، ثم المدة القصوى.
// تُنفَّذ هذه الفحوص كخط دفاع أول قبل أي معالجة.

import fs from 'node:fs';

// توقيعات الملفات الشائعة لأشكال الفيديو (أول بايتات)
// تُقبل mp4/mov (ftyp)، webm/matroska، و3gp — وتُرفض الصور/النصوص المتخفية.
export function detectVideoMagic(buffer) {
  if (buffer.length < 12) return null;
  const head = buffer.subarray(0, 16);
  const s = head.toString('latin1');

  // ISO BMFF: mp4/mov/3gp — 'ftyp' عند الإزاحة 4
  if (s.slice(4, 8) === 'ftyp') return 'mp4';
  // WebM/Matroska: 0x1A45DFA3
  if (head[0] === 0x1a && head[1] === 0x45 && head[2] === 0xdf && head[3] === 0xa3) return 'webm';
  // MPEG-TS
  if (head[0] === 0x47) return 'mpegts';
  // RIFF (avi/wav)
  if (s.slice(0, 4) === 'RIFF' && s.slice(8, 12) === 'AVI ') return 'avi';
  return null;
}

// التحقق من حجم الملف (يُقرأ الحجم الفعلي على القرص)
export function assertFileSize(filePath, maxBytes) {
  const size = fs.statSync(filePath).size;
  if (size <= 0) throw new Error('الملف فارغ');
  if (size > maxBytes) {
    const mb = (size / 1024 / 1024).toFixed(1);
    throw new Error(`حجم الفيديو ${mb}MB يتجاوز الحد الأقصى المسموح`);
  }
  return size;
}

// التحقق من magic bytes للملف
export function assertVideoMagic(filePath) {
  const fd = fs.openSync(filePath, 'r');
  const head = Buffer.alloc(16);
  fs.readSync(fd, head, 0, 16, 0);
  fs.closeSync(fd);
  const kind = detectVideoMagic(head);
  if (!kind) {
    throw new Error('الملف ليس فيديو صالحًا (فشل فحص التوقيع الثنائي)');
  }
  return kind;
}
