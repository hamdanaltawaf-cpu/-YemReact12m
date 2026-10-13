// ============================================================
// خدمة الملفات الثابتة للواجهة العامة (بناء Astro من web/dist)
// ============================================================
// تُسجَّل أخيرًا لتلتقط كل ما لم تلتقطه مسارات /api و/media.
// تدعم: ملفات مباشرة + مجلدات (index.html) + مسارات بلا امتداد (.html) + 404.html.

import fs from 'node:fs';
import path from 'node:path';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.json': 'application/json; charset=utf-8',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
};

export default async function staticRoutes(app) {
  const distDir = app.config.webDistDir;

  if (!fs.existsSync(distDir)) {
    app.log.warn(
      { distDir },
      '⚠️ مجلد الواجهة غير موجود — ابنِ الواجهة أولًا: npm --prefix web run build'
    );
    return;
  }

  const serveFile = (filePath, reply) => {
    const data = fs.readFileSync(filePath);
    const ext = path.extname(filePath).toLowerCase();
    const mime = MIME[ext] || 'application/octet-stream';
    const cache = ext === '.html' ? 'no-cache' : 'public, max-age=31536000, immutable';
    return reply
      .header('Content-Type', mime)
      .header('Cache-Control', cache)
      .send(data);
  };

  app.get('/*', (request, reply) => {
    let p = request.params['*'] || 'index.html';
    const rawPath = request.url.split('?')[0];
    if (p.endsWith('/')) p += 'index.html';

    const target = path.normalize(path.join(distDir, p));
    // حماية من path traversal
    if (target !== distDir && !target.startsWith(distDir + path.sep)) {
      return reply.code(403).send({ error: { code: 'FORBIDDEN', message: 'مسار ممنوع' } });
    }

    // 3) مجلد → index.html (مع إعادة توجيه للشرطة المائلة لسلامة الروابط النسبية)
    if (fs.existsSync(path.join(target, 'index.html'))) {
      if (!rawPath.endsWith('/')) {
        return reply.redirect(rawPath + '/');
      }
      return serveFile(path.join(target, 'index.html'), reply);
    }

    // 1) ملف مباشر
    if (fs.existsSync(target) && fs.statSync(target).isFile()) {
      return serveFile(target, reply);
    }
    // 2) مسار بلا امتداد → أضف .html (صفحات Astro بصيغة file)
    if (!path.extname(target) && fs.existsSync(target + '.html')) {
      return serveFile(target + '.html', reply);
    }
    // 4) 404
    const notFound = path.join(distDir, '404.html');
    if (fs.existsSync(notFound)) {
      return reply.code(404).header('Content-Type', 'text/html; charset=utf-8').send(fs.readFileSync(notFound));
    }
    return reply.code(404).send({ error: { code: 'NOT_FOUND', message: 'غير موجود' } });
  });
}
