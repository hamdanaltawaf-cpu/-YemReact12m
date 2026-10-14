// ============================================================
// مشغّل الهجرات (Migrations Runner)
// ============================================================
// يطبّق ملفات SQL في src/db/migrations بالترتيب، ويتتبّع المطبَّق منها
// في جدول schema_migrations. كل هجرة تُنفَّذ داخل معاملة واحدة.
// الاستخدام: node src/db/migrate.js  (أو runMigrations(pool) برمجيًا)

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createPool } from './pool.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = path.join(__dirname, 'migrations');

export async function runMigrations(pool) {
  // ضمان وجود جدول التتبع
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version    TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);

  const { rows } = await pool.query('SELECT version FROM schema_migrations');
  const applied = new Set(rows.map((r) => r.version));

  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  const appliedNow = [];
  for (const file of files) {
    if (applied.has(file)) continue;
    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(sql);
      await client.query('INSERT INTO schema_migrations (version) VALUES ($1)', [file]);
      await client.query('COMMIT');
      appliedNow.push(file);
    } catch (err) {
      await client.query('ROLLBACK');
      throw new Error(`فشل تطبيق الهجرة ${file}: ${err.message}`);
    } finally {
      client.release();
    }
  }
  return appliedNow;
}

// وضع CLI: تنفيذ مباشر ثم إغلاق المجمّع
const isDirectRun = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isDirectRun) {
  const pool = createPool(process.env.DATABASE_URL);
  runMigrations(pool)
    .then((applied) => {
      console.log(applied.length ? `✅ طُبّقت الهجرات: ${applied.join(', ')}` : 'ℹ️ لا هجرات جديدة — القاعدة محدّثة.');
    })
    .catch((err) => {
      console.error('❌', err.message);
      process.exitCode = 1;
    })
    .finally(() => pool.end());
}
