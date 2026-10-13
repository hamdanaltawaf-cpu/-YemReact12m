// ============================================================
// بذر قاعدة البيانات (Idempotent — آمن للتكرار)
// ============================================================
// يملأ: الفئات التسع + الرياكشنات + المجموعات + الإعدادات.
// الاستخدام: node src/seed/seed.js

import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { categories } from '../tokens/design-tokens.js';
import { createPool } from '../db/pool.js';
import { buildSearchText } from '../lib/search.js';
import { seedReactions, seedCollections, seedCollectionItems, seedSettings } from './seed-data.js';

export async function seed(pool) {
  // 1) الفئات (مع تحديث الاسم دائمًا — يضمن اعتماد "ضابح" حتى مع صفوف سابقة)
  for (const [i, c] of categories.entries()) {
    await pool.query(
      `INSERT INTO categories (id, name, color, sort_order) VALUES ($1,$2,$3,$4)
       ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, sort_order = EXCLUDED.sort_order`,
      [c.id, c.name, c.color, i]
    );
  }

  // 2) الرياكشنات
  for (const r of seedReactions) {
    const searchText = buildSearchText(r);
    await pool.query(
      `INSERT INTO reactions
         (display_id, slug, category_id, status, caption, situation, keywords,
          duration, corner, rights_status, source, search_optimizer, published_at, search_text)
       VALUES ($1,$2,$3,'published',$4,$5,$6,$7,$8,$9,$10,$11, now(), $12)
       ON CONFLICT (display_id) DO UPDATE SET
         caption = EXCLUDED.caption, situation = EXCLUDED.situation,
         keywords = EXCLUDED.keywords, search_optimizer = EXCLUDED.search_optimizer,
         search_text = EXCLUDED.search_text`,
      [r.displayId, r.displayId.toLowerCase(), r.cat, r.caption, r.situation,
       r.keywords, r.duration, r.corner, r.rightsStatus || 'under_review',
       r.source || null, r.searchOptimizer || null, searchText]
    );
  }

  // 3) المجموعات
  for (const [i, col] of seedCollections.entries()) {
    await pool.query(
      `INSERT INTO collections (slug, title, description, color, sort_order)
       VALUES ($1,$2,$3,$4,$5) ON CONFLICT (slug) DO NOTHING`,
      [col.slug, col.title, col.description, col.color, i]
    );
  }

  // 4) عضوية المجموعات
  for (const [slug, ids] of Object.entries(seedCollectionItems)) {
    for (const [pos, displayId] of ids.entries()) {
      await pool.query(
        `INSERT INTO collection_items (collection_id, reaction_id, position)
         SELECT c.id, r.id, $3 FROM collections c, reactions r
         WHERE c.slug = $1 AND r.display_id = $2
         ON CONFLICT (collection_id, reaction_id) DO NOTHING`,
        [slug, displayId, pos]
      );
    }
  }

  // 5) الإعدادات
  for (const [key, value] of Object.entries(seedSettings)) {
    await pool.query(
      `INSERT INTO settings (key, value) VALUES ($1,$2) ON CONFLICT (key) DO NOTHING`,
      [key, value]
    );
  }
}

const isDirectRun = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isDirectRun) {
  const pool = createPool(process.env.DATABASE_URL);
  seed(pool)
    .then(() => console.log(`✅ تم البذر: ${categories.length} فئات + ${seedReactions.length} رياكشن + ${seedCollections.length} مجموعات + إعدادات.`))
    .catch((err) => {
      console.error('❌', err.message);
      process.exitCode = 1;
    })
    .finally(() => pool.end());
}
