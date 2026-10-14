// اختبارات التكامل — رفع رياكشن عبر واجهة الإدارة (P2)
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startTestApp, stopTestApp, firstCookie } from '../helpers/testapp.js';
import { generateTestVideo, buildMultipart, fileToBuffer } from '../helpers/media.js';

let ctx;
let adminCookie;

before(async () => {
  ctx = await startTestApp();
  // دخول المسؤول
  const login = await ctx.app.inject({
    method: 'POST', url: '/api/v1/admin/login',
    payload: { password: 'test-admin-password-012345' },
  });
  adminCookie = firstCookie(login);
});

after(async () => { await stopTestApp(ctx); });

test('رفض الرفع بدون جلسة مسؤول (401)', async () => {
  const res = await ctx.app.inject({ method: 'POST', url: '/api/v1/admin/reactions' });
  assert.equal(res.statusCode, 401);
});

test('رفع رياكشن كامل: معالجة + نشر + ملفات قابلة للوصول', async () => {
  const video = await generateTestVideo({ durationSec: 3, withAudio: true });
  const { body, contentType } = buildMultipart(
    {
      category: 'laugh',
      caption: 'اختبار الرفع',
      situation: 'لما تجرب الرفع لأول مرة',
      keywords: 'رفع, تجربة, اختبار',
      corner: 'tr',
      status: 'published',
    },
    { filename: 'test.mp4', contentType: 'video/mp4', buffer: fileToBuffer(video) }
  );

  const res = await ctx.app.inject({
    method: 'POST', url: '/api/v1/admin/reactions',
    headers: { cookie: adminCookie, 'content-type': contentType },
    payload: body,
  });

  assert.equal(res.statusCode, 201);
  const { reaction } = res.json();
  // أول معرّف بعد البذر (13 رياكشن، أعلى معرّف YR-0020)
  assert.equal(reaction.id, 'YR-0021');
  assert.equal(reaction.quote, 'اختبار الرفع');
  assert.equal(reaction.cat, 'laugh');
  assert.equal(reaction.dur, 3);
  assert.ok(reaction.video, 'يجب وجود مسار الفيديو');
  assert.ok(reaction.thumb, 'يجب وجود مسار المصغّرة');

  // الملفات قابلة للوصول عبر واجهة التخزين
  const videoRes = await ctx.app.inject({ method: 'GET', url: reaction.video });
  assert.equal(videoRes.statusCode, 200);
  assert.equal(videoRes.headers['content-type'], 'video/mp4');
  assert.ok(videoRes.headers['accept-ranges'] === 'bytes');

  const thumbRes = await ctx.app.inject({ method: 'GET', url: reaction.thumb });
  assert.equal(thumbRes.statusCode, 200);
  assert.equal(thumbRes.headers['content-type'], 'image/webp');

  // دعم طلبات النطاق (Range) للفيديو
  const rangeRes = await ctx.app.inject({
    method: 'GET', url: reaction.video, headers: { range: 'bytes=0-99' },
  });
  assert.equal(rangeRes.statusCode, 206);
  assert.equal(rangeRes.rawPayload.length, 100);
});

test('كشف التكرار: رفع نفس الفيديو يُرفض (409)', async () => {
  const video = await generateTestVideo({ durationSec: 3 });
  const buffer = fileToBuffer(video);

  const mk = (caption) => buildMultipart(
    { category: 'laugh', caption, situation: 'موقف اختبار' },
    { filename: 'dup.mp4', contentType: 'video/mp4', buffer }
  );

  const first = mk('أولاً');
  const firstRes = await ctx.app.inject({
    method: 'POST', url: '/api/v1/admin/reactions',
    headers: { cookie: adminCookie, 'content-type': first.contentType },
    payload: first.body,
  });
  assert.equal(firstRes.statusCode, 201);

  const second = mk('ثانيًا');
  const secondRes = await ctx.app.inject({
    method: 'POST', url: '/api/v1/admin/reactions',
    headers: { cookie: adminCookie, 'content-type': second.contentType },
    payload: second.body,
  });
  assert.equal(secondRes.statusCode, 409);
  assert.equal(secondRes.json().error.code, 'CONFLICT');
});

test('قائمة الإدارة تعيد الرياكشنات المرفوعة', async () => {
  const res = await ctx.app.inject({
    method: 'GET', url: '/api/v1/admin/reactions', headers: { cookie: adminCookie },
  });
  assert.equal(res.statusCode, 200);
  const { items, total } = res.json();
  assert.ok(total >= 14); // 13 بذر + المرفوعة
  assert.ok(items.some((r) => r.quote === 'اختبار الرفع'));
});
