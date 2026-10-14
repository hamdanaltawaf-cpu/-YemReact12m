// اختبارات تكامل لوحة الإدارة — مراجعة المساهمات + إدارة المحتوى
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startTestApp, stopTestApp, firstCookie } from '../helpers/testapp.js';
import { generateTestVideo, fileToBuffer } from '../helpers/media.js';

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

// يُنشئ مساهمة قيد المراجعة مع فيديو في التخزين
async function seedSubmission(overrides = {}) {
  const video = await generateTestVideo({ durationSec: 3 });
  const id = `SUB-${Date.now()}${Math.floor(Math.random() * 1000)}`;
  const videoKey = `submissions/${id}.mp4`;
  await ctx.app.storage.put(videoKey, fileToBuffer(video), 'video/mp4');
  await ctx.pool.query(
    `INSERT INTO submissions (id, caption, situation, category_id, source, video_key, status)
     VALUES ($1,$2,$3,$4,$5,$6,'pending')`,
    [id, overrides.caption || 'مساهمة اختبار', overrides.situation || 'لما صاحبك يمزح', overrides.categoryId || 'laugh', overrides.source || null, videoKey]
  );
  return id;
}

test('قائمة المساهمات بحالة قيد المراجعة', async () => {
  await seedSubmission();
  const res = await ctx.app.inject({
    method: 'GET', url: '/api/v1/admin/submissions?status=pending', headers: AUTH(),
  });
  assert.equal(res.statusCode, 200);
  assert.ok(res.json().count >= 1);
  assert.ok(res.json().submissions.every((s) => s.status === 'pending'));
});

test('قبول مساهمة → يُنشأ رياكشن منشور بواترمارك', async () => {
  const id = await seedSubmission({ caption: 'قبول اختبار', situation: 'موقف القبول', categoryId: 'hype' });
  const res = await ctx.app.inject({
    method: 'POST', url: `/api/v1/admin/submissions/${id}/approve`,
    headers: AUTH(), payload: {},
  });
  assert.equal(res.statusCode, 200);
  const { reaction } = res.json();
  assert.equal(reaction.quote, 'قبول اختبار');
  assert.equal(reaction.status, 'published');
  assert.ok(reaction.video, 'فيديو معالج موجود');
  assert.ok(reaction.thumb, 'مصغّرة موجودة');

  // المساهمة أصبحت مقبولة
  const list = await ctx.app.inject({
    method: 'GET', url: '/api/v1/admin/submissions?status=approved', headers: AUTH(),
  });
  assert.ok(list.json().submissions.some((s) => s.id === id));
});

test('رفض مساهمة بسبب محفوظ', async () => {
  const id = await seedSubmission({ caption: 'رفض اختبار' });
  const res = await ctx.app.inject({
    method: 'POST', url: `/api/v1/admin/submissions/${id}/reject`,
    headers: AUTH(), payload: { reason: 'جودة منخفضة' },
  });
  assert.equal(res.statusCode, 200);
  const list = await ctx.app.inject({
    method: 'GET', url: '/api/v1/admin/submissions?status=rejected', headers: AUTH(),
  });
  const found = list.json().submissions.find((s) => s.id === id);
  assert.equal(found.rejectReason, 'جودة منخفضة');
});

test('قبول مساهمة غير قيد المراجعة → 409', async () => {
  const id = await seedSubmission();
  await ctx.app.inject({ method: 'POST', url: `/api/v1/admin/submissions/${id}/reject`, headers: AUTH(), payload: { reason: 'x' } });
  const res = await ctx.app.inject({
    method: 'POST', url: `/api/v1/admin/submissions/${id}/approve`, headers: AUTH(), payload: {},
  });
  assert.equal(res.statusCode, 409);
});

// ===== إدارة المحتوى =====

test('تعديل تصنيف (اسم/وصف/ترتيب) — اللون لا يتغيّر', async () => {
  const before = await ctx.app.inject({ method: 'GET', url: '/api/v1/admin/categories', headers: AUTH() });
  const laugh = before.json().categories.find((c) => c.id === 'laugh');
  const colorBefore = laugh.color;

  const res = await ctx.app.inject({
    method: 'PATCH', url: '/api/v1/admin/categories/laugh',
    headers: AUTH(), payload: { name: 'ضحك معدّل', description: 'لحظات الضحك', sortOrder: 5 },
  });
  assert.equal(res.statusCode, 200);
  assert.equal(res.json().category.name, 'ضحك معدّل');
  assert.equal(res.json().category.color, colorBefore); // اللون مقفل
  assert.equal(res.json().category.description, 'لحظات الضحك');
});

test('إنشاء وتعديل وحذف مجموعة', async () => {
  // إنشاء
  const create = await ctx.app.inject({
    method: 'POST', url: '/api/v1/admin/collections',
    headers: AUTH(), payload: { slug: 'test-col', title: 'مجموعة اختبار', description: 'وصف' },
  });
  assert.equal(create.statusCode, 201);
  const id = create.json().collection.id;

  // إضافة رياكشن
  const add = await ctx.app.inject({
    method: 'POST', url: `/api/v1/admin/collections/${id}/items`,
    headers: AUTH(), payload: { reactionId: 'YR-0002' },
  });
  assert.equal(add.statusCode, 200);

  // التحقق من العضوية
  const items = await ctx.app.inject({
    method: 'GET', url: `/api/v1/admin/collections/${id}/items`, headers: AUTH(),
  });
  assert.ok(items.json().items.includes('YR-0002'));

  // إزالة
  const remove = await ctx.app.inject({
    method: 'DELETE', url: `/api/v1/admin/collections/${id}/items`,
    headers: AUTH(), payload: { reactionId: 'YR-0002' },
  });
  assert.equal(remove.statusCode, 200);

  // حذف المجموعة
  const del = await ctx.app.inject({
    method: 'DELETE', url: `/api/v1/admin/collections/${id}`, headers: AUTH(),
  });
  assert.equal(del.statusCode, 200);
});

test('تعيين وقراءة مختار الأسبوع (متعدد)', async () => {
  const res = await ctx.app.inject({
    method: 'POST', url: '/api/v1/admin/featured',
    headers: AUTH(), payload: { reactionIds: ['YR-0001', 'YR-0005'] },
  });
  assert.equal(res.statusCode, 200);

  const get = await ctx.app.inject({ method: 'GET', url: '/api/v1/admin/featured', headers: AUTH() });
  assert.deepEqual(get.json().featured, ['YR-0001', 'YR-0005']);

  // يعكس في الواجهة العامة
  const pub = await ctx.app.inject({ method: 'GET', url: '/api/v1/featured' });
  assert.equal(pub.json().featuredList.length, 2);
});
