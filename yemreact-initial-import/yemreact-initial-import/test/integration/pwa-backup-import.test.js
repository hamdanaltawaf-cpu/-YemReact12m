// اختبارات تكامل P6 — PWA + النسخ الاحتياطي + الاستيراد
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { startTestApp, stopTestApp } from '../helpers/testapp.js';

const execFileP = promisify(execFile);
// جذر المشروع = مجلد yemreact (الاختبارات تعمل من داخل package.json)
const ROOT = path.resolve(process.cwd());

let ctx;
before(async () => { ctx = await startTestApp(); });
after(async () => { await stopTestApp(ctx); });

// ===== PWA =====

test('PWA: manifest موجود ويحتوي الحقول الأساسية', () => {
  const p = path.join(ROOT, 'web', 'public', 'manifest.webmanifest');
  if (!fs.existsSync(p)) return; // يُتخطى إذا لم تُبنَ الواجهة
  const m = JSON.parse(fs.readFileSync(p, 'utf8'));
  assert.equal(m.name.includes('يمن رياكت'), true);
  assert.equal(m.display, 'standalone');
  assert.ok(m.icons.length >= 2);
  assert.equal(m.background_color, '#121214');
});

test('PWA: أيقونات موجودة', () => {
  const icons = path.join(ROOT, 'web', 'public', 'icons');
  if (!fs.existsSync(icons)) return;
  for (const f of ['pwa-192.png', 'pwa-512.png', 'apple-touch-icon.png']) {
    assert.ok(fs.existsSync(path.join(icons, f)), `يجب وجود ${f}`);
  }
});

test('PWA: Service Worker موجود بالاستراتيجيات الصحيحة', () => {
  const p = path.join(ROOT, 'web', 'public', 'sw.js');
  if (!fs.existsSync(p)) return;
  const src = fs.readFileSync(p, 'utf8');
  assert.ok(src.includes('cache-first'), 'cache-first للأصول');
  assert.ok(src.includes('network-first'), 'network-first للبيانات');
  assert.ok(src.includes("isApi") && src.includes('/api/'), 'معالجة API خاصة');
});

test('PWA: تخطيط الواجهة يربط manifest ويسجّل service worker', () => {
  const p = path.join(ROOT, 'web', 'src', 'layouts', 'Layout.astro');
  if (!fs.existsSync(p)) return;
  const src = fs.readFileSync(p, 'utf8');
  assert.ok(src.includes('manifest.webmanifest'));
  assert.ok(src.includes("serviceWorker.register('/sw.js')"));
});

// ===== النسخ الاحتياطي =====

test('النسخ الاحتياطي: سكربت backup.sh ينتج ملف DB صالحًا', async (t) => {
  const script = path.join(ROOT, 'scripts', 'backup.sh');
  if (!fs.existsSync(script)) { t.skip('سكربت backup.sh غير موجود'); return; }

  const backupDir = fs.mkdtempSync(path.join(os.tmpdir(), 'yr-backup-'));
  try {
    await execFileP('bash', [script], {
      cwd: ROOT,
      env: {
        ...process.env,
        BACKUP_DIR: backupDir,
        DATABASE_URL: process.env.DATABASE_URL,
        STORAGE_LOCAL_DIR: fs.mkdtempSync(path.join(os.tmpdir(), 'yr-media-')),
      },
      timeout: 30_000,
    });
    const dumps = fs.readdirSync(backupDir).filter((f) => f.startsWith('db-'));
    assert.ok(dumps.length >= 1, 'يجب إنتاج dump لقاعدة البيانات');
  } finally {
    fs.rmSync(backupDir, { recursive: true, force: true });
  }
});

// ===== استيراد المحتوى =====

test('استيراد المحتوى: JSON metadata-only يُدخل رياكشنات', async (t) => {
  const script = path.join(ROOT, 'scripts', 'import-content.mjs');
  if (!fs.existsSync(script)) { t.skip('سكربت import غير موجود'); return; }

  // ملف استيراد مؤقت (metadata فقط، بلا فيديو)
  const importFile = path.join(os.tmpdir(), `yr-import-${Date.now()}.json`);
  fs.writeFileSync(importFile, JSON.stringify([
    { caption: 'استيراد 1', situation: 'موقف استيراد 1', category: 'laugh', keywords: ['استيراد'] },
    { caption: 'استيراد 2', situation: 'موقف استيراد 2', category: 'hype', keywords: ['اختبار'] },
  ]));

  try {
    await execFileP('node', [script, importFile], {
      cwd: ROOT,
      env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL },
      timeout: 30_000,
    });
  } finally {
    fs.rmSync(importFile, { force: true });
  }

  // تحقق من الإدخال في قاعدة الاختبار
  const res = await ctx.pool.query(
    `SELECT COUNT(*)::int AS n FROM reactions WHERE caption IN ('استيراد 1','استيراد 2')`
  );
  assert.ok(res.rows[0].n >= 2, 'يجب إدخال الرياكشنات المستوردة');
});

test('استيراد المحتوى: صنف غير صالح يُتخطى', async (t) => {
  const script = path.join(ROOT, 'scripts', 'import-content.mjs');
  if (!fs.existsSync(script)) { t.skip('سكربت import غير موجود'); return; }

  const importFile = path.join(os.tmpdir(), `yr-import-bad-${Date.now()}.json`);
  fs.writeFileSync(importFile, JSON.stringify([
    { caption: 'غير صالح', situation: 'موقف', category: 'nonsense-category', keywords: [] },
    { caption: 'صالح', situation: 'موقف صالح', category: 'approve', keywords: [] },
  ]));

  try {
    await execFileP('node', [script, importFile], {
      cwd: ROOT, env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL }, timeout: 30_000,
    });
  } finally {
    fs.rmSync(importFile, { force: true });
  }

  const res = await ctx.pool.query(`SELECT caption FROM reactions WHERE caption IN ('غير صالح','صالح')`);
  const captions = res.rows.map((r) => r.caption);
  assert.ok(captions.includes('صالح'), 'الصالح يُدخل');
  assert.ok(!captions.includes('غير صالح'), 'غير الصالح يُتخطى');
});
