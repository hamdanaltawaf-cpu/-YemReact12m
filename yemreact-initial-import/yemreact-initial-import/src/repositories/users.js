// مستودع الحسابات ورموز الدخول
export const usersRepo = (pool) => ({
  async byEmail(email) {
    const { rows } = await pool.query(`SELECT * FROM users WHERE email = $1`, [email]);
    return rows[0] || null;
  },

  async byId(id) {
    const { rows } = await pool.query(`SELECT * FROM users WHERE id = $1`, [id]);
    return rows[0] || null;
  },

  // إنشاء مستخدم (أو إرجاع الموجود)
  async findOrCreate(email) {
    const normalized = email.trim().toLowerCase();
    const existing = await this.byEmail(normalized);
    if (existing) return existing;
    const { rows } = await pool.query(
      `INSERT INTO users (email) VALUES ($1) ON CONFLICT (email) DO NOTHING RETURNING *`,
      [normalized]
    );
    return rows[0] || (await this.byEmail(normalized));
  },
});

export const authCodesRepo = (pool) => ({
  // تخزين رمز (مجزّأ)
  async create(userId, codeHash, expiresAt) {
    await pool.query(
      `INSERT INTO auth_codes (user_id, code_hash, expires_at) VALUES ($1,$2,$3)`,
      [userId, codeHash, expiresAt]
    );
  },

  // آخر رمز صالح غير مستخدم
  async latestValid(userId) {
    const { rows } = await pool.query(
      `SELECT * FROM auth_codes
       WHERE user_id = $1 AND used = FALSE AND expires_at > now()
       ORDER BY created_at DESC LIMIT 1`,
      [userId]
    );
    return rows[0] || null;
  },

  // تعليم الرمز مستخدمًا (مرة واحدة فقط)
  async markUsed(id) {
    await pool.query(`UPDATE auth_codes SET used = TRUE WHERE id = $1`, [id]);
  },
});
