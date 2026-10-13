// مستودع الرياكشنات — كل استعلامات البيانات هنا (لا SQL في الروتات)
import { normalizeArabic } from '../lib/arabic.js';

// يطبع عمودًا إلى الشكل العام (Public API shape)
export function toPublicReaction(row, publicMediaBaseUrl = '/media') {
  return {
    id: row.display_id,
    slug: row.slug || row.display_id.toLowerCase(),
    cat: row.category_id,
    status: row.status,
    quote: row.caption,
    situation: row.situation,
    desc: row.description,
    keywords: row.keywords || [],
    searchOptimizer: row.search_optimizer,
    dur: row.duration,
    corner: row.corner,
    source: row.source,
    sourceUrl: row.source_url,
    video: row.video_key ? `${publicMediaBaseUrl}/${row.video_key}` : null,
    thumb: row.thumb_key ? `${publicMediaBaseUrl}/${row.thumb_key}` : null,
    stats: {
      views: row.views_count,
      saves: row.saves_count,
      downloads: row.downloads_count,
      shares: row.shares_count,
    },
    publishedAt: row.published_at,
  };
}

export const reactionsRepo = (pool) => ({
  // قائمة الرياكشنات المنشورة مع فلترة (تصنيف + بحث نصي بسيط)
  async listPublished({ cat = null, q = null, limit = 60 } = {}) {
    const where = ["status = 'published'"];
    const params = [];
    if (cat) {
      params.push(cat);
      where.push(`category_id = $${params.length}`);
    }
    if (q && q.trim()) {
      const raw = q.trim();
      params.push(`%${normalizeArabic(raw)}%`); // نص البحث المطبَّع
      params.push(`%${raw}%`);                   // المعرّف كما هو (YR-0003)
      where.push(`(search_text ILIKE $${params.length - 1} OR display_id ILIKE $${params.length})`);
    }
    params.push(limit);
    const { rows } = await pool.query(
      `SELECT * FROM reactions WHERE ${where.join(' AND ')}
       ORDER BY published_at DESC NULLS LAST, display_id ASC
       LIMIT $${params.length}`,
      params
    );
    return rows;
  },

  // جلب رياكشن واحد بمعرّف العرض (منشور فقط)
  async byDisplayId(displayId) {
    const { rows } = await pool.query(
      `SELECT * FROM reactions WHERE display_id = $1 AND status = 'published'`,
      [displayId]
    );
    return rows[0] || null;
  },

  // جلب رياكشن بمعرّف العرض بأي حالة (للإدارة)
  async byDisplayIdAnyStatus(displayId) {
    const { rows } = await pool.query(
      `SELECT * FROM reactions WHERE display_id = $1`,
      [displayId]
    );
    return rows[0] || null;
  },

  // الأحدث (منشور، مرتّب تنازليًا)
  async newest(limit = 8) {
    return this.listPublished({ limit });
  },

  // رياكشن مختار الأسبوع (بمعرّف العرض)
  async featuredByDisplayId(displayId) {
    if (!displayId) return null;
    return this.byDisplayId(displayId);
  },

  // جلب رياكشن بمعرّفه الداخلي (UUID) — لأي حالة
  async byId(id) {
    const { rows } = await pool.query(`SELECT * FROM reactions WHERE id = $1`, [id]);
    return rows[0] || null;
  },

  // رياكشنات قريبة (نفس التصنيف، غير نفس الرياكشن)
  async related(displayId, categoryId, limit = 5) {
    const { rows } = await pool.query(
      `SELECT * FROM reactions
       WHERE category_id = $1 AND display_id <> $2 AND status = 'published'
       ORDER BY views_count DESC, published_at DESC
       LIMIT $3`,
      [categoryId, displayId, limit]
    );
    return rows;
  },

  // معرّف العرض التالي (YR-####)
  async nextDisplayId() {
    const { rows } = await pool.query(
      `SELECT display_id FROM reactions ORDER BY display_id DESC LIMIT 1`
    );
    if (!rows.length) return 'YR-0001';
    const m = /^YR-(\d+)$/.exec(rows[0].display_id || '');
    const next = m ? parseInt(m[1], 10) + 1 : 1;
    return `YR-${String(next).padStart(4, '0')}`;
  },

  // كشف التكرار: هل يوجد رياكشن بنفس تجزئة المحتوى؟
  async byContentHash(contentHash) {
    if (!contentHash) return null;
    const { rows } = await pool.query(
      `SELECT * FROM reactions WHERE content_hash = $1 LIMIT 1`,
      [contentHash]
    );
    return rows[0] || null;
  },

  // إنشاء رياكشن جديد (من لوحة الإدارة)
  async create(fields) {
    const { rows } = await pool.query(
      `INSERT INTO reactions
         (display_id, slug, category_id, status, caption, situation, description,
          keywords, search_optimizer, duration, corner, source, source_url, rights_status,
          content_hash, video_key, thumb_key, codec, width, height, fps, size_bytes,
          has_watermark, search_text, published_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25)
       RETURNING *`,
      [
        fields.displayId, fields.slug, fields.categoryId, fields.status || 'published',
        fields.caption, fields.situation, fields.description || null,
        fields.keywords || [], fields.searchOptimizer || null, fields.duration || 0, fields.corner || 'tr',
        fields.source || null, fields.sourceUrl || null,
        fields.rightsStatus || 'under_review',
        fields.contentHash || null, fields.videoKey || null, fields.thumbKey || null,
        fields.codec || null, fields.width || 0, fields.height || 0, fields.fps || 0,
        fields.sizeBytes || 0, fields.hasWatermark || false,
        fields.searchText || null,
        fields.status === 'draft' ? null : new Date(),
      ]
    );
    return rows[0];
  },

  // قائمة الإدارة (كل الحالات مع بحث وفلترة وترقيم)
  async listAllForAdmin({ status = null, q = null, cat = null, page = 1, pageSize = 30 } = {}) {
    const where = [];
    const params = [];
    if (status) { params.push(status); where.push(`status = $${params.length}`); }
    if (cat) { params.push(cat); where.push(`category_id = $${params.length}`); }
    if (q && q.trim()) {
      params.push(`%${normalizeArabic(q)}%`);
      where.push(`(search_text ILIKE $${params.length} OR display_id ILIKE $${params.length})`);
    }
    const whereClause = where.length ? 'WHERE ' + where.join(' AND ') : '';

    // العدد الكلي
    const countRes = await pool.query(`SELECT COUNT(*)::int AS n FROM reactions ${whereClause}`, params);
    const total = countRes.rows[0].n;

    // الصفحة
    const offset = (Math.max(1, page) - 1) * pageSize;
    const listParams = [...params, pageSize, offset];
    const { rows } = await pool.query(
      `SELECT * FROM reactions ${whereClause}
       ORDER BY created_at DESC LIMIT $${listParams.length - 1} OFFSET $${listParams.length}`,
      listParams
    );
    return { rows, total, page: Math.max(1, page), pageSize };
  },

  // تحديث حقول رياكشن (محتوى + ميتاداتا، ليس الملفات)
  async update(id, fields) {
    const allowed = {
      caption: 'caption', situation: 'situation', description: 'description',
      keywords: 'keywords', searchOptimizer: 'search_optimizer',
      corner: 'corner', source: 'source', sourceUrl: 'source_url',
      categoryId: 'category_id', duration: 'duration', rightsStatus: 'rights_status',
    };
    const sets = [];
    const values = [id];
    for (const [field, column] of Object.entries(allowed)) {
      if (fields[field] !== undefined) {
        values.push(fields[field]);
        sets.push(`${column} = $${values.length}`);
      }
    }
    // نص البحث يتجدد تلقائيًا عند تغيير المحتوى
    if (fields.searchText !== undefined) {
      values.push(fields.searchText);
      sets.push(`search_text = $${values.length}`);
    }
    if (!sets.length) return this.byId(id);
    sets.push(`updated_at = now()`);
    const { rows } = await pool.query(
      `UPDATE reactions SET ${sets.join(', ')} WHERE id = $1 RETURNING *`,
      values
    );
    return rows[0] || null;
  },

  // تغيير الحالة (draft/published/archived/legal_review)
  async setStatus(id, status) {
    const { rows } = await pool.query(
      `UPDATE reactions SET status = $2, published_at = CASE WHEN $2 = 'published' THEN COALESCE(published_at, now()) ELSE published_at END, updated_at = now()
       WHERE id = $1 RETURNING *`,
      [id, status]
    );
    return rows[0] || null;
  },

  // حذف صلب (يُرجع الصف المحذوف — ليتولى المستدعي حذف ملفات الوسائط)
  async hardDelete(id) {
    const { rows } = await pool.query(
      `DELETE FROM reactions WHERE id = $1 RETURNING *`,
      [id]
    );
    return rows[0] || null;
  },
});
