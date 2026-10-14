// اختبارات تكامل الواجهة (تخدم بناء Astro من web/dist + الـ API)
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { startTestApp, stopTestApp } from '../helpers/testapp.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.join(__dirname, '..', '..', 'web', 'dist');

// يُحسب وقت التحميل (خيار skip يُقيَّم وقت تعريف الاختبار، لا وقت التشغيل)
const distExists = fs.existsSync(DIST);
if (!distExists) {
  console.warn('⚠️ web/dist غير موجود — ستُتخطى اختبارات الواجهة. ابنِ: npm --prefix web run build');
}

let ctx;
before(async () => { if (distExists) ctx = await startTestApp(); });
after(async () => { if (ctx) await stopTestApp(ctx); });


test('الصفحة الرئيسية تعيد HTML ببطاقة البطل', { skip: !distExists }, async () => {
  const res = await ctx.app.inject({ method: 'GET', url: '/' });
  assert.equal(res.statusCode, 200);
  assert.match(res.headers['content-type'], /text\/html/);
  const html = res.body;
  assert.ok(html.includes('مكتبة رياكشنات يمنية'));
  assert.ok(html.includes('مو صفحة ميمز'));
});

test('صفحة التفاصيل تعيد الكابشن والموقف كـ HTML دلالي', { skip: !distExists }, async () => {
  const res = await ctx.app.inject({ method: 'GET', url: '/r/yr-0001' });
  assert.equal(res.statusCode, 200);
  const html = res.body;
  assert.ok(html.includes('<h1 class="detail-quote">يا ساتر!</h1>'));
  assert.ok(html.includes('لما تسمع خبر صادم'));
});

test('وسوم OpenGraph ديناميكية لكل رياكشن', { skip: !distExists }, async () => {
  const res = await ctx.app.inject({ method: 'GET', url: '/r/yr-0001' });
  const html = res.body;
  assert.ok(html.includes('property="og:title"'));
  assert.ok(html.includes('يا ساتر! — يمن رياكت'));
  assert.ok(html.includes('property="og:description"'));
  assert.ok(html.includes('property="og:locale" content="ar_YE"'));
});

test('canonical و og:url بلا امتداد .html', { skip: !distExists }, async () => {
  const res = await ctx.app.inject({ method: 'GET', url: '/r/yr-0003' });
  const html = res.body;
  assert.ok(html.includes('canonical" href='));
  assert.ok(!/yr-0003\.html/.test(html));
});

test('صفحة غير موجودة → 404', { skip: !distExists }, async () => {
  const res = await ctx.app.inject({ method: 'GET', url: '/r/yr-9999' });
  assert.equal(res.statusCode, 404);
});

test('المسار بامتداد .html يُخدَم أيضًا (توافق)', { skip: !distExists }, async () => {
  const res = await ctx.app.inject({ method: 'GET', url: '/r/yr-0002.html' });
  assert.equal(res.statusCode, 200);
});

test('الـ API يخدم البحث بالموقف للواجهة', { skip: !distExists }, async () => {
  const res = await ctx.app.inject({
    method: 'GET', url: '/api/v1/reactions?q=' + encodeURIComponent('لما صاحبك يقول بكرة'),
  });
  assert.equal(res.statusCode, 200);
  assert.ok(res.json().reactions.some((r) => r.id === 'YR-0008'));
});

test('تسجيل حدث من الواجهة يعمل (view)', { skip: !distExists }, async () => {
  const res = await ctx.app.inject({
    method: 'POST', url: '/api/v1/reactions/YR-0004/event',
    headers: { 'user-agent': 'Mozilla/5.0 (iPhone)' },
    payload: { type: 'view' },
  });
  assert.equal(res.statusCode, 200);
  assert.equal(res.json().ok, true);
});
