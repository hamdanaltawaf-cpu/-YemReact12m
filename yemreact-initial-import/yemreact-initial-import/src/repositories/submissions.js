// مستودع مساهمات المستخدمين
export const submissionsRepo = (pool) => ({
  // قائمة المساهمات بحالة معينة (مرتبة من الأقدم للأحدث — الأقدم يراجع أولًا)
  async listByStatus(status) {
    const where = status ? 'WHERE status = $1' : '';
    const params = status ? [status] : [];
    const { rows } = await pool.query(
      `SELECT * FROM submissions ${where} ORDER BY created_at ASC`,
      params
    );
    return rows;
  },

  async get(id) {
    const { rows } = await pool.query(`SELECT * FROM submissions WHERE id = $1`, [id]);
    return rows[0] || null;
  },

  // تعيين حالة (مع سبب رفض اختياري وطابع مراجعة)
  async setStatus(id, status, rejectReason = null) {
    const { rows } = await pool.query(
      `UPDATE submissions SET status = $2, reject_reason = $3, reviewed_at = now()
       WHERE id = $1 RETURNING *`,
      [id, status, rejectReason]
    );
    return rows[0] || null;
  },

  // إنشاء مساهمة (من المستخدم أو الزائر)
  async create(fields) {
    const { rows } = await pool.query(
      `INSERT INTO submissions
         (id, user_id, session_id, contact, contact_email, caption, situation,
          category_id, source, video_key, thumb_key, duration,
          ownership_attested, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,'pending')
       RETURNING *`,
      [
        fields.id,
        fields.userId ?? null,
        fields.sessionId ?? null,
        fields.contact ?? null,
        fields.contactEmail ?? null,
        fields.caption ?? null,
        fields.situation,
        fields.categoryId ?? null,
        fields.source ?? null,
        fields.videoKey ?? null,
        fields.thumbKey ?? null,
        fields.duration ?? 0,
        fields.ownershipAttested === true,
      ]
    );
    return rows[0];
  },

  // مساهمات مستخدم (بمعرّف الحساب)
  async byUser(userId) {
    const { rows } = await pool.query(
      `SELECT * FROM submissions WHERE user_id = $1 ORDER BY created_at DESC`,
      [userId]
    );
    return rows;
  },

  // عدد المساهمات المقبولة لمستخدم (لشارة "مساهِم موثوق")
  async countApprovedByUser(userId) {
    const { rows } = await pool.query(
      `SELECT COUNT(*)::int AS n FROM submissions WHERE user_id = $1 AND status = 'approved'`,
      [userId]
    );
    return rows[0].n;
  },

  // توليد معرّف تتبع فريد (SUB-XXXXXXXX)
  async nextTrackingId() {
    // معرف بشري قابل للقراءة: 8 أحرف (أرقام وحروف كبيرة بلا التباس)
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const crypto = await import('node:crypto');
    for (let attempt = 0; attempt < 5; attempt++) {
      let id = 'SUB-';
      const bytes = crypto.randomBytes(8);
      for (let i = 0; i < 8; i++) id += alphabet[bytes[i] % alphabet.length];
      const existing = await this.get(id);
      if (!existing) return id;
    }
    // احتياط: إلحاق طابع زمني إذا تعذر التوليد
    return `SUB-${Date.now().toString(36).toUpperCase()}`;
  },
});
