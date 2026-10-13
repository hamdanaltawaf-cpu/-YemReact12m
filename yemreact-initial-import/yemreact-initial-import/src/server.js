// ============================================================
// نقطة دخول الخادم
// ============================================================
// 1) فحص الأسرار قبل الإقلاع (Security at boot).
// 2) بناء التطبيق والاستماع على المنفذ.
// 3) إغلاق أنيق (Graceful shutdown).

import config, { collectSecretProblems, ConfigError } from './config.js';
import { createPool } from './db/pool.js';
import { runMigrations } from './db/migrate.js';
import { seed } from './seed/seed.js';
import { buildApp } from './app.js';
import { checkFfmpegCapabilities } from './interfaces/media.js';

async function main() {
  // فحص الأسرار
  const problems = collectSecretProblems(config.secrets);
  if (config.isProduction && problems.length) {
    throw new ConfigError(problems);
  }

  const pool = createPool(config.databaseUrl);

  // ضمان سلامة المخطط والبيانات الابتدائية (آمن للتكرار)
  const applied = await runMigrations(pool);
  await seed(pool);

  const app = await buildApp({ pool, config });

  if (problems.length) {
    app.log.warn(
      { problems },
      '⚠️ أسرار افتراضية/ناقصة — مسموح فقط في بيئة غير إنتاجية. اضبطها قبل النشر.'
    );
  }

  // فحص قدرات ffmpeg (لا يمنع الإقلاع، لكن يحذّر مبكرًا قبل أي رفع)
  try {
    const missing = await checkFfmpegCapabilities(config.media.ffmpegPath);
    if (missing.length) {
      app.log.warn({ missing }, '⚠️ ffmpeg ينقصه: ' + missing.join('، ') + ' — رفع الفيديو سيفشل.');
    }
  } catch (err) {
    app.log.warn({ err: err.message }, '⚠️ تعذّر فحص ffmpeg — تأكد من توفره في PATH.');
  }

  await app.listen({ host: config.host, port: config.port });

  // إغلاق أنيق
  const shutdown = async (signal) => {
    app.log.info({ signal }, 'إيقاف الخادم...');
    await app.close();
    await pool.end();
    process.exit(0);
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
