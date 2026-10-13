// مستودع البلاغات
export const reportsRepo = (pool) => ({
  async create({ reactionId, reason, reporterContact = null, reporterEmail = null }) {
    const { rows } = await pool.query(
      `INSERT INTO reports (reaction_id, reason, reporter_contact, reporter_email)
       VALUES ($1,$2,$3,$4) RETURNING *`,
      [reactionId, reason, reporterContact, reporterEmail]
    );
    return rows[0];
  },

  // البلاغات المفتوحة (مع بيانات الرياكشن)
  async listOpen() {
    const { rows } = await pool.query(
      `SELECT rp.*, r.display_id, r.caption, r.status AS reaction_status
       FROM reports rp JOIN reactions r ON r.id = rp.reaction_id
       WHERE rp.status = 'open'
       ORDER BY rp.created_at ASC`
    );
    return rows;
  },

  // كل البلاغات (للإدارة)
  async listAll(limit = 100) {
    const { rows } = await pool.query(
      `SELECT rp.*, r.display_id, r.caption, r.status AS reaction_status
       FROM reports rp JOIN reactions r ON r.id = rp.reaction_id
       ORDER BY rp.created_at DESC LIMIT $1`,
      [limit]
    );
    return rows;
  },

  async get(id) {
    const { rows } = await pool.query(`SELECT * FROM reports WHERE id = $1`, [id]);
    return rows[0] || null;
  },

  // حل بلاغ: إعادة نشر أو حذف
  async resolve(id, status, resolutionNote) {
    const { rows } = await pool.query(
      `UPDATE reports SET status = $2, resolution_note = $3, resolved_at = now()
       WHERE id = $1 RETURNING *`,
      [id, status, resolutionNote]
    );
    return rows[0] || null;
  },
});
