// مستودع الاستعلامات الفاشلة — لتغذية الفهرس وطابور المحتوى
import { normalizeArabic } from '../lib/arabic.js';

export const failedSearchesRepo = (pool) => ({
  // تسجيل استعلام أعاد صفر نتيجة
  async record(query, resultCount) {
    if (!query || !query.trim()) return;
    await pool.query(
      `INSERT INTO failed_searches (query, normalized, results) VALUES ($1,$2,$3)`,
      [query.trim().slice(0, 200), normalizeArabic(query), resultCount]
    );
  },

  // الاستعلامات الفاشلة الأكثر تكرارًا (مجموعة ومحصورة)
  async top(limit = 30) {
    const { rows } = await pool.query(
      `SELECT normalized, MAX(query) AS query, COUNT(*)::int AS count, MAX(created_at) AS last_at
       FROM failed_searches
       GROUP BY normalized
       ORDER BY count DESC, last_at DESC
       LIMIT $1`,
      [limit]
    );
    return rows;
  },

  // عدد الاستعلامات الفاشلة خلال مدة (بالأيام)
  async countSince(days = 7) {
    const { rows } = await pool.query(
      `SELECT COUNT(*)::int AS n FROM failed_searches WHERE created_at > now() - ($1 || ' days')::interval`,
      [days]
    );
    return rows[0].n;
  },
});
