// اختبار فحص الأسرار عند الإقلاع
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { collectSecretProblems } from '../../src/config.js';

const strong = {
  sessionSecret: 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6',
  adminSecret: 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6',
  otpSalt: 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6',
  ipSalt: 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6',
  adminPassword: 'very-long-random-password',
};

test('يرفض الأسرار الافتراضية/المفقودة', () => {
  const problems = collectSecretProblems({ ...strong, sessionSecret: '', adminPassword: 'changeme' });
  assert.ok(problems.length >= 2);
  assert.ok(problems.some((p) => p.includes('SESSION_SECRET')));
  assert.ok(problems.some((p) => p.includes('YEMREACT_ADMIN_PASSWORD')));
});

test('يقبل مجموعة أسرار قوية', () => {
  assert.equal(collectSecretProblems(strong).length, 0);
});

test('يرفض قيم التطوير القصيرة/النمطية حتى لو بدت مخصصة', () => {
  const problems = collectSecretProblems({
    ...strong,
    sessionSecret: 'dev-session-secret-not-for-prod-0001', // قيمة تطوير نمطية
  });
  assert.ok(problems.some((p) => p.includes('SESSION_SECRET')));
});
