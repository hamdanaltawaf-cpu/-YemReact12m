// اختبارات التكامل — الأحداث الحقيقية والاكتشاف (P3 backend)
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startTestApp, stopTestApp, firstCookie } from '../helpers/testapp.js';

let ctx;
before(async () => { ctx = await startTestApp(); });
after(async () => { await stopTestApp(ctx); });

test('تسجيل حدث view يزيد العدّاد ويعيد ok', async () => {
  const before = await ctx.app.inject({ method: 'GET', url: '/api/v1/reactions/YR-0001' });
  const viewsBefore = before.json().reaction.stats.views;

  const res = await ctx.app.inject({
    method: 'POST', url: '/api/v1/reactions/YR-0001/event',
    headers: { 'user-agent': 'Mozilla/5.0' },
    payload: { type: 'view' },
  });
  assert.equal(res.statusCode, 200);
  assert.equal(res.json().ok, true);

  const after = await ctx.app.inject({ method: 'GET', url: '/api/v1/reactions/YR-0001' });
  assert.equal(after.json().reaction.stats.views, viewsBefore + 1);
});

test('عرض مكرر من نفس الجلسة خلال 30 دقيقة لا يُحتسب', async () => {
  const res1 = await ctx.app.inject({
    method: 'POST', url: '/api/v1/reactions/YR-0002/event',
    headers: { 'user-agent': 'Mozilla/5.0' },
    payload: { type: 'view' },
  });
  const cookie = firstCookie(res1);

  const res2 = await ctx.app.inject({
    method: 'POST', url: '/api/v1/reactions/YR-0002/event',
    headers: { 'user-agent': 'Mozilla/5.0', cookie },
    payload: { type: 'view' },
  });
  assert.equal(res2.json().deduped, true);
});

test('فلترة البوتات: وكيل زاحف يُرفض 403', async () => {
  const res = await ctx.app.inject({
    method: 'POST', url: '/api/v1/reactions/YR-0001/event',
    headers: { 'user-agent': 'Googlebot/2.1' },
    payload: { type: 'view' },
  });
  assert.equal(res.statusCode, 403);
  assert.equal(res.json().error.code, 'BOT_BLOCKED');
});

test('نوع حدث غير صالح → 400', async () => {
  const res = await ctx.app.inject({
    method: 'POST', url: '/api/v1/reactions/YR-0001/event',
    headers: { 'user-agent': 'Mozilla/5.0' },
    payload: { type: 'hug' },
  });
  assert.equal(res.statusCode, 400);
});

test('أحداث save/download/share تزيد العدّادات المطابقة', async () => {
  const types = ['save', 'download', 'share'];
  const key = { save: 'saves', download: 'downloads', share: 'shares' };
  const before = (await ctx.app.inject({ method: 'GET', url: '/api/v1/reactions/YR-0003' })).json().reaction.stats;

  for (const type of types) {
    await ctx.app.inject({
      method: 'POST', url: '/api/v1/reactions/YR-0003/event',
      headers: { 'user-agent': 'Mozilla/5.0' },
      payload: { type },
    });
  }
  const after = (await ctx.app.inject({ method: 'GET', url: '/api/v1/reactions/YR-0003' })).json().reaction.stats;
  for (const type of types) {
    assert.equal(after[key[type]], before[key[type]] + 1, `${type} يجب أن يزيد`);
  }
});

test('featured يعيد المختار + الأحدث', async () => {
  const res = await ctx.app.inject({ method: 'GET', url: '/api/v1/featured' });
  assert.equal(res.statusCode, 200);
  const { featured, newest } = res.json();
  assert.equal(featured.id, 'YR-0001'); // الإعداد الافتراضي
  assert.ok(Array.isArray(newest));
  assert.ok(newest.length >= 1);
});

test('collections يعيد المجموعات الثلاث مع العدد', async () => {
  const res = await ctx.app.inject({ method: 'GET', url: '/api/v1/collections' });
  const { collections } = res.json();
  assert.equal(collections.length, 4);
  assert.ok(collections.every((c) => typeof c.count === 'number'));
});

test('مجموعة واحدة تعيد رياكشناتها', async () => {
  const res = await ctx.app.inject({ method: 'GET', url: '/api/v1/collections/students' });
  assert.equal(res.statusCode, 200);
  const { collection, reactions } = res.json();
  assert.equal(collection.slug, 'students');
  assert.ok(reactions.length >= 1);
});

test('مجموعة غير موجودة → 404', async () => {
  const res = await ctx.app.inject({ method: 'GET', url: '/api/v1/collections/nope' });
  assert.equal(res.statusCode, 404);
});
