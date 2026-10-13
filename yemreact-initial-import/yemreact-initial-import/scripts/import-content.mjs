// ============================================================
// YemReact — استيراد المحتوى من JSON (لتعبئة المكتبة للإطلاق)
// ============================================================
// يقرأ ملف JSON فيه قائمة رياكشنات، يعالج الفيديوهات (إن وُجدت) عبر
// خط P2 (ffmpeg + واترمارك)، ويدخلها في قاعدة البيانات.
//
// شكل JSON (مثال في docs/import-sample.json):
// [
//   {
//     "caption": "يا ساتر!",
//     "situation": "لما تسمع خبر صادم",
//     "category": "shock",
//     "keywords": ["خبر", "مفاجأة"],
//     "source": "حساب ...", "source_url": "https://...",
//     "rights_status": "licensed",
//     "corner": "tr",
//     "video_path": "/absolute/path/to/video.mp4"   // اختياري
//   }
// ]
//
// الاستخدام:
//   node scripts/import-content.mjs data/import.json
//   DRY_RUN=1 node scripts/import-content.mjs data/import.json   # معاينة فقط

import fs from 'node:fs';
import { createPool } from '../src/db/pool.js';
import { reactionsRepo } from '../src/repositories/reactions.js';
import { mediaService } from '../src/services/media.service.js';
import { createStorage } from '../src/interfaces/storage.js';
import { createMedia } from '../src/interfaces/media.js';
import { buildSearchText } from '../src/lib/search.js';
import { ensureWatermarks } from '../src/lib/watermark.js';
import { categories } from '../src/tokens/design-tokens.js';

const file = process.argv[2];
if (!file) { console.error('الاستخدام: node scripts/import-content.mjs <file.json>'); process.exit(1); }
const DRY_RUN = process.env.DRY_RUN === '1';

const config = (await import('../src/config.js')).default;
const pool = createPool(config.databaseUrl);
const reactions = reactionsRepo(pool);
const storage = createStorage(config.storage);
const media = createMedia(config.media);
const watermarks = await ensureWatermarks({ ffmpegPath: config.media.ffmpegPath, assetsDir: config.assets.dir });
const ingest = mediaService({ media, storage, reactions, config });

const validCats = new Set(categories.map((c) => c.id));
const data = JSON.parse(fs.readFileSync(file, 'utf8'));
if (!Array.isArray(data)) { console.error('❌ الملف يجب أن يحتوي قائمة JSON'); process.exit(1); }

let imported = 0, withVideo = 0, skipped = 0;
for (const item of data) {
  const caption = (item.caption || '').trim();
  const situation = (item.situation || '').trim();
  const category = item.category;
  if (!caption || !situation || !validCats.has(category)) {
    console.warn(`⚠️ تخطي (ناقص caption/situation/category): ${JSON.stringify(item).slice(0, 80)}`);
    skipped++;
    continue;
  }

  try {
    let mediaFields = {};
    if (item.video_path && fs.existsSync(item.video_path)) {
      const res = await ingest.ingest({
        filePath: item.video_path,
        corner: item.corner === 'tl' ? 'tl' : 'tr',
        watermarkPath: watermarks[item.corner === 'tl' ? 'tl' : 'tr'],
      });
      mediaFields = {
        displayId: res.displayId, slug: res.displayId.toLowerCase(),
        contentHash: res.contentHash, videoKey: res.videoKey, thumbKey: res.thumbKey,
        codec: res.codec, width: res.width, height: res.height, fps: res.fps,
        sizeBytes: res.sizeBytes, hasWatermark: true, duration: res.duration,
      };
      withVideo++;
    } else {
      mediaFields = {
        displayId: await reactions.nextDisplayId(),
        slug: null, duration: item.duration || 0,
      };
      mediaFields.slug = mediaFields.displayId.toLowerCase();
    }

    const keywords = (item.keywords || []).map((k) => String(k).trim()).filter(Boolean);
    const searchOptimizer = (item.search_optimizer || '').trim() || null;
    if (DRY_RUN) {
      console.log(`[DRY] ${mediaFields.displayId} · ${caption} · ${category}${item.video_path ? ' · (فيديو)' : ''}`);
    } else {
      await reactions.create({
        ...mediaFields,
        categoryId: category, caption, situation,
        description: item.description || null,
        keywords, searchOptimizer, corner: item.corner === 'tl' ? 'tl' : 'tr',
        source: item.source || null, sourceUrl: item.source_url || null,
        status: 'published',
        rightsStatus: item.rights_status || 'licensed',
        searchText: buildSearchText({ caption, situation, description: item.description, keywords, searchOptimizer }),
      });
      console.log(`✓ ${mediaFields.displayId} · ${caption}`);
    }
    imported++;
  } catch (err) {
    console.warn(`⚠️ فشل "${caption}": ${err.message}`);
    skipped++;
  }
}

console.log(`\n=== النتيجة: ${imported} مستورد (${withVideo} بفيديو)، ${skipped} تخطي${DRY_RUN ? ' — وضع المعاينة (DRY_RUN)' : ''} ===`);
if (!DRY_RUN) {
  console.log('ℹ️ لا تنسَ إعادة بناء الواجهة: npm --prefix web run build');
}
await pool.end();
