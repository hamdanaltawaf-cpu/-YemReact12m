// ============================================================
// مسارات الإدارة — المصادقة (دخول/خروج/حالة)
// ============================================================
import { adminService } from '../services/admin.service.js';

export default async function adminRoutes(app) {
  const admin = adminService({ config: app.config });
  const audit = app.repos.audit;

  const adminCookie = {
    path: '/', httpOnly: true, sameSite: 'lax',
    secure: app.config.isProduction, maxAge: app.config.session.adminTtlHours * 3600,
  };

  // دخول المسؤول
  app.post('/api/v1/admin/login', {
    config: { rateLimit: { max: 5, timeWindow: '1 minute' } },
  }, async (request, reply) => {
    const { password } = request.body || {};
    admin.verifyPassword(password);
    const token = admin.issueSession();
    reply.setCookie('yr_admin', token, adminCookie);
    await audit.log('admin', 'login', null, 'دخول مسؤول ناجح');
    return { ok: true };
  });

  // الخروج
  app.post('/api/v1/admin/logout', async (_request, reply) => {
    reply.clearCookie('yr_admin', { path: '/' });
    return { ok: true };
  });

  // حالة جلسة المسؤول
  app.get('/api/v1/admin/me', async (request) => {
    return { authenticated: Boolean(admin.adminFromRequest(request)) };
  });
}
