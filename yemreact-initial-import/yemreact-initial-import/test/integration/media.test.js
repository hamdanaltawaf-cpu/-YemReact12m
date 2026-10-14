// اختبارات التكامل — معالجة الوسائط (P2)
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { startTestApp, stopTestApp } from '../helpers/testapp.js';
import { generateTestVideo } from '../helpers/media.js';
import { assertVideoMagic, assertFileSize } from '../../src/lib/validate.js';

let ctx;
before(async () => { ctx = await startTestApp(); });
after(async () => { await stopTestApp(ctx); });

test('magic bytes: يرفض ملفًا نصيًا متخفيًا بامتداد mp4', () => {
  const fake = path.join(os.tmpdir(), 'fake.mp4');
  fs.writeFileSync(fake, 'هذا ليس فيديو حقيقي');
  assert.throws(() => assertVideoMagic(fake), /ليس فيديو/);
});

test('magic bytes: يقبل فيديو mp4 حقيقيًا', async () => {
  const video = await generateTestVideo({ durationSec: 1 });
  assert.equal(assertVideoMagic(video), 'mp4');
});

test('الحجم: يرفض ملفًا يتجاوز الحد', () => {
  const big = path.join(os.tmpdir(), 'big.bin');
  fs.writeFileSync(big, Buffer.alloc(1024));
  assert.throws(() => assertFileSize(big, 100), /تجاوز|حجم/);
  assert.equal(assertFileSize(big, 2000), 1024);
});

test('probe يستخرج المدة والأبعاد والترميز', async () => {
  const video = await generateTestVideo({ durationSec: 3, withAudio: false });
  const probe = await ctx.app.media.probe(video);
  assert.equal(probe.duration, 3);
  assert.equal(probe.width, 360);
  assert.equal(probe.height, 640);
  assert.equal(probe.codec, 'h264');
  assert.equal(probe.hasAudio, false);
});

test('process ينتج فيديو H.264 بواترمارك + مصغّرة WebP', async () => {
  const video = await generateTestVideo({ durationSec: 3 });
  const out = path.join(os.tmpdir(), `yr-out-${Date.now()}.mp4`);
  const thumb = path.join(os.tmpdir(), `yr-thumb-${Date.now()}.webp`);

  const result = await ctx.app.media.process(video, {
    corner: 'tr',
    watermarkPath: ctx.app.watermarks.tr,
    outputPath: out,
    thumbPath: thumb,
  });

  assert.equal(result.duration, 3);
  assert.equal(result.hasWatermark, true);
  assert.ok(result.sizeBytes > 0);
  assert.ok(fs.existsSync(out));
  assert.ok(fs.existsSync(thumb));
  // المصغّرة WebP فعلية (توقيع RIFF....WEBP)
  assert.equal(fs.readFileSync(thumb).subarray(8, 12).toString('latin1'), 'WEBP');
});

test('يُرفض فيديو تتجاوز مدته الحد الأقصى (12 ثانية)', async () => {
  const video = await generateTestVideo({ durationSec: 15 });
  const out = path.join(os.tmpdir(), `yr-long-${Date.now()}.mp4`);
  const thumb = path.join(os.tmpdir(), `yr-long-${Date.now()}.webp`);
  await assert.rejects(
    () => ctx.app.media.process(video, {
      corner: 'tr', watermarkPath: ctx.app.watermarks.tr, outputPath: out, thumbPath: thumb,
    }),
    /تتجاوز الحد الأقصى/
  );
});
