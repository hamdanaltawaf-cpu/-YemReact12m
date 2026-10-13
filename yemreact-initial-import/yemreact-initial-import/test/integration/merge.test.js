// اختبارات توحيد نسخة Arena مع نسخة Manus (P6.5)
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startTestApp, stopTestApp } from '../helpers/testapp.js';

let ctx;
before(async () => { ctx = await startTestApp(); });
after(async () => { await stopTestApp(ctx); });

test('فئة anger اسمها المعتمد "ضابح" (قرار التوحيد)', async () => {
  const res = await ctx.app.inject({ method: 'GET', url: '/api/v1/categories' });
  const { categories } = res.json();
  const anger = categories.find((c) => c.id === 'anger');
  assert.ok(anger);
  assert.equal(anger.name, 'ضابح');
  // اللون لم يتغير (مقفل)
  assert.equal(anger.color, '#c81e3a');
});

test('المحتوى المسترد YR-0020 "مالك دخل" موجود بلا فيديو', async () => {
  const res = await ctx.app.inject({ method: 'GET', url: '/api/v1/reactions/YR-0020' });
  assert.equal(res.statusCode, 200);
  const r = res.json().reaction;
  assert.equal(r.quote, 'مالك دخل');
  assert.equal(r.cat, 'anger');
  assert.equal(r.source, 'المساهم');
  assert.equal(r.video, null); // metadata فقط — الفيديو بقي على manus-storage
});

test('البحث عبر searchOptimizer يجد "مالك دخل" بكلمة "مصطفى"', async () => {
  const res = await ctx.app.inject({
    method: 'GET', url: '/api/v1/reactions?q=' + encodeURIComponent('مصطفى'),
  });
  const { reactions } = res.json();
  assert.ok(reactions.some((r) => r.id === 'YR-0020'), 'يجب إيجاد YR-0020 عبر searchOptimizer');
});

test('مجموعة "مصطفى المومري" موجودة وتحتوي YR-0020', async () => {
  const list = await ctx.app.inject({ method: 'GET', url: '/api/v1/collections' });
  assert.ok(list.json().collections.some((c) => c.slug === 'mustafa-al-momari'));

  const res = await ctx.app.inject({ method: 'GET', url: '/api/v1/collections/mustafa-al-momari' });
  assert.equal(res.statusCode, 200);
  assert.equal(res.json().collection.title, 'مصطفى المومري');
  assert.ok(res.json().reactions.some((r) => r.id === 'YR-0020'));
});

test('الاستعلامات الفاشلة تُسجَّل عند بحث بلا نتيجة', async () => {
  const q = 'كلمة-غير-موجودة-إطلاقًا-' + Date.now();
  await ctx.app.inject({ method: 'GET', url: '/api/v1/reactions?q=' + encodeURIComponent(q) });
  // انتظار الالتقاط غير المتزامن (record تستدعى بـ .catch داخل المسار)
  await new Promise((r) => setTimeout(r, 50));

  const top = await ctx.app.repos.failedSearches.top(50);
  assert.ok(top.some((s) => s.normalized.includes('كلمة') || s.query.includes('كلمة')), 'يجب تسجيل الاستعلام الفاشل');
});

test('searchOptimizer يظهر في شكل الرياكشن العام', async () => {
  const res = await ctx.app.inject({ method: 'GET', url: '/api/v1/reactions/YR-0020' });
  const r = res.json().reaction;
  assert.ok(r.searchOptimizer.includes('مصطفى المومري'));
});
