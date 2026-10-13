// اختبارات التكامل — مصادقة المستخدم (OTP) والمحفوظات
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startTestApp, stopTestApp, firstCookie } from '../helpers/testapp.js';

let ctx;
before(async () => { ctx = await startTestApp(); });
after(async () => { await stopTestApp(ctx); });

const EMAIL = 'tester@yemreact.dev';

test('طلب رمز دخول يُرجع devCode في بيئة غير إنتاجية', async () => {
  const res = await ctx.app.inject({
    method: 'POST', url: '/api/v1/auth/request-code', payload: { email: EMAIL },
  });
  assert.equal(res.statusCode, 200);
  const body = res.json();
  assert.equal(body.ok, true);
  assert.match(body.devCode, /^\d{6}$/);
});

test('رفض بريد غير صالح', async () => {
  const res = await ctx.app.inject({
    method: 'POST', url: '/api/v1/auth/request-code', payload: { email: 'not-an-email' },
  });
  assert.equal(res.statusCode, 400);
  assert.equal(res.json().error.code, 'BAD_REQUEST');
});

test('دورة OTP كاملة: طلب → تحقق → جلسة → me → محفوظات', async () => {
  const req = await ctx.app.inject({
    method: 'POST', url: '/api/v1/auth/request-code', payload: { email: EMAIL },
  });
  const { devCode } = req.json();

  const verify = await ctx.app.inject({
    method: 'POST', url: '/api/v1/auth/verify', payload: { email: EMAIL, code: devCode },
  });
  assert.equal(verify.statusCode, 200);
  assert.equal(verify.json().user.email, EMAIL);
  const cookie = firstCookie(verify);
  assert.ok(cookie.includes('yr_auth='));

  const me = await ctx.app.inject({ method: 'GET', url: '/api/v1/auth/me', headers: { cookie } });
  assert.equal(me.json().user.email, EMAIL);

  // حفظ رياكشن ومزامنته
  const save = await ctx.app.inject({
    method: 'POST', url: '/api/v1/me/saved',
    headers: { cookie }, payload: { reactionId: 'YR-0001', saved: true },
  });
  assert.equal(save.statusCode, 200);

  const saved = await ctx.app.inject({ method: 'GET', url: '/api/v1/me/saved', headers: { cookie } });
  assert.deepEqual(saved.json().saved, ['YR-0001']);
});

test('رفض رمز خاطئ', async () => {
  await ctx.app.inject({ method: 'POST', url: '/api/v1/auth/request-code', payload: { email: EMAIL } });
  const res = await ctx.app.inject({
    method: 'POST', url: '/api/v1/auth/verify', payload: { email: EMAIL, code: '000000' },
  });
  assert.equal(res.statusCode, 401);
});

test('المحفوظات تتطلب جلسة', async () => {
  const res = await ctx.app.inject({ method: 'GET', url: '/api/v1/me/saved' });
  assert.equal(res.statusCode, 401);
});
