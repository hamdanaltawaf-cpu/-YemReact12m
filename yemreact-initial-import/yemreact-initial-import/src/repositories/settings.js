// مستودع الإعدادات وسجل التدقيق

export const settingsRepo = (pool) => ({
  async get(key) {
    const { rows } = await pool.query(`SELECT value FROM settings WHERE key = $1`, [key]);
    return rows[0] ? rows[0].value : null;
  },

  async set(key, value) {
    await pool.query(
      `INSERT INTO settings (key, value) VALUES ($1,$2)
       ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = now()`,
      [key, value]
    );
  },
});

export const auditRepo = (pool) => ({
  async log(actor, action, target = null, summary = null) {
    await pool.query(
      `INSERT INTO audit_logs (actor, action, target, summary) VALUES ($1,$2,$3,$4)`,
      [actor, action, target, summary]
    );
  },

  async list(limit = 50) {
    const { rows } = await pool.query(
      `SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT $1`,
      [limit]
    );
    return rows;
  },
});
