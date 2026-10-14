// اختبارات تكامل لوحة الإدارة — CRUD كامل + ترقيم + تعديل + حالة + سجل
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startTestApp, stopTestApp, firstCookie } from '../helpers/testapp.js';
import { generateTestVideo, buildMultipart, fileToBuffer } from '../helpers/media.js';

let ctx;
let cookie;
before(async () => {
  ctx = await startTestApp();
  const login = await ctx.app.inject({
    method: 'POST', url: '/api/v1/admin/login',
    payload: { password: 'test-admin-password-012345' },
  });
  cookie = firstCookie(login);
});
after(async () => { await stopTestApp(ctx); });

const AUTH = () => ({ cookie });

test('قائمة الإدارة مرقّمة مع بحث وفلترة', async () => {
  const res = await ctx.app.inject({
    method: 'GET', url: '/api/v1/admin/reactions?page=1&pageSize=5', headers: AUTH(),
  });
  assert.equal(res.statusCode, 200);
  const { items, total, page, pageSize } = res.json();
  assert.equal(pageSize, 5);
  assert.ok(total >= 12);
  assert.ok(items.length <= 5);

  // فلترة بالتصنيف
  const byCat = await ctx.app.inject({
    method: 'GET', url: '/api/v1/admin/reactions?cat=reject', headers: AUTH(),
  });
  assert.ok(byCat.json().items.every((r) => r.cat === 'reject'));
});

test('تفاصيل رياكشن (أي حالة) + 404', async () => {
  const ok = await ctx.app.inject({ method: 'GET', url: '/api/v1/admin/reactions/YR-0001', headers: AUTH() });
  assert.equal(ok.statusCode, 200);
  assert.equal(ok.json().reaction.quote, 'يا ساتر!');

  const nf = await ctx.app.inject({ method: 'GET', url: '/api/v1/admin/reactions/YR-9999', headers: AUTH() });
  assert.equal(nf.statusCode, 404);
});

test('تعديل الكابشن والموقف والتصنيف', async () => {
  const res = await ctx.app.inject({
    method: 'PATCH', url: '/api/v1/admin/reactions/YR-0001',
    headers: AUTH(),
    payload: { caption: 'يا ساتر معدّل!', situation: 'موقف معدّل', keywords: ['اختبار', 'تعديل'] },
  });
  assert.equal(res.statusCode, 200);
  assert.equal(res.json().reaction.quote, 'يا ساتر معدّل!');

  // التحقق من الانعكاس في نص البحث
  const search = await ctx.app.inject({
    method: 'GET', url: '/api/v1/admin/reactions?q=' + encodeURIComponent('معدّل'), headers: AUTH(),
  });
  assert.ok(search.json().items.some((r) => r.id === 'YR-0001'));
});

test('تغيير الحالة: أرشفة ثم نشر', async () => {
  const archive = await ctx.app.inject({
    method: 'PATCH', url: '/api/v1/admin/reactions/YR-0001/status',
    headers: AUTH(), payload: { status: 'archived' },
  });
  assert.equal(archive.statusCode, 200);
  assert.equal(archive.json().reaction.status, 'archived');

  const publish = await ctx.app.inject({
    method: 'PATCH', url: '/api/v1/admin/reactions/YR-0001/status',
    headers: AUTH(), payload: { status: 'published' },
  });
  assert.equal(publish.json().reaction.status, 'published');
});

test('حالة غير صالحة → 400', async () => {
  const res = await ctx.app.inject({
    method: 'PATCH', url: '/api/v1/admin/reactions/YR-0001/status',
    headers: AUTH(), payload: { status: 'nonsense' },
  });
  assert.equal(res.statusCode, 400);
});

test('سجل التدقيق يسجّل الأفعال', async () => {
  const res = await ctx.app.inject({ method: 'GET', url: '/api/v1/admin/audit', headers: AUTH() });
  assert.equal(res.statusCode, 200);
  const actions = res.json().logs.map((l) => l.action);
  assert.ok(actions.includes('update'), 'يجب تسجيل التعديل');
  assert.ok(actions.includes('archive') || actions.includes('publish'));
});

test('الإحصائيات تجمع بيانات حقيقية', async () => {
  const res = await ctx.app.inject({ method: 'GET', url: '/api/v1/admin/stats', headers: AUTH() });
  assert.equal(res.statusCode, 200);
  const s = res.json();
  assert.equal(typeof s.totals.views, 'number');
  assert.equal(s.byCategory.length, 9);
  assert.ok(Array.isArray(s.daily));
  assert.ok(Array.isArray(s.top));
});
