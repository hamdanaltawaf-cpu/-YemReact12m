// اختبارات تكامل P5 — الحساب: OTP + ترحيل المحفوظات + مساهماتي + شارة موثوق
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

const EMAIL = 'member@yemreact.dev';

// دورة دخول كاملة تعيد الكوكي
async function login(email = EMAIL) {
  const req = await ctx.app.inject({
    method: 'POST', url: '/api/v1/auth/request-code', payload: { email },
  });
  const { devCode } = req.json();
  const verify = await ctx.app.inject({
    method: 'POST', url: '/api/v1/auth/verify', payload: { email, code: devCode },
  });
  return firstCookie(verify);
}

test('ترحيل محفوظات الضيف إلى الحساب بعد الدخول', async () => {
  const cookie = await login();
  const res = await ctx.app.inject({
    method: 'POST', url: '/api/v1/me/saved/migrate',
    headers: { cookie }, payload: { reactionIds: ['YR-0001', 'YR-0003', 'YR-9999'] },
  });
  assert.equal(res.statusCode, 200);
  const { merged } = res.json();
  assert.ok(merged.includes('YR-0001'));
  assert.ok(merged.includes('YR-0003'));
  assert.ok(!merged.includes('YR-9999')); // غير موجود يُتجاهل

  // GET يعكس المزامنة
  const saved = await ctx.app.inject({ method: 'GET', url: '/api/v1/me/saved', headers: { cookie } });
  assert.deepEqual(saved.json().saved.slice().sort(), ['YR-0001', 'YR-0003']);
});

test('مساهماتي فارغة في البداية ثم تُسجَّل وتظهر', async () => {
  const cookie = await login();
  // فارغة في البداية (حساب جديد)
  const empty = await ctx.app.inject({ method: 'GET', url: '/api/v1/me/submissions', headers: { cookie } });
  assert.equal(empty.json().submissions.length, 0);
  assert.equal(empty.json().trusted, false);
});

test('مساهمة من مستخدم مسجّل تُربط بحسابه', async () => {
  const cookie = await login();
  const video = await generateTestVideo({ durationSec: 3 });
  const { body, contentType } = buildMultipart(
    { situation: 'موقف عضو', caption: 'من العضو', category: 'hype', ownership: 'true' },
    { filename: 'm.mp4', contentType: 'video/mp4', buffer: fileToBuffer(video) }
  );
  const submit = await ctx.app.inject({
    method: 'POST', url: '/api/v1/submissions',
    headers: { 'content-type': contentType, cookie, 'user-agent': 'Mozilla/5.0' },
    payload: body,
  });
  assert.equal(submit.statusCode, 201);
  const id = submit.json().id;

  const mine = await ctx.app.inject({ method: 'GET', url: '/api/v1/me/submissions', headers: { cookie } });
  assert.ok(mine.json().submissions.some((s) => s.id === id));
});

test('شارة "مساهِم موثوق" تظهر بعد 3 مساهمات مقبولة', async () => {
  const cookie = await login();
  // أرسل 3 مساهمات واقبلها كلها
  for (let i = 0; i < 3; i++) {
    const video = await generateTestVideo({ durationSec: 3 });
    const { body, contentType } = buildMultipart(
      { situation: `موقف ${i}`, caption: `ثقة ${i}`, category: 'laugh', ownership: 'true' },
      { filename: 't.mp4', contentType: 'video/mp4', buffer: fileToBuffer(video) }
    );
    const submit = await ctx.app.inject({
      method: 'POST', url: '/api/v1/submissions',
      headers: { 'content-type': contentType, cookie, 'user-agent': 'Mozilla/5.0' },
      payload: body,
    });
    const id = submit.json().id;
    await ctx.app.inject({
      method: 'POST', url: `/api/v1/admin/submissions/${id}/approve`,
      headers: { cookie: adminCookie }, payload: {},
    });
  }

  const mine = await ctx.app.inject({ method: 'GET', url: '/api/v1/me/submissions', headers: { cookie } });
  assert.equal(mine.json().trusted, true, 'بعد 3 مساهمات مقبولة تصبح شارة موثوق مفعّلة');

  // me يعكس الشارة أيضًا
  const me = await ctx.app.inject({ method: 'GET', url: '/api/v1/auth/me', headers: { cookie } });
  assert.equal(me.json().user.trusted, true);
});

test('قبول مساهمة يُشغّل إشعار البريد (وضع التطوير يسجّل)', async () => {
  // في وضع التطوير، DevMail يسجّل — نتأكد أن المسار لا يرمي خطأ
  const video = await generateTestVideo({ durationSec: 3 });
  const { body, contentType } = buildMultipart(
    { situation: 'موقف إشعار', caption: 'إشعار', category: 'surprise', ownership: 'true', email: 'notify@example.com' },
    { filename: 'n.mp4', contentType: 'video/mp4', buffer: fileToBuffer(video) }
  );
  const submit = await ctx.app.inject({
    method: 'POST', url: '/api/v1/submissions',
    headers: { 'content-type': contentType, 'user-agent': 'Mozilla/5.0' },
    payload: body,
  });
  const id = submit.json().id;
  const approve = await ctx.app.inject({
    method: 'POST', url: `/api/v1/admin/submissions/${id}/approve`,
    headers: { cookie: adminCookie }, payload: {},
  });
  assert.equal(approve.statusCode, 200);
});
