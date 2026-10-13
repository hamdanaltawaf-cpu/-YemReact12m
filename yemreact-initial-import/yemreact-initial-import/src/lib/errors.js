// ============================================================
// الأخطاء الموحّدة
// ============================================================
// كل خطأ يخرج من الـ API بصيغة موحّدة: { error: { code, message } }
// (المبدأ المعماري #11: أخطاء موحّدة، لا فشل صامت).

export class AppError extends Error {
  constructor(code, message, statusCode = 400, details = null) {
    super(message);
    this.name = 'AppError';
    this.code = code;            // رمز ثابت قابل للبرمجة (مثل AUTH_INVALID_CODE)
    this.statusCode = statusCode; // رمز HTTP
    this.details = details;       // تفاصيل اختيارية آمنة النشر
  }
}

// مصانع جاهزة لأخطاء شائعة
export const Errors = {
  badRequest: (message = 'طلب غير صالح') => new AppError('BAD_REQUEST', message, 400),
  unauthorized: (message = 'غير مصرّح') => new AppError('UNAUTHORIZED', message, 401),
  forbidden: (message = 'ممنوع') => new AppError('FORBIDDEN', message, 403),
  notFound: (message = 'غير موجود') => new AppError('NOT_FOUND', message, 404),
  conflict: (message = 'تعارض') => new AppError('CONFLICT', message, 409),
  tooManyRequests: (message = 'طلبات كثيرة، حاول لاحقًا') =>
    new AppError('RATE_LIMITED', message, 429),
  internal: (message = 'خطأ داخلي') => new AppError('INTERNAL', message, 500),
};

// تُسجَّل أخطاء AppError المعروفة، ويُخفى أي خطأ داخلي غير متوقع عن العميل.
export function errorHandler(error, request, reply) {
  if (error instanceof AppError) {
    request.log.warn({ code: error.code }, error.message);
    return reply.code(error.statusCode).send({
      error: { code: error.code, message: error.message, ...(error.details ? { details: error.details } : {}) },
    });
  }
  // أخطاء Fastify ذات رمز حالة معروف (429 معدل الطلبات، 404 مسار، 400 تحقق...)
  if (error && typeof error.statusCode === 'number' && error.statusCode >= 400 && error.statusCode < 500) {
    const code = error.statusCode === 429 ? 'RATE_LIMITED' : (error.code || 'BAD_REQUEST');
    request.log.warn({ code }, error.message);
    return reply.code(error.statusCode).send({
      error: { code, message: error.message },
    });
  }
  // خطأ غير متوقع: سجّل التفاصيل كاملة، وأرجع رسالة عامة فقط.
  request.log.error(error, 'خطأ غير متوقع');
  return reply.code(500).send({
    error: { code: 'INTERNAL', message: 'حدث خطأ غير متوقع. حاول مجددًا.' },
  });
}

// مساعد لرمي 404 بسرعة داخل الروتات
export function notFound(message = 'غير موجود') {
  throw Errors.notFound(message);
}
