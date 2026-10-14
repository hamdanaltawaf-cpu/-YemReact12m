// ============================================================
// خدمة مصادقة المسؤول
// ============================================================
import { sha256, timingSafeEqualStr } from '../lib/crypto.js';
import { signSession, verifySession, adminSessionPayload } from '../lib/session.js';
import { Errors } from '../lib/errors.js';

export const adminService = (deps) => {
  const { config } = deps;

  return {
    // التحقق من كلمة سر المسؤول (مقارنة آمنة زمنيًا)
    verifyPassword(password) {
      if (!password) throw Errors.badRequest('كلمة السر مطلوبة');
      const given = sha256(String(password));
      const expected = sha256(config.secrets.adminPassword);
      if (!timingSafeEqualStr(given, expected)) {
        throw Errors.unauthorized('كلمة سر غير صحيحة');
      }
      return true;
    },

    // إصدار جلسة مسؤول
    issueSession() {
      return signSession(adminSessionPayload(config.session.adminTtlHours), config.secrets.adminSecret);
    },

    // التحقق من توكن جلسة مسؤول
    adminFromToken(token) {
      const payload = verifySession(token, config.secrets.adminSecret);
      return payload && payload.typ === 'admin' ? payload : null;
    },

    // مساعد: هل الطلب يحمل جلسة مسؤول صالحة؟
    adminFromRequest(request) {
      const token = request.cookies?.yr_admin;
      return this.adminFromToken(token);
    },
  };
};
