// ============================================================
// خدمة الأحداث (المشاهدات/الحفظ/التنزيل/المشاركة) — أرقام حقيقية
// ============================================================
// مصدر الحقيقة الوحيد للعدّادات: كل حدث يُسجَّل في جدول events ويُحدَّث
// العدّاد بنفس المعاملة. مع: فلترة بوتات، تجزئة IP بملح، واستثناء المسؤولين.

import { randomToken, hashIp } from '../lib/crypto.js';
import { Errors } from '../lib/errors.js';

// أنماط وكلاء المستخدمين المعروفين بالبوتات/الزاحف
const BOT_UA =
  /bot|crawl|spider|slurp|curl|wget|whatsapp|telegram|facebookexternalhit|headlesschrome|lighthouse|pingdom|bingpreview|twitterbot|googlebot|python-requests|axios|okhttp|httpclient|monitor|uptime/i;

export const SESSION_COOKIE = 'yr_sid';        // كوكي تحليلي غير موقّع (لمنع تكرار العدّ)
export const VIEW_DEDUP_WINDOW_MS = 30 * 60 * 1000; // نافذة منع تكرار العرض الفريد
export const VALID_EVENT_TYPES = new Set(['view', 'save', 'download', 'share']);

export const eventsService = (deps) => {
  const { events, config, adminAuth } = deps;

  return {
    // هل وكيل المستخدم يدل على بوت؟ (الوكيل الفارغ يُعامل كبوت)
    isBot(userAgent) {
      return !userAgent || BOT_UA.test(userAgent);
    },

    // تسجيل حدث مع كل الفحوص
    async record({ request, reply, reaction, type }) {
      if (!VALID_EVENT_TYPES.has(type)) {
        throw Errors.badRequest('نوع الحدث غير صالح');
      }

      // فلترة البوتات
      const ua = request.headers['user-agent'];
      if (this.isBot(ua)) {
        return { ok: false, reason: 'bot' };
      }

      // استثناء المسؤول (لا يُحتسب نشاطه الداخلي)
      if (adminAuth && adminAuth.adminFromRequest(request)) {
        return { ok: true, ignored: 'admin' };
      }

      // جلسة تحليلية (كوكي غير موقّع) لمنع تكرار العدّ
      let sessionId = request.cookies?.[SESSION_COOKIE];
      if (!sessionId) {
        sessionId = randomToken(16);
        reply.setCookie(SESSION_COOKIE, sessionId, {
          path: '/', httpOnly: true, sameSite: 'lax',
          secure: config.isProduction, maxAge: 365 * 86400,
        });
      }

      // منع تكرار العرض الفريد خلال النافذة الزمنية
      if (type === 'view') {
        const recent = await events.hasRecent(reaction.id, type, sessionId, VIEW_DEDUP_WINDOW_MS);
        if (recent) return { ok: true, deduped: true };
      }

      const ipHash = hashIp(request.ip, config.secrets.ipSalt);
      await events.record({
        reactionId: reaction.id,
        type,
        sessionId,
        ipHash,
        userAgent: (ua || '').slice(0, 200),
      });
      return { ok: true };
    },
  };
};
