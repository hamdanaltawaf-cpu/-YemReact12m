// مستودع الأحداث — المصدر الوحيد لحقيقة العدّادات
// كل حدث يُسجَّل ويُحدَّث العدّاد المطابق في نفس المعاملة (لا ازدواج).

const COUNTER_COLUMN = {
  view: 'views_count',
  save: 'saves_count',
  download: 'downloads_count',
  share: 'shares_count',
};

export const eventsRepo = (pool) => ({
  // تسجيل حدث وزيادة العدّاد ذرّيًا
  async record({ reactionId, type, sessionId = null, ipHash = null, userAgent = null, meta = null }) {
    const column = COUNTER_COLUMN[type];
    if (!column) throw new Error(`نوع حدث غير معروف: ${type}`);
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        `INSERT INTO events (reaction_id, type, session_id, ip_hash, user_agent, meta)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [reactionId, type, sessionId, ipHash, userAgent, meta]
      );
      await client.query(`UPDATE reactions SET ${column} = ${column} + 1 WHERE id = $1`, [reactionId]);
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },

  // هل يوجد حدث حديث لنفس الرياكشن/النوع/الجلسة؟ (لمنع تكرار العرض الفريد)
  async hasRecent(reactionId, type, sessionId, windowMs) {
    if (!sessionId) return false;
    const { rows } = await pool.query(
      `SELECT 1 FROM events
       WHERE reaction_id = $1 AND type = $2 AND session_id = $3
         AND created_at > now() - ($4 || ' milliseconds')::interval
       LIMIT 1`,
      [reactionId, type, sessionId, windowMs]
    );
    return rows.length > 0;
  },

  // ملخص العدّادات (إعادة حساب من الأحداث الخام — للتدقيق)
  async summarize(reactionId) {
    const { rows } = await pool.query(
      `SELECT type, COUNT(*)::int AS n FROM events WHERE reaction_id = $1 GROUP BY type`,
      [reactionId]
    );
    const out = { views: 0, saves: 0, downloads: 0, shares: 0 };
    for (const r of rows) {
      const key = { view: 'views', save: 'saves', download: 'downloads', share: 'shares' }[r.type];
      if (key) out[key] = r.n;
    }
    return out;
  },
});
