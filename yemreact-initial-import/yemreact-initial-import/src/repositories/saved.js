// مستودع المحفوظات
export const savedRepo = (pool) => ({
  async idsForUser(userId) {
    const { rows } = await pool.query(
      `SELECT r.display_id FROM saved_reactions s
       JOIN reactions r ON r.id = s.reaction_id
       WHERE s.user_id = $1 ORDER BY s.created_at DESC`,
      [userId]
    );
    return rows.map((r) => r.display_id);
  },

  async add(userId, reactionId) {
    await pool.query(
      `INSERT INTO saved_reactions (user_id, reaction_id) VALUES ($1,$2)
       ON CONFLICT (user_id, reaction_id) DO NOTHING`,
      [userId, reactionId]
    );
  },

  async remove(userId, reactionId) {
    await pool.query(
      `DELETE FROM saved_reactions WHERE user_id = $1 AND reaction_id = $2`,
      [userId, reactionId]
    );
  },
});
