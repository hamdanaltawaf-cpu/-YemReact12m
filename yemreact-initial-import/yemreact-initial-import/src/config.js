// ============================================================
// إدارة الإعدادات والأسرار
// ============================================================
// تُقرأ القيم من متغيرات البيئة (مع تحميل .env عبر dotenv).
// في الإنتاج، أي سر مفقود أو افتراضي يمنع إقلاع الخادم (Security at boot).

import 'dotenv/config';
import path from 'node:path';

const env = process.env.NODE_ENV || 'development';

// قيم تُعتبر "افتراضية" وبالتالي مرفوضة في الإنتاج.
const DEFAULT_SECRET_VALUES = new Set([
  '', 'changeme', 'change-me', 'secret', 'password', 'default',
  'yemreact-dev-secret-change-me', 'your-secret-here', '123456',
]);

// هل القيمة ضعيفة بما يكفي لرفضها في الإنتاج؟
function isWeakSecret(value) {
  const v = String(value || '').trim();
  if (!v) return true;
  if (DEFAULT_SECRET_VALUES.has(v.toLowerCase())) return true;
  if (v.length < 16) return true; // قصيرة جدًا
  // أنماط تدل على قيمة تطوير/مثال
  if (/(dev|test|example|changeme|change-me|not-for-prod)/i.test(v)) return true;
  return false;
}

export const config = {
  env,
  isProduction: env === 'production',
  host: process.env.HOST || '0.0.0.0',
  port: Number(process.env.PORT || 4173),
  siteUrl: (process.env.SITE_URL || 'http://localhost:4173').replace(/\/$/, ''),
  databaseUrl:
    process.env.DATABASE_URL ||
    'postgres://yemreact:yemreact_dev@127.0.0.1:5432/yemreact',
  secrets: {
    sessionSecret: process.env.SESSION_SECRET || '',
    adminSecret: process.env.ADMIN_SECRET || '',
    otpSalt: process.env.OTP_SALT || '',
    ipSalt: process.env.IP_SALT || '',
    adminPassword: process.env.YEMREACT_ADMIN_PASSWORD || '',
  },
  storage: {
    transport: process.env.STORAGE_TRANSPORT || 'local',
    localDir: path.resolve(process.env.STORAGE_LOCAL_DIR || 'data/media'),
    publicBaseUrl: process.env.PUBLIC_MEDIA_BASE_URL || '/media',
  },
  assets: {
    dir: path.resolve('src/assets'), // ملفات الواترمارك المولّدة
  },
  webDistDir: path.resolve('web/dist'), // بناء الواجهة العامة (Astro)
  mail: {
    transport: process.env.MAIL_TRANSPORT || 'dev',
    from: process.env.MAIL_FROM || 'YemReact <no-reply@yemreact.dev>',
    resendApiKey: process.env.RESEND_API_KEY || '',
  },
  // عتبة شارة "مساهِم موثوق" (عدد المساهمات المقبولة)
  trustedContributor: {
    threshold: Number(process.env.TRUSTED_CONTRIBUTOR_THRESHOLD || 3),
  },
  media: {
    transport: process.env.MEDIA_TRANSPORT || 'local',
    ffmpegPath: process.env.FFMPEG_PATH || 'ffmpeg',
    ffprobePath: process.env.FFPROBE_PATH || 'ffprobe',
    maxUploadBytes: Number(process.env.MAX_UPLOAD_BYTES || 80 * 1024 * 1024),
  },
  otp: { length: 6, ttlMinutes: 15 },
  session: { userTtlDays: 60, adminTtlHours: 8 },
  rateLimit: {
    max: Number(process.env.RATE_LIMIT_MAX || 1000),
    submissionsMax: Number(process.env.RATE_LIMIT_SUBMISSIONS_MAX || 10),
  },
  // إعادة بناء الواجهة (SSG) عند النشر/التعديل
  rebuild: {
    enabled: process.env.REBUILD_ON_PUBLISH
      ? process.env.REBUILD_ON_PUBLISH === 'true'
      : env !== 'production', // مفعّل افتراضيًا خارج الإنتاج
    debounceMs: Number(process.env.REBUILD_DEBOUNCE_MS || 3000),
  },
};

// أسماء الأسرار للرسائل التوضيحية
const SECRET_LABELS = {
  sessionSecret: 'SESSION_SECRET',
  adminSecret: 'ADMIN_SECRET',
  otpSalt: 'OTP_SALT',
  ipSalt: 'IP_SALT',
  adminPassword: 'YEMREACT_ADMIN_PASSWORD',
};

// يجمع قائمة المشاكل الأمنية في مجموعة الأسرار المعطاة.
export function collectSecretProblems(secrets) {
  const problems = [];
  for (const [key, label] of Object.entries(SECRET_LABELS)) {
    if (isWeakSecret(secrets[key])) {
      problems.push(`${label} مفقود أو قيمة ضعيفة/افتراضية غير آمنة`);
    }
  }
  return problems;
}

// خطأ إعداد غير آمن — يُرمى عند الإقلاع في الإنتاج.
export class ConfigError extends Error {
  constructor(problems) {
    super('إعداد غير آمن — يمن رياكت يرفض الإقلاع:\n' + problems.map((p) => `  • ${p}`).join('\n'));
    this.name = 'ConfigError';
    this.problems = problems;
  }
}

export default config;
