// مساعد وسائط للتجارب: توليد فيديو اختبار صغير + بناء جسم multipart
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const execFileP = promisify(execFile);

// يولد فيديو اختبار mp4 فريد المحتوى (تردد صوتي عشوائي = محتوى مختلف كل مرة)
// هذا مهم لأن testsrc2 حتمي، ولو تطابق المحتوى لكان كشف التكرار يتداخل بين الاختبارات.
export async function generateTestVideo({ durationSec = 3, withAudio = true } = {}) {
  const out = path.join(os.tmpdir(), `yr-test-video-${Date.now()}-${Math.random().toString(36).slice(2)}.mp4`);
  // تردد عشوائي (محتوى فريد لكل توليد)
  const freq = 300 + Math.floor(Math.random() * 700);
  const args = [
    '-y', '-hide_banner', '-loglevel', 'error',
    '-f', 'lavfi', '-i', `testsrc2=size=360x640:rate=25`,
    '-f', 'lavfi', '-i', `sine=frequency=${freq}:duration=${durationSec}`,
    '-t', String(durationSec),
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p',
  ];
  if (withAudio) args.push('-c:a', 'aac');
  else args.push('-an'); // بدون صوت
  args.push(out);
  await execFileP('ffmpeg', args);
  return out;
}

// يبني جسم multipart/form-data من حقول نصية + ملف
// يُرجع { body: Buffer, contentType: string }
export function buildMultipart(fields, file) {
  const boundary = `----yr-boundary-${Math.random().toString(36).slice(2)}`;
  const chunks = [];

  for (const [name, value] of Object.entries(fields)) {
    chunks.push(Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="${name}"\r\n\r\n${value}\r\n`
    ));
  }

  if (file) {
    chunks.push(Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${file.filename}"\r\n` +
      `Content-Type: ${file.contentType}\r\n\r\n`
    ));
    chunks.push(file.buffer);
    chunks.push(Buffer.from('\r\n'));
  }

  chunks.push(Buffer.from(`--${boundary}--\r\n`));
  return {
    body: Buffer.concat(chunks),
    contentType: `multipart/form-data; boundary=${boundary}`,
  };
}

// يقرأ ملفًا كـ Buffer
export function fileToBuffer(filePath) {
  return fs.readFileSync(filePath);
}
