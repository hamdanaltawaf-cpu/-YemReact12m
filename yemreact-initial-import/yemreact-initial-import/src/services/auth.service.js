// ============================================================
// خدمة مصادقة المستخدم (OTP / Magic Link — بلا كلمة مرور)
// ============================================================
import { hmac, sha256, randomOtp, timingSafeEqualStr } from '../lib/crypto.js';
import { signSession, verifySession, userSessionPayload } from '../lib/session.js';
import { Errors } from '../lib/errors.js';

export const authService = (deps) => {
  const { users, authCodes, mail, config, logger } = deps;

  return {
    // الخطوة 1: طلب رمز دخول
    async requestCode(email) {
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        throw Errors.badRequest('أدخل بريدًا إلكترونيًا صحيحًا');
      }
      const user = await users.findOrCreate(email);
      const code = randomOtp(config.otp.length);
      const expiresAt = new Date(Date.now() + config.otp.ttlMinutes * 60_000);
      const codeHash = sha256(`${code}:${config.secrets.otpSalt}`);
      await authCodes.create(user.id, codeHash, expiresAt);
      const { delivered, devCode } = await mail.sendOtp(user.email, code);
      logger.info({ userId: user.id }, 'أُرسل رمز دخول');
      // في غير الإنتاج نُرجع الرمز للمطور (مثل النسخة السابقة)
      return {
        ok: true,
        expiresInMinutes: config.otp.ttlMinutes,
        ...(config.isProduction ? {} : { devCode }),
      };
    },

    // الخطوة 2: التحقق من الرمز وإصدار جلسة
    async verifyCode(email, code) {
      if (!email || !code) throw Errors.badRequest('البريد والرمز مطلوبان');
      const user = await users.findOrCreate(email);
      const record = await authCodes.latestValid(user.id);
      if (!record) throw Errors.unauthorized('الرمز غير صحيح أو منتهي — اطلب رمزًا جديدًا');
      const codeHash = sha256(`${String(code).trim()}:${config.secrets.otpSalt}`);
      if (!timingSafeEqualStr(codeHash, record.code_hash)) {
        throw Errors.unauthorized('الرمز غير صحيح — حاول مجددًا');
      }
      await authCodes.markUsed(record.id);
      const token = signSession(userSessionPayload(user.id, config.session.userTtlDays), config.secrets.sessionSecret);
      return { token, user: { id: user.id, email: user.email, role: user.role } };
    },

    // استخراج مستخدم من توكن جلسة
    userFromToken(token) {
      const payload = verifySession(token, config.secrets.sessionSecret);
      return payload && payload.typ === 'user' ? payload : null;
    },

    // مساعد: جلب المستخدم من الطلب (كوكي yr_auth)
    async userFromRequest(request) {
      const token = request.cookies?.yr_auth;
      const payload = this.userFromToken(token);
      if (!payload) return null;
      return users.byId(payload.sub);
    },
  };
};
