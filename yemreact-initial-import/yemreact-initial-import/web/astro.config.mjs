// إعدادات Astro — الواجهة العامة (SSG)
import { defineConfig } from 'astro/config';
import preact from '@astrojs/preact';

// عنوان الـ API للبناء (getStaticPaths) — يُقرأ من متغير بيئة أو افتراضي
const apiBase = process.env.PUBLIC_API_BASE || 'http://localhost:4173';

export default defineConfig({
  integrations: [preact()],
  output: 'static',
  // بصيغة file: تُنتج صفحات مسطّحة (r/yr-0001.html) أسهل للتقديم من الخادم
  build: { format: 'file' },
  site: process.env.PUBLIC_SITE_URL || 'http://localhost:4173',
  vite: {
    define: {
      // يُكشف للجزر عند البناء (الجزر تستخدم مسارات نسبية وقت التشغيل)
      'import.meta.env.PUBLIC_API_BASE': JSON.stringify(apiBase),
    },
    server: {
      // في وضع التطوير: تمرير /api و/media إلى خادم Fastify (4173)
      proxy: {
        '/api': { target: 'http://localhost:4173', changeOrigin: false },
        '/media': { target: 'http://localhost:4173', changeOrigin: false },
      },
    },
  },
});
