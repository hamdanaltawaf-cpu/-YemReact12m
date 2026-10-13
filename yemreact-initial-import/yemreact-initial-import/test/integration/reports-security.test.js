// اختبارات تكامل P6 — دورة الإبلاغ الكاملة (Takedown) + الأمان
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startTestApp, stopTestApp, firstCookie } from '../helpers/testapp.js';

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

test('إبلاغ عن رياكشن → يُعلَّق فورًا ويختفي من الواجهة العامة', async () => {
  // قبل الإبلاغ: ظاهر
  const before = await ctx.app.inject({ method: 'GET', url: '/api/v1/reactions/YR-0001' });
  assert.equal(before.statusCode, 200);

  const report = await ctx.app.inject({
    method: 'POST', url: '/api/v1/reactions/YR-0001/report',
    payload: { reason: 'هذا المحتوى ملكي', email: 'owner@example.com' },
  });
  assert.equal(report.statusCode, 200);
  assert.equal(report.json().ok, true);

  // بعد الإبلاغ: معلّق (404 في الواجهة العامة)
  const after = await ctx.app.inject({ method: 'GET', url: '/api/v1/reactions/YR-0001' });
  assert.equal(after.statusCode, 404);

  // لكنه ما زال في قاعدة البيانات (للإدارة)
  const adminList = await ctx.app.inject({
    method: 'GET', url: '/api/v1/admin/reactions?status=legal_review', headers: { cookie: adminCookie },
  });
  assert.ok(adminList.json().items.some((r) => r.id === 'YR-0001'));
});

test('البلاغ يظهر للمسؤول مفتوحًا مع التفاصيل', async () => {
  const res = await ctx.app.inject({
    method: 'GET', url: '/api/v1/admin/reports', headers: { cookie: adminCookie },
  });
  assert.equal(res.statusCode, 200);
  const reports = res.json().reports;
  assert.ok(reports.length >= 1);
  const r = reports.find((x) => x.display_id === 'YR-0001');
  assert.ok(r);
  assert.equal(r.reason, 'هذا المحتوى ملكي');
  assert.equal(r.reporter_email, 'owner@example.com');
  assert.equal(r.status, 'open');
});

test('إعادة النشر بعد المراجعة → يعود للواجهة', async () => {
  // إيجاد بلاغ مفتوح على YR-0001
  const list = await ctx.app.inject({ method: 'GET', url: '/api/v1/admin/reports', headers: { cookie: adminCookie } });
  const report = list.json().reports.find((r) => r.display_id === 'YR-0001');

  const republish = await ctx.app.inject({
    method: 'POST', url: `/api/v1/admin/reports/${report.id}/republish`,
    headers: { cookie: adminCookie }, payload: {},
  });
  assert.equal(republish.statusCode, 200);

  // عاد للواجهة
  const after = await ctx.app.inject({ method: 'GET', url: '/api/v1/reactions/YR-0001' });
  assert.equal(after.statusCode, 200);
});

test('الحذف النهائي بعد بلاغ → يُحذف صلبًا', async () => {
  // إبلاغ عن YR-0002 ثم حذف نهائي
  await ctx.app.inject({
    method: 'POST', url: '/api/v1/reactions/YR-0002/report',
    payload: { reason: 'انتهاك' },
  });
  const list = await ctx.app.inject({ method: 'GET', url: '/api/v1/admin/reports', headers: { cookie: adminCookie } });
  const report = list.json().reports.find((r) => r.display_id === 'YR-0002');

  const remove = await ctx.app.inject({
    method: 'POST', url: `/api/v1/admin/reports/${report.id}/remove`,
    headers: { cookie: adminCookie }, payload: {},
  });
  assert.equal(remove.statusCode, 200);

  // لم يعد موجودًا حتى للإدارة
  const adminList = await ctx.app.inject({
    method: 'GET', url: '/api/v1/admin/reactions?q=YR-0002', headers: { cookie: adminCookie },
  });
  assert.equal(adminList.json().items.some((r) => r.id === 'YR-0002'), false);
});

test('إبلاغ بلا سبب → 400', async () => {
  const res = await ctx.app.inject({
    method: 'POST', url: '/api/v1/reactions/YR-0003/report',
    payload: {},
  });
  assert.equal(res.statusCode, 400);
});

test('الإبلاغ يُسجَّل في سجل التدقيق', async () => {
  await ctx.app.inject({
    method: 'POST', url: '/api/v1/reactions/YR-0004/report',
    payload: { reason: 'اختبار تدقيق' },
  });
  const audit = await ctx.app.inject({ method: 'GET', url: '/api/v1/admin/audit', headers: { cookie: adminCookie } });
  assert.ok(audit.json().logs.some((l) => l.action === 'report' && l.target === 'YR-0004'));
});

// ===== الأمان =====

test('CSRF: طلب مؤذٍ من Origin مختلف يُرفض 403', async () => {
  const res = await ctx.app.inject({
    method: 'POST', url: '/api/v1/admin/login',
    headers: { origin: 'https://evil.example.com' },
    payload: { password: 'whatever' },
  });
  assert.equal(res.statusCode, 403);
  assert.equal(res.json().error.code, 'CSRF_BLOCKED');
});

test('CSRF: نفس الـ Origin مسموح', async () => {
  const res = await ctx.app.inject({
    method: 'POST', url: '/api/v1/admin/login',
    headers: { origin: 'http://localhost:80', host: 'localhost:80' },
    payload: { password: 'test-admin-password-012345' },
  });
  assert.equal(res.statusCode, 200);
});

test('CSP: الاستجابات HTML تحمل رأس Content-Security-Policy', async () => {
  const res = await ctx.app.inject({ method: 'GET', url: '/' });
  const csp = res.headers['content-security-policy'];
  assert.ok(csp, 'يجب وجود CSP');
  assert.ok(csp.includes("default-src 'self'"));
  assert.ok(csp.includes("frame-ancestors 'none'"));
});

test('رؤوس أمان أساسية موجودة', async () => {
  const res = await ctx.app.inject({ method: 'GET', url: '/' });
  assert.equal(res.headers['x-content-type-options'], 'nosniff');
  assert.equal(res.headers['x-frame-options'], 'DENY');
});

test('فحص الصحة الموسّع يعيد حالة كل المكونات', async () => {
  const res = await ctx.app.inject({ method: 'GET', url: '/api/v1/health' });
  assert.equal(res.statusCode, 200);
  const { checks } = res.json();
  assert.equal(checks.db, 'ok');
  assert.equal(checks.storage, 'ok');
  assert.ok(['ok', 'degraded', 'down'].includes(checks.ffmpeg));
  assert.ok(checks.disk && typeof checks.disk.availableMb === 'number');
  assert.equal(checks.watermarks, 'ok');
});
