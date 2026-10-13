// ============================================================
// واجهة معالجة الوسائط — تنفيذ ffmpeg (P2)
// ============================================================
// تنفيذ MediaInterface:
//  - probe(): استخراج المدة/الأبعاد/fps/الترميز عبر ffprobe
//  - process(): ترميز H.264/AAC + faststart + واترمارك القُصاصة + مصغّرة WebP
// (المبدأ المعماري #9: التنفيذ قابل للتبديل خلف الواجهة نفسها)

import fs from 'node:fs';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileP = promisify(execFile);

export class MediaInterface {
  async probe() { throw new Error('Not implemented'); }
  async process() { throw new Error('Not implemented'); }
}

export class FfmpegMedia extends MediaInterface {
  constructor({ ffmpegPath = 'ffmpeg', ffprobePath = 'ffprobe', maxDurationSec = 12, watermark = null }) {
    super();
    this.ffmpegPath = ffmpegPath;
    this.ffprobePath = ffprobePath;
    this.maxDurationSec = maxDurationSec;
    // مسار واترمارك القُصاصة (يُضبط عند المعالجة حسب الزاوية)
    this.watermark = watermark;
  }

  // استخراج بيانات الفيديو
  async probe(inputPath) {
    const { stdout } = await execFileP(this.ffprobePath, [
      '-v', 'error', '-print_format', 'json', '-show_format', '-show_streams', inputPath,
    ]);
    const data = JSON.parse(stdout);
    const vStream = (data.streams || []).find((s) => s.codec_type === 'video');
    const aStream = (data.streams || []).find((s) => s.codec_type === 'audio');
    const duration = parseFloat(vStream?.duration ?? data.format?.duration ?? '0') || 0;
    return {
      duration: Math.round(duration * 10) / 10,
      width: vStream?.width || 0,
      height: vStream?.height || 0,
      fps: vStream?.r_frame_rate ? evalFps(vStream.r_frame_rate) : 0,
      codec: vStream?.codec_name || null,
      hasAudio: Boolean(aStream),
      format: data.format?.format_name || null,
    };
  }

  // معالجة الفيديو: ترميز + واترمارك + مصغّرة
  // الخيارات: { corner: 'tr'|'tl', watermarkPath }
  async process(inputPath, { corner = 'tr', watermarkPath, outputPath, thumbPath }) {
    const watermark = watermarkPath || (this.watermark ? this.watermark[corner] : null);
    if (!watermark) throw new Error('واترمارك غير متوفر');

    const probe = await this.probe(inputPath);
    if (probe.duration > this.maxDurationSec) {
      throw new Error(`المدة ${probe.duration}s تتجاوز الحد الأقصى ${this.maxDurationSec}s`);
    }

    // 1) المصغّرة: من الملف الأصلي قبل إعادة الترميز (درس موثّق)
    const thumbAt = Math.max(0.1, probe.duration * 0.35).toFixed(2);
    await execFileP(this.ffmpegPath, [
      '-y', '-hide_banner', '-loglevel', 'error',
      '-ss', thumbAt, '-i', inputPath,
      '-frames:v', '1', '-vf', "scale='min(720,iw)':-2", '-q:v', '70',
      thumbPath,
    ]);

    // 2) الفيديو: ترميز + تحجيم + واترمارك + faststart
    // حجم الواترمارك: 12% من العرض النهائي (ضمن نطاق 9–15% المقفل)
    // يُحسب مسبقًا بالبكسل (توافق أوسع مع إصدارات ffmpeg بدل صيغة rw/rh الحديثة)
    const finalWidth = Math.min(1080, probe.width || 1080);
    const wmSize = Math.max(24, Math.round(finalWidth * 0.12));
    const overlayX = corner === 'tl' ? '28' : 'W-w-28';
    const overlayY = '28';

    // سلسلة الفلاتر:
    //  [0:v] تحجيم للعرض ≤1080 → [vid]
    //  [1:v] (الواترمارك) يُحجَّم مربعًا إلى wmSize → [wm]
    //  [vid][wm] تراكب في الزاوية المطلوبة → [vout]
    const filterComplex =
      "[0:v]scale='min(1080,iw)':-2[vid];" +
      `[1:v]scale=${wmSize}:${wmSize}[wm];` +
      `[vid][wm]overlay=${overlayX}:${overlayY}[vout]`;

    const args = [
      '-y', '-hide_banner', '-loglevel', 'error',
      '-i', inputPath,
      '-i', watermark,
      '-filter_complex', filterComplex,
      '-map', '[vout]',
      '-map', '0:a?',
      '-c:v', 'libx264', '-profile:v', 'high', '-preset', 'veryfast', '-crf', '23',
      '-pix_fmt', 'yuv420p',
      '-c:a', 'aac', '-b:a', '128k',
      '-movflags', '+faststart',
      '-t', String(this.maxDurationSec),
      outputPath,
    ];

    await execFileP(this.ffmpegPath, args);

    const outSize = fs.statSync(outputPath).size;
    return {
      ...probe,
      outputPath,
      thumbPath,
      sizeBytes: outSize,
      hasWatermark: true,
      corner,
    };
  }
}

// تحويل r_frame_rate مثل "30000/1001" إلى رقم
function evalFps(rate) {
  if (!rate) return 0;
  const parts = String(rate).split('/');
  const n = parseFloat(parts[0]);
  const d = parts[1] ? parseFloat(parts[1]) : 1;
  return d ? Math.round((n / d) * 100) / 100 : 0;
}

// فحص قدرات ffmpeg المطلوبة (libx264 + aac + webp) — يُستدعى عند الإقلاع
// يُرجع قائمة النواقص (فارغة = كل شيء متوفر).
export async function checkFfmpegCapabilities(ffmpegPath = 'ffmpeg') {
  const missing = [];
  const { stdout: encoders } = await execFileP(ffmpegPath, ['-hide_banner', '-encoders']);
  if (!/libx264/.test(encoders)) missing.push('libx264 (ترميز H.264)');
  if (!/\baac\b/.test(encoders)) missing.push('aac (الصوت)');
  if (!/libwebp/.test(encoders)) missing.push('libwebp (المصغّرات)');
  return missing;
}

// مصنع
export function createMedia(mediaConfig) {
  switch (mediaConfig.transport) {
    case 'local':
    case 'ffmpeg':
      return new FfmpegMedia({
        ffmpegPath: mediaConfig.ffmpegPath,
        ffprobePath: mediaConfig.ffprobePath,
      });
    default:
      throw new Error(`ناقل معالجة غير معروف: ${mediaConfig.transport}`);
  }
}
