// ============================================================
// مجمّع اتصالات PostgreSQL
// ============================================================
import pg from 'pg';
import config from '../config.js';

const { Pool } = pg;

// مصنع مجمّع — يستخدمه الخادم والتجارب بقاعدة بيانات مختلفة.
export function createPool(connectionString) {
  return new Pool({
    connectionString,
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
  });
}

// المجمّع الافتراضي (من الإعدادات)
export const defaultPool = createPool(config.databaseUrl);

export default defaultPool;
