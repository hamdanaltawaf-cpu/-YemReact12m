// مستودع التصنيفات
export const categoriesRepo = (pool) => ({
  // قائمة التصنيفات النشطة مرتّبة
  async list() {
    const { rows } = await pool.query(
      `SELECT id, name, description, color, sort_order FROM categories
       WHERE active = TRUE ORDER BY sort_order ASC`
    );
    return rows;
  },

  // قائمة كاملة (للإدارة — تشمل غير النشطة)
  async listAll() {
    const { rows } = await pool.query(
      `SELECT id, name, description, color, sort_order, active FROM categories
       ORDER BY sort_order ASC`
    );
    return rows;
  },

  async byId(id) {
    const { rows } = await pool.query(
      `SELECT id, name, description, color, sort_order FROM categories WHERE id = $1`,
      [id]
    );
    return rows[0] || null;
  },

  // تعديل اسم/وصف/ترتيب (اللون مقفل — لا يُمرَّر هنا)
  async update(id, { name, description, sortOrder }) {
    const { rows } = await pool.query(
      `UPDATE categories SET
         name = COALESCE($2, name),
         description = COALESCE($3, description),
         sort_order = COALESCE($4, sort_order)
       WHERE id = $1 RETURNING *`,
      [id, name ?? null, description ?? null, sortOrder ?? null]
    );
    return rows[0] || null;
  },
});
