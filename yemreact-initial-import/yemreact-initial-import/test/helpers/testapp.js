// مساعد التجارب: يجهّز بيئة اختبار معزولة (قاعدة yemreact_test + تطبيق)
// الاستخدام داخل before() في أي ملف تكامل.
import os from 'node:os';
import path from 'node:path';

export async function startTestApp() {
  // ضبط بيئة الاختبار قبل أي استيراد لملف config (الاستيراد ديناميكي لاحقًا)
  process.env.NODE_ENV = 'test';
  process.env.DATABASE_URL =
    process.env.DATABASE_URL || 'postgres://yemreact:yemreact_dev@127.0.0.1:5432/yemreact_test';
  process.env.SESSION_SECRET = 'test-session-secret-0123456789abcdef';
  process.env.ADMIN_SECRET = 'test-admin-secret-0123456789abcdef';
  process.env.OTP_SALT = 'test-otp-salt-0123456789abcdef';
  process.env.IP_SALT = 'test-ip-salt-0123456789abcdef';
  process.env.YEMREACT_ADMIN_PASSWORD = 'test-admin-password-012345';
  process.env.RATE_LIMIT_MAX = '100000';
  process.env.RATE_LIMIT_SUBMISSIONS_MAX = '1000';
  // تعطيل إعادة بناء الواجهة أثناء الاختبارات (تولّد عمليات npm حقيقية)
  process.env.REBUILD_ON_PUBLISH = 'false';
  // تخزين وسائط معزول لكل جولة اختبار (لا يلوّث data/)
  process.env.STORAGE_LOCAL_DIR = path.join(os.tmpdir(), `yr-test-media-${process.pid}-${Date.now()}`);

  const { createPool } = await import('../../src/db/pool.js');
  const { runMigrations } = await import('../../src/db/migrate.js');
  const { seed } = await import('../../src/seed/seed.js');
  const { buildApp } = await import('../../src/app.js');
  const { default: config } = await import('../../src/config.js');

  const pool = createPool(process.env.DATABASE_URL);
  await runMigrations(pool);

  // عزل كامل بين الجولات: تفريغ بيانات تشغيلية ثم إعادة البذر نظيفًا
  await pool.query(`DELETE FROM submissions`);
  await pool.query(`DELETE FROM reactions`);        // cascade: events, saved, collection_items
  await pool.query(`DELETE FROM categories`);
  await pool.query(`DELETE FROM auth_codes`);
  await pool.query(`DELETE FROM saved_reactions`);
  await pool.query(`DELETE FROM audit_logs`);
  await pool.query(`DELETE FROM collection_items`);
  await pool.query(`DELETE FROM settings`);

  await seed(pool);

  const app = await buildApp({ pool, config });
  await app.ready();
  return { app, pool, config };
}

// إغلاق نظيف بعد الاختبارات
export async function stopTestApp({ app, pool }) {
  await app.close();
  await pool.end();
}

// استخراج قيمة أول كوكي من استجابة inject (يتعامل مع سلسلة أو مصفوفة)
export function firstCookie(res) {
  const sc = res.headers['set-cookie'];
  const arr = Array.isArray(sc) ? sc : [sc];
  return (arr[0] || '').split(';')[0];
}
