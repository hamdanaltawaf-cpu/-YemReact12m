// مسارات مصادقة المستخدم (OTP) والحساب
import { savedRepo } from '../repositories/saved.js';
import { Errors } from '../lib/errors.js';

export default async function authRoutes(app) {
  const auth = app.authService;
  const saved = savedRepo(app.pool);

  const userCookie = {
    path: '/', httpOnly: true, sameSite: 'lax',
    secure: app.config.isProduction, maxAge: app.config.session.userTtlDays * 86400,
  };

  // طلب رمز دخول
  app.post('/api/v1/auth/request-code', {
    config: { rateLimit: { max: 5, timeWindow: '1 minute' } },
  }, async (request) => {
    const { email } = request.body || {};
    return auth.requestCode(email);
  });

  // التحقق من الرمز وإصدار الجلسة
  app.post('/api/v1/auth/verify', {
    config: { rateLimit: { max: 10, timeWindow: '1 minute' } },
  }, async (request, reply) => {
    const { email, code } = request.body || {};
    const { token, user } = await auth.verifyCode(email, code);
    reply.setCookie('yr_auth', token, userCookie);
    return { ok: true, user };
  });

  // بيانات المستخدم الحالي (مع شارة موثوق)
  app.get('/api/v1/auth/me', async (request) => {
    const user = await auth.userFromRequest(request);
    if (!user) return { user: null };
    const trusted = await app.submissionsService.isTrusted(user.id);
    return { user: { id: user.id, email: user.email, role: user.role, trusted } };
  });

  // الخروج
  app.post('/api/v1/auth/logout', async (_request, reply) => {
    reply.clearCookie('yr_auth', { path: '/' });
    return { ok: true };
  });

  // محفوظات المستخدم الحالي (تتطلب جلسة)
  app.get('/api/v1/me/saved', async (request, reply) => {
    const user = await auth.userFromRequest(request);
    if (!user) throw Errors.unauthorized('سجّل الدخول أولًا');
    const ids = await saved.idsForUser(user.id);
    return { saved: ids };
  });

  // إضافة/إزالة من المحفوظات
  app.post('/api/v1/me/saved', async (request, reply) => {
    const user = await auth.userFromRequest(request);
    if (!user) throw Errors.unauthorized('سجّل الدخول أولًا');
    const { reactionId, saved: shouldSave } = request.body || {};
    if (!reactionId) throw Errors.badRequest('reactionId مطلوب');
    const row = await app.repos.reactions.byDisplayId(reactionId);
    if (!row) throw Errors.notFound('الرياكشن غير موجود');
    if (shouldSave) await saved.add(user.id, row.id);
    else await saved.remove(user.id, row.id);
    return { ok: true };
  });

  // ترحيل محفوظات الضيف (localStorage) إلى الحساب بعد الدخول
  app.post('/api/v1/me/saved/migrate', async (request, reply) => {
    const user = await auth.userFromRequest(request);
    if (!user) throw Errors.unauthorized('سجّل الدخول أولًا');
    const { reactionIds } = request.body || {};
    if (!Array.isArray(reactionIds)) throw Errors.badRequest('reactionIds يجب أن تكون قائمة');
    const merged = [];
    for (const displayId of reactionIds.slice(0, 200)) {
      const row = await app.repos.reactions.byDisplayId(displayId);
      if (row) { await saved.add(user.id, row.id); merged.push(displayId); }
    }
    return { ok: true, merged: await saved.idsForUser(user.id) };
  });

  // مساهمات المستخدم الحالي (بحالاتها + شارة موثوق)
  app.get('/api/v1/me/submissions', async (request, reply) => {
    const user = await auth.userFromRequest(request);
    if (!user) throw Errors.unauthorized('سجّل الدخول أولًا');
    const rows = await app.repos.submissions.byUser(user.id);
    const trusted = await app.submissionsService.isTrusted(user.id);
    return {
      submissions: rows.map((s) => ({
        id: s.id,
        status: s.status,
        caption: s.caption,
        situation: s.situation,
        rejectReason: s.reject_reason,
        createdAt: s.created_at,
        reviewedAt: s.reviewed_at,
      })),
      trusted,
    };
  });
}
