// يولّد أيقونات PWA من علامة القُصاصة (الهوية المقفلة)
// pwa-192.png + pwa-512.png + apple-touch-icon.png (180)
import fs from 'node:fs';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { colors, qusasaPath } from '../../src/tokens/design-tokens.js';

const execFileP = promisify(execFile);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, '..', 'public', 'icons');
fs.mkdirSync(outDir, { recursive: true });

function iconSvg(size) {
  // علامة القُصاصة على خلفية الحبر الداكن (كهرمان) — نفس فافيكون العلامة
  const pad = size * 0.22; // مساحة حماية حول العلامة
  const mark = size - pad * 2;
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${size}" height="${size}" fill="${colors.ink}"/>
  <g transform="translate(${pad},${pad}) scale(${mark / 120})">
    <path fill="${colors.amber}" fill-rule="evenodd" d="${qusasaPath}"/>
  </g>
</svg>`;
}

for (const size of [192, 512, 180]) {
  const tmp = path.join(outDir, `_icon-${size}.svg`);
  fs.writeFileSync(tmp, iconSvg(size));
  const name = size === 180 ? 'apple-touch-icon.png' : `pwa-${size}.png`;
  await execFileP('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', '-i', tmp, '-frames:v', '1', path.join(outDir, name)]);
  fs.unlinkSync(tmp);
  console.log(`✓ ${name}`);
}
