// ============================================================
// مولّد واترمارك القُصاصة (وفق Brand v1.0 LOCKED)
// ============================================================
// يولّد واترمارك PNG شفافًا من SVG، ثم يُرستر عبر ffmpeg (svg_pipe).
// المواصفة المقفلة: تقشّر ورقي 9–15% من العرض، الزاوية العلوية،
// بظلّ مزدوج (drop-shadow 0 1px 2px + 0 0 2px)، مع قاعدة "قلب الكتلة" (tr/tl).

import fs from 'node:fs';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { colors, clip } from '../tokens/design-tokens.js';

const execFileP = promisify(execFile);

// مسار علامة القُصاصة الكامل (من التوكنز) لرسم الزاوية الممزقة
// إحداثيات القُصاصة في viewBox 0..120

// يُنشئ سطر SVG للواترمارك (نسخة ورقية بظلّ مزدوج + مثلث تشغيل)
// corner: 'tr' (افتراضي) | 'tl' (معكوس)
export function watermarkSvg(corner = 'tr') {
  const paper = colors.paper;
  const ink = colors.ink;
  // قلب الإحداثيات أفقيًا عند 'tl' (مرآة عبر منتصف 120)
  const flip = corner === 'tl';
  const mirror = (x) => (flip ? 120 - x : x);

  // المثلث الورقي (التقشّر) — نظيف كما في المواصفة polygon(100% 0, 0 0, 100% 100%)
  // مع تسنين خفيف على الوتر (القطر) لإيحاء "الحافة الممزقة" بدون تعقيد
  // corner 'tl' يقلب أفقيًا (مرآة عبر منتصف 120)
  const peelPoints = [
    [120, 0], [0, 0],
    [12, 16], [24, 24], [36, 20], [48, 48], [60, 44],
    [72, 72], [84, 68], [96, 96], [120, 120],
  ].map(([x, y]) => `${mirror(x)},${y}`).join(' ');

  // مثلث التشغيل (ثقب القُصاصة) — موضّع في أعلى يمين المثلث
  const playPoints = [[62, 30], [62, 72], [94, 51]].map(([x, y]) => `${mirror(x)},${y}`).join(' ');

  return `<svg width="240" height="240" viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <filter id="ds" x="-40%" y="-40%" width="180%" height="180%">
      <feDropShadow dx="0" dy="1" stdDeviation="0.7" flood-color="#000" flood-opacity="0.6"/>
      <feDropShadow dx="0" dy="0" stdDeviation="0.8" flood-color="#000" flood-opacity="0.4"/>
    </filter>
  </defs>
  <g filter="url(#ds)">
    <polygon points="${peelPoints}" fill="${paper}"/>
    <polygon points="${playPoints}" fill="${ink}"/>
  </g>
</svg>`;
}

// يُرستر سطر SVG إلى PNG عبر ffmpeg
async function rasterize(svgString, ffmpegPath, outPath) {
  const tmp = outPath + '.svg';
  fs.writeFileSync(tmp, svgString);
  try {
    await execFileP(ffmpegPath, ['-y', '-hide_banner', '-loglevel', 'error', '-i', tmp, '-frames:v', '1', outPath]);
  } finally {
    fs.unlinkSync(tmp);
  }
  return outPath;
}

// يضمن وجود ملفات الواترمارك (يولّدها إن لم تكن موجودة)
// يعيد { tr: path, tl: path }
export async function ensureWatermarks({ ffmpegPath = 'ffmpeg', assetsDir }) {
  fs.mkdirSync(assetsDir, { recursive: true });
  const trPath = path.join(assetsDir, 'watermark.png');
  const tlPath = path.join(assetsDir, 'watermark-tl.png');

  if (!fs.existsSync(trPath)) await rasterize(watermarkSvg('tr'), ffmpegPath, trPath);
  if (!fs.existsSync(tlPath)) await rasterize(watermarkSvg('tl'), ffmpegPath, tlPath);
  return { tr: trPath, tl: tlPath };
}
