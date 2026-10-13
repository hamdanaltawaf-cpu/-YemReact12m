// ============================================================
// الجلسات الموقّعة (عديمة الحالة — Stateless, JWT-like)
// ============================================================
// التوكن = body.signature حيث التوقيع HMAC-SHA256(body, secret).
// تُستخدم للمستخدم (60 يومًا) وللمسؤول (8 ساعات).

import { hmac, timingSafeEqualStr } from './crypto.js';

// إنشاء توكن موقّع
export function signSession(payload, secret) {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = hmac(body, secret);
  return `${body}.${sig}`;
}

// التحقق من توكن وإرجاع الحمولة، أو null إذا كان غير صالح/منتهيًا.
export function verifySession(token, secret) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [body, sig] = parts;
  const expected = hmac(body, secret);
  if (!timingSafeEqualStr(sig, expected)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

// بناء حمولة جلسة مستخدم
export function userSessionPayload(userId, ttlDays) {
  const now = Math.floor(Date.now() / 1000);
  return { sub: userId, typ: 'user', iat: now, exp: now + ttlDays * 86400 };
}

// بناء حمولة جلسة مسؤول
export function adminSessionPayload(ttlHours) {
  const now = Math.floor(Date.now() / 1000);
  return { sub: 'admin', typ: 'admin', iat: now, exp: now + ttlHours * 3600 };
}
