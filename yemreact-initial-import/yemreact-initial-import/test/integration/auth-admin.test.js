// اختبارات التكامل — مصادقة المسؤول
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startTestApp, stopTestApp, firstCookie } from '../helpers/testapp.js';

let ctx;
before(async () => { ctx = await startTestApp(); });
after(async () => { await stopTestApp(ctx); });

test('رفض كلمة سر خاطئة بصيغة موحّدة', async () => {
  const res = await ctx.app.inject({
    method: 'POST', url: '/api/v1/admin/login',
    payload: { password: 'wrong-password' },
  });
  assert.equal(res.statusCode, 401);
  assert.equal(res.json().error.code, 'UNAUTHORIZED');
});

test('دخول ناجح يضبط كوكي جلسة HttpOnly', async () => {
  const res = await ctx.app.inject({
    method: 'POST', url: '/api/v1/admin/login',
    payload: { password: 'test-admin-password-012345' },
  });
  assert.equal(res.statusCode, 200);
  const cookie = firstCookie(res);
  assert.ok(cookie.includes('yr_admin='));
  const raw = Array.isArray(res.headers['set-cookie']) ? res.headers['set-cookie'][0] : res.headers['set-cookie'];
  assert.ok(raw.includes('HttpOnly'));
  assert.ok(raw.includes('SameSite=Lax'));
});

test('admin/me يؤكد الجلسة بعد الدخول', async () => {
  const login = await ctx.app.inject({
    method: 'POST', url: '/api/v1/admin/login',
    payload: { password: 'test-admin-password-012345' },
  });
  const cookie = firstCookie(login);
  const me = await ctx.app.inject({ method: 'GET', url: '/api/v1/admin/me', headers: { cookie } });
  assert.equal(me.json().authenticated, true);
});

test('admin/me بلا جلسة → false', async () => {
  const me = await ctx.app.inject({ method: 'GET', url: '/api/v1/admin/me' });
  assert.equal(me.json().authenticated, false);
});

test('admin/stats بلا جلسة → 401', async () => {
  const res = await ctx.app.inject({ method: 'GET', url: '/api/v1/admin/stats' });
  assert.equal(res.statusCode, 401);
});

test('admin/stats بجلسة صالحة يعيد إحصائيات', async () => {
  const login = await ctx.app.inject({
    method: 'POST', url: '/api/v1/admin/login',
    payload: { password: 'test-admin-password-012345' },
  });
  const cookie = firstCookie(login);
  const res = await ctx.app.inject({ method: 'GET', url: '/api/v1/admin/stats', headers: { cookie } });
  assert.equal(res.statusCode, 200);
  const body = res.json();
  assert.equal(body.byStatus.published, 13);
  assert.ok(body.totals && typeof body.totals.views === 'number');
  assert.ok(Array.isArray(body.byCategory) && body.byCategory.length === 9);
});
