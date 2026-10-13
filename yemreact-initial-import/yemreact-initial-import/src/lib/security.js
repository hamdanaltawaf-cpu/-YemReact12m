// ============================================================
// الأمان الشامل — CSP + CSRF (Origin check) + رؤوس أمان
// ============================================================

// سياسة أمان المحتوى (CSP) للواجهة العامة ولوحة الإدارة
// تمنع تحميل سكربتات/مصادر خارجية خبيثة مع السماح بما يحتاجه التطبيق:
// - خطوط Google (نستخدمها في العلامة)
// - الأصول المحلية + data/blob للصور والوسائط
export function cspValue() {
  return [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline'",       // جزر Astro/لوحة الإدارة (inline modules)
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com data:",
    "img-src 'self' data: blob:",
    "media-src 'self' blob:",
    "connect-src 'self'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ');
}

// مسارات تتطلب حماية CSRF (طرق مؤذية) — الإدارة والحساب والمصادقة
const CSRF_PROTECTED_PREFIXES = ['/api/v1/admin', '/api/v1/me', '/api/v1/auth'];
const MUTATING_METHODS = new Set(['POST', 'PATCH', 'PUT', 'DELETE']);

// تحقق Origin/Referer على الطلبات المؤذية (يمنع CSRF عبر المواقع)
// SameSite=Lax هو خط الدفاع الأول؛ هذا الخط الثاني.
export function originCheckHook(app) {
  app.addHook('preHandler', async (request, reply) => {
    const method = (request.method || '').toUpperCase();
    if (!MUTATING_METHODS.has(method)) return;
    const url = request.url || '';

    const isProtected = CSRF_PROTECTED_PREFIXES.some((p) => url.startsWith(p));
    if (!isProtected) return;

    const origin = request.headers.origin;
    if (!origin) return; // أدوات/سكربتات بلا Origin (curl، inject في الاختبارات) — تُترك

    const host = request.headers.host;
    if (!host) {
      return reply.code(403).send({ error: { code: 'CSRF_BLOCKED', message: 'طلب مرفوض' } });
    }

    // نقارن اسم المضيف فقط (المنفذ لا يهم — نفس المنشأ عبر أي منفذ محلي)
    let originHost;
    try { originHost = new URL(origin).hostname; } catch { originHost = ''; }
    const requestHost = (host || '').split(':')[0];

    if (originHost && requestHost && originHost !== requestHost) {
      request.log.warn({ origin, host }, 'محاولة CSRF مرفوضة');
      return reply.code(403).send({ error: { code: 'CSRF_BLOCKED', message: 'طلب من مصدر غير مصرّح به' } });
    }
  });
}

// قائمة رؤوس الأمان الإضافية
export function securityHeaders(app) {
  app.addHook('onSend', async (request, reply, payload) => {
    reply.header('X-Content-Type-Options', 'nosniff');
    reply.header('X-Frame-Options', 'DENY');
    reply.header('Referrer-Policy', 'strict-origin-when-cross-origin');
    // CSP فقط للاستجابات HTML (لا نعطّل الوسائط/JSON)
    const type = reply.getHeader('content-type');
    if (type && String(type).includes('text/html')) {
      reply.header('Content-Security-Policy', cspValue());
    }
    return payload;
  });
}
