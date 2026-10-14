// ============================================================
// وسيط حماية الإدارة (مشترك بين كل مسارات /admin)
// ============================================================
import { Errors } from './errors.js';

// يبني preHandler يفرض جلسة مسؤول صالحة
export function makeRequireAdmin(app) {
  return async function requireAdmin(request, _reply) {
    if (!app.adminAuth.adminFromRequest(request)) {
      throw Errors.unauthorized('يتطلب دخول مسؤول');
    }
  };
}
