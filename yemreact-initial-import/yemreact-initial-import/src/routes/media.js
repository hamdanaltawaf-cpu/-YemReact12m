// ============================================================
// خدمة ملفات الوسائط (الفيديوهات والمصغّرات)
// ============================================================
// يقرأ من واجهة التخزين (قرص محلي الآن، R2/S3 لاحقًا عبر CDN).
// يدعم طلبات النطاق (Range/206) لتشغيل الفيديو بالسحب.

const CONTENT_TYPES = {
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
};

function contentTypeFor(key) {
  const ext = key.slice(key.lastIndexOf('.')).toLowerCase();
  return CONTENT_TYPES[ext] || 'application/octet-stream';
}

export default async function mediaRoutes(app) {
  // مسار wildcard: /media/videos/yr-0001.mp4
  app.get('/media/*', async (request, reply) => {
    const key = request.params['*'];
    if (!key || key.includes('..')) {
      return reply.code(400).send({ error: { code: 'BAD_REQUEST', message: 'مسار غير صالح' } });
    }

    const buffer = await app.storage.get(key);
    if (!buffer) {
      return reply.code(404).send({ error: { code: 'NOT_FOUND', message: 'الملف غير موجود' } });
    }

    const type = contentTypeFor(key);
    const total = buffer.length;

    // دعم طلبات النطاق (Range)
    const range = request.headers.range;
    if (range) {
      const m = /bytes=(\d*)-(\d*)/.exec(range);
      if (m) {
        const start = m[1] ? parseInt(m[1], 10) : 0;
        const end = m[2] ? parseInt(m[2], 10) : total - 1;
        if (start < total && end >= start) {
          const chunk = buffer.subarray(start, Math.min(end, total - 1) + 1);
          return reply
            .code(206)
            .header('Content-Type', type)
            .header('Content-Range', `bytes ${start}-${Math.min(end, total - 1)}/${total}`)
            .header('Accept-Ranges', 'bytes')
            .header('Content-Length', chunk.length)
            .send(chunk);
        }
      }
      return reply.code(416).header('Content-Range', `bytes */${total}`).send();
    }

    return reply
      .header('Content-Type', type)
      .header('Content-Length', total)
      .header('Accept-Ranges', 'bytes')
      .header('Cache-Control', 'public, max-age=31536000, immutable')
      .send(buffer);
  });
}
