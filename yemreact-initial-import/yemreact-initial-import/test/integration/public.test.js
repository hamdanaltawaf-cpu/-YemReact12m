// اختبارات التكامل — الفحص الصحي والمسارات العامة (ضد Postgres حقيقي)
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startTestApp, stopTestApp } from '../helpers/testapp.js';

let ctx;
before(async () => { ctx = await startTestApp(); });
after(async () => { await stopTestApp(ctx); });

test('GET /health يعيد ok مع حالة قاعدة البيانات', async () => {
  const res = await ctx.app.inject({ method: 'GET', url: '/health' });
  assert.equal(res.statusCode, 200);
  const body = res.json();
  assert.equal(body.ok, true);
  assert.equal(body.service, 'yemreact');
  assert.equal(body.db, 'ok');
});

test('GET /api/v1/categories يعيد الفئات التسع بالترتيب والألوان', async () => {
  const res = await ctx.app.inject({ method: 'GET', url: '/api/v1/categories' });
  assert.equal(res.statusCode, 200);
  const { categories } = res.json();
  assert.equal(categories.length, 9);
  assert.equal(categories[0].id, 'laugh');
  // اللون المصحّح للرفض والحماس
  assert.equal(categories.find((c) => c.id === 'reject').color, '#6e8296');
  assert.equal(categories.find((c) => c.id === 'hype').color, '#e8712e');
});

test('GET /api/v1/reactions يعيد 13 رياكشن منشورًا (12 بذر + YR-0020)', async () => {
  const res = await ctx.app.inject({ method: 'GET', url: '/api/v1/reactions' });
  const body = res.json();
  assert.equal(body.count, 13);
  assert.equal(body.reactions.length, 13);
});

test('البحث بالموقف يعمل بالتطبيع العربي (دين ← دَين)', async () => {
  const res = await ctx.app.inject({ method: 'GET', url: '/api/v1/reactions?q=' + encodeURIComponent('دين') });
  const body = res.json();
  assert.ok(body.count >= 1, 'يجب إيجاد "برضه؟" بكلمة المفتاح "دَين" بعد التطبيع');
  assert.ok(body.reactions.some((r) => r.id === 'YR-0008'));
});

test('فلترة التصنيف تعمل', async () => {
  const res = await ctx.app.inject({ method: 'GET', url: '/api/v1/reactions?cat=reject' });
  const body = res.json();
  assert.equal(body.count, 2);
  assert.deepEqual(body.reactions.map((r) => r.id).sort(), ['YR-0002', 'YR-0008']);
});

test('البحث بمعرّف العرض يعمل (YR-0003)', async () => {
  const res = await ctx.app.inject({ method: 'GET', url: '/api/v1/reactions?q=YR-0003' });
  const body = res.json();
  assert.equal(body.count, 1);
  assert.equal(body.reactions[0].id, 'YR-0003');
});

test('تفاصيل رياكشن بمعرّف العرض + رياكشنات قريبة', async () => {
  const res = await ctx.app.inject({ method: 'GET', url: '/api/v1/reactions/YR-0001' });
  assert.equal(res.statusCode, 200);
  const body = res.json();
  assert.equal(body.reaction.id, 'YR-0001');
  assert.equal(body.reaction.quote, 'يا ساتر!');
  assert.equal(body.reaction.cat, 'shock');
  assert.ok(Array.isArray(body.related));
});

test('تفاصيل رياكشن غير موجود → 404 بصيغة موحّدة', async () => {
  const res = await ctx.app.inject({ method: 'GET', url: '/api/v1/reactions/YR-9999' });
  assert.equal(res.statusCode, 404);
  assert.equal(res.json().error.code, 'NOT_FOUND');
});
