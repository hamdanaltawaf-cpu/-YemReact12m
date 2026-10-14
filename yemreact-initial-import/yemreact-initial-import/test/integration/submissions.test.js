// اختبارات تكامل P5 — دورة المساهمة الكاملة (إرسال → مراجعة → تتبع)
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startTestApp, stopTestApp, firstCookie } from '../helpers/testapp.js';
import { generateTestVideo, buildMultipart, fileToBuffer } from '../helpers/media.js';

let ctx;
let adminCookie;
before(async () => {
  ctx = await startTestApp();
  const login = await ctx.app.inject({
    method: 'POST', url: '/api/v1/admin/login',
    payload: { password: 'test-admin-password-012345' },
  });
  adminCookie = firstCookie(login);
});
after(async () => { await stopTestApp(ctx); });

async function submitReaction(overrides = {}) {
  const video = await generateTestVideo({ durationSec: 3 });
  const { body, contentType } = buildMultipart(
    {
      situation: overrides.situation || 'لما صاحبك يقول بكرة',
      caption: overrides.caption || 'برضه؟',
      category: overrides.category || 'reject',
      source: overrides.source || 'قروب العائلة',
      email: overrides.email || 'contributor@example.com',
      ownership: overrides.ownership ?? 'true',
    },
    { filename: 'sub.mp4', contentType: 'video/mp4', buffer: fileToBuffer(video) }
  );
  return ctx.app.inject({
    method: 'POST', url: '/api/v1/submissions',
    headers: { 'content-type': contentType, 'user-agent': 'Mozilla/5.0' },
    payload: body,
  });
}

test('إرسال مساهمة بلا إقرار ملكية → 400', async () => {
  const res = await submitReaction({ ownership: 'false' });
  assert.equal(res.statusCode, 400);
  assert.equal(res.json().error.code, 'BAD_REQUEST');
});

test('إرسال مساهمة كاملة → 201 + رقم تتبع + Pending', async () => {
  const res = await submitReaction();
  assert.equal(res.statusCode, 201);
  const body = res.json();
  assert.equal(body.status, 'pending');
  assert.match(body.id, /^SUB-/);
});

test('استعلام الحالة برقم التتبع', async () => {
  const res = await submitReaction();
  const id = res.json().id;
  const track = await ctx.app.inject({ method: 'GET', url: `/api/v1/submissions/${id}` });
  assert.equal(track.statusCode, 200);
  assert.equal(track.json().submission.status, 'pending');
  assert.equal(track.json().submission.id, id);
});

test('رقم تتبع غير موجود → 404', async () => {
  const res = await ctx.app.inject({ method: 'GET', url: '/api/v1/submissions/SUB-NOPE000' });
  assert.equal(res.statusCode, 404);
});

test('المساهمة تظهر للمسؤول Pending مع الإقرار والبريد', async () => {
  const res = await submitReaction({ email: 'owner@example.com' });
  const id = res.json().id;
  const list = await ctx.app.inject({
    method: 'GET', url: '/api/v1/admin/submissions?status=pending', headers: { cookie: adminCookie },
  });
  const found = list.json().submissions.find((s) => s.id === id);
  assert.ok(found);
  assert.equal(found.ownershipAttested, true);
  assert.equal(found.contactEmail, 'owner@example.com');
});

test('قبول مساهمة (بإقرار) → رياكشن منشور بحقوق مساهمة أصلية', async () => {
  const res = await submitReaction({ caption: 'قبول P5', situation: 'موقف P5', category: 'laugh' });
  const id = res.json().id;
  const approve = await ctx.app.inject({
    method: 'POST', url: `/api/v1/admin/submissions/${id}/approve`,
    headers: { cookie: adminCookie }, payload: {},
  });
  assert.equal(approve.statusCode, 200);
  assert.equal(approve.json().reaction.quote, 'قبول P5');
  assert.equal(approve.json().reaction.status, 'published');
  assert.ok(approve.json().reaction.video);

  // التتبع يعكس الحالة
  const track = await ctx.app.inject({ method: 'GET', url: `/api/v1/submissions/${id}` });
  assert.equal(track.json().submission.status, 'approved');
});

test('رفض مساهمة بسبب → الحالة والسبب يظهران في التتبع', async () => {
  const res = await submitReaction({ caption: 'رفض P5' });
  const id = res.json().id;
  const reject = await ctx.app.inject({
    method: 'POST', url: `/api/v1/admin/submissions/${id}/reject`,
    headers: { cookie: adminCookie }, payload: { reason: 'جودة منخفضة' },
  });
  assert.equal(reject.statusCode, 200);
  const track = await ctx.app.inject({ method: 'GET', url: `/api/v1/submissions/${id}` });
  assert.equal(track.json().submission.status, 'rejected');
  assert.equal(track.json().submission.rejectReason, 'جودة منخفضة');
});
