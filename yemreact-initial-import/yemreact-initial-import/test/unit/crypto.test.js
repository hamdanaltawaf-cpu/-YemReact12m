// اختبارات أدوات التشفير والتطبيع
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hmac, sha256, timingSafeEqualStr, randomOtp, hashIp } from '../../src/lib/crypto.js';
import { normalizeArabic } from '../../src/lib/arabic.js';
import { buildSearchText } from '../../src/lib/search.js';
import { signSession, verifySession } from '../../src/lib/session.js';

test('HMAC/SHA-256 حتمية ومختلفة عن الأصل', () => {
  assert.equal(hmac('x', 's'), hmac('x', 's'));
  assert.notEqual(hmac('x', 's1'), hmac('x', 's2'));
  assert.equal(sha256('a').length, 64);
});

test('المقارنة الآمنة زمنيًا', () => {
  assert.ok(timingSafeEqualStr('abc', 'abc'));
  assert.ok(!timingSafeEqualStr('abc', 'abd'));
  assert.ok(!timingSafeEqualStr('abc', 'ab')); // أطوال مختلفة
});

test('رمز OTP بطول ثابت وأرقام فقط', () => {
  const code = randomOtp(6);
  assert.match(code, /^\d{6}$/);
});

test('تجزئة IP ثابتة الطول ولا تحتوي IP الخام', () => {
  const h = hashIp('1.2.3.4', 'salt');
  assert.equal(h.length, 16);
  assert.ok(!h.includes('1.2.3.4'));
});

test('التطبيع العربي يوحّد التشكيل والألف والياء والتاء', () => {
  assert.equal(normalizeArabic('دَين'), 'دين');
  assert.equal(normalizeArabic('أحمد إبراهيم آدم'), 'احمد ابراهيم ادم');
  assert.equal(normalizeArabic('على'), 'علي');   // ى → ي
  assert.equal(normalizeArabic('مدرسة'), 'مدرسه'); // ة → ه
  assert.equal(normalizeArabic('يا ساتر!!!؟؟'), 'يا ساتر');
});

test('نص البحث يجمع الحقول ويطبّعها', () => {
  const t = buildSearchText({ caption: 'يا ساتر!', situation: 'لما تسمع خبر صادم', keywords: ['خبر', 'مفاجأة'] });
  assert.ok(t.includes('يا ساتر'));
  assert.ok(t.includes('خبر'));
  assert.ok(t.includes('مفاجاه')); // مفاجأة → مفاجاه
});

test('الجلسة: توقيع وتحقق ورفض تلاعب', () => {
  const token = signSession({ sub: 'u1', exp: Math.floor(Date.now() / 1000) + 60 }, 'secret');
  const payload = verifySession(token, 'secret');
  assert.equal(payload.sub, 'u1');
  assert.equal(verifySession(token, 'wrong'), null);
  assert.equal(verifySession(token + 'x', 'secret'), null);
  assert.equal(verifySession('garbage', 'secret'), null);
});
