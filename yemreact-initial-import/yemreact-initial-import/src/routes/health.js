// ============================================================
// فحص الصحة الموسّع — DB + تخزين + معالجة (ffmpeg) + قرص
// ============================================================
import fs from 'node:fs';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileP = promisify(execFile);

export default async function healthRoutes(app) {
  // فحص خفيف (موجود سابقًا — للتوافق)
  app.get('/health', async () => {
    let db = 'ok';
    try { await app.pool.query('SELECT 1'); } catch { db = 'down'; }
    return { ok: db === 'ok', service: 'yemreact', env: app.config.env, db, time: new Date().toISOString() };
  });

  // فحص موسّع (للإنتاج/المراقبة)
  app.get('/api/v1/health', async () => {
    const checks = {};

    // قاعدة البيانات
    try { await app.pool.query('SELECT 1'); checks.db = 'ok'; }
    catch { checks.db = 'down'; }

    // التخزين (قرص محلي)
    try {
      const dir = app.config.storage.localDir;
      fs.accessSync(dir, fs.constants.W_OK);
      checks.storage = 'ok';
    } catch { checks.storage = 'down'; }

    // المعالجة (ffmpeg + القدرات)
    try {
      await execFileP(app.config.media.ffmpegPath, ['-version']);
      const { stdout } = await execFileP(app.config.media.ffmpegPath, ['-hide_banner', '-encoders']);
      const encoders = /libx264/.test(stdout) && /\baac\b/.test(stdout) && /libwebp/.test(stdout);
      checks.ffmpeg = encoders ? 'ok' : 'degraded';
    } catch { checks.ffmpeg = 'down'; }

    // مساحة القرص (ميغابايت متاحة)
    try {
      const { stdout } = await execFileP('df', ['-m', '--output=avail', '/']);
      const avail = parseInt(stdout.trim().split('\n')[1], 10);
      checks.disk = { availableMb: avail, status: avail > 500 ? 'ok' : 'low' };
    } catch { checks.disk = { availableMb: null, status: 'unknown' }; }

    // فحص ملفات الواترمارك
    checks.watermarks = app.watermarks && app.watermarks.tr && fs.existsSync(app.watermarks.tr) ? 'ok' : 'missing';

    const allOk = checks.db === 'ok' && checks.storage === 'ok' && checks.ffmpeg !== 'down';
    return {
      ok: allOk,
      service: 'yemreact',
      env: app.config.env,
      version: '1.0.0',
      checks,
      time: new Date().toISOString(),
    };
  });
}
