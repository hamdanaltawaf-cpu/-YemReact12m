// مستودع المجموعات (يحرّرها المسؤول)
export const collectionsRepo = (pool) => ({
  // قائمة المجموعات النشطة مع عدد رياكشناتها
  async list() {
    const { rows } = await pool.query(
      `SELECT c.slug, c.title, c.description, c.color,
              (SELECT COUNT(*)::int FROM collection_items ci WHERE ci.collection_id = c.id) AS count
       FROM collections c WHERE c.active = TRUE ORDER BY c.sort_order ASC`
    );
    return rows;
  },

  async getBySlug(slug) {
    const { rows } = await pool.query(
      `SELECT * FROM collections WHERE slug = $1 AND active = TRUE`,
      [slug]
    );
    return rows[0] || null;
  },

  // رياكشنات مجموعة بترتيب موضعها
  async reactionsBySlug(slug) {
    const { rows } = await pool.query(
      `SELECT r.* FROM reactions r
       JOIN collection_items ci ON ci.reaction_id = r.id
       JOIN collections c ON c.id = ci.collection_id
       WHERE c.slug = $1 AND r.status = 'published'
       ORDER BY ci.position ASC`,
      [slug]
    );
    return rows;
  },

  // ===== طرق الإدارة =====

  // قائمة كاملة (تشمل غير النشطة) مع العدد
  async listAllAdmin() {
    const { rows } = await pool.query(
      `SELECT c.id, c.slug, c.title, c.description, c.color, c.sort_order, c.active, c.created_at,
              (SELECT COUNT(*)::int FROM collection_items ci WHERE ci.collection_id = c.id) AS count
       FROM collections c ORDER BY c.sort_order ASC`
    );
    return rows;
  },

  async getById(id) {
    const { rows } = await pool.query(`SELECT * FROM collections WHERE id = $1`, [id]);
    return rows[0] || null;
  },

  async create({ slug, title, description, color }) {
    const { rows } = await pool.query(
      `INSERT INTO collections (slug, title, description, color)
       VALUES ($1,$2,$3,$4) RETURNING *`,
      [slug, title, description || null, color || null]
    );
    return rows[0];
  },

  async update(id, { slug, title, description, color, sortOrder, active }) {
    const { rows } = await pool.query(
      `UPDATE collections SET
         slug = COALESCE($2, slug),
         title = COALESCE($3, title),
         description = COALESCE($4, description),
         color = COALESCE($5, color),
         sort_order = COALESCE($6, sort_order),
         active = COALESCE($7, active)
       WHERE id = $1 RETURNING *`,
      [id, slug ?? null, title ?? null, description ?? null, color ?? null, sortOrder ?? null, active ?? null]
    );
    return rows[0] || null;
  },

  async remove(id) {
    await pool.query(`DELETE FROM collections WHERE id = $1`, [id]);
  },

  // إضافة رياكشن لمجموعة (بمعرّف العرض)
  async addItem(collectionId, displayId) {
    await pool.query(
      `INSERT INTO collection_items (collection_id, reaction_id, position)
       SELECT $1, r.id, COALESCE((SELECT MAX(position)+1 FROM collection_items WHERE collection_id = $1), 0)
       FROM reactions r WHERE r.display_id = $2
       ON CONFLICT (collection_id, reaction_id) DO NOTHING`,
      [collectionId, displayId]
    );
  },

  async removeItem(collectionId, displayId) {
    await pool.query(
      `DELETE FROM collection_items ci
       USING reactions r
       WHERE ci.collection_id = $1 AND ci.reaction_id = r.id AND r.display_id = $2`,
      [collectionId, displayId]
    );
  },

  // عضوية مجموعة (معرّفات العرض) — للواجهة
  async itemIds(collectionId) {
    const { rows } = await pool.query(
      `SELECT r.display_id FROM collection_items ci
       JOIN reactions r ON r.id = ci.reaction_id
       WHERE ci.collection_id = $1 ORDER BY ci.position ASC`,
      [collectionId]
    );
    return rows.map((r) => r.display_id);
  },
});
