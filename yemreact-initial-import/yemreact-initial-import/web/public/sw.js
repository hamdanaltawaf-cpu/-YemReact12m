// ============================================================
// YemReact — Service Worker (PWA)
// ============================================================
// الاستراتيجية:
//   - الأصول الثابتة (CSS/JS/أيقونات/خطوط) → cache-first (تسريع وتقليل الطلبات)
//   - الصفحات والبيانات (/، /r/، /api/) → network-first (لا بيانات قديمة)
//   - الوسائط (/media/) → network-first مع fallback للكاش

const VERSION = 'yemreact-v1';
const STATIC_CACHE = `${VERSION}-static`;
const PAGE_CACHE = `${VERSION}-pages`;
const MEDIA_CACHE = `${VERSION}-media`;

// الأصول الثابتة الأساسية (تُخزَّن عند التثبيت)
const PRECACHE = ['/', '/manifest.webmanifest', '/favicon.svg', '/icons/pwa-192.png', '/icons/pwa-512.png'];

// هل المسار وسائط (فيديو/صور)؟
function isMedia(url) {
  return url.pathname.startsWith('/media/');
}
// هل المسار أصل ثابت (CSS/JS/أيقونات)؟
function isStaticAsset(url) {
  return /\.(css|js|mjs|woff2?|png|webp|svg|ico|webmanifest)$/.test(url.pathname) ||
    url.pathname.startsWith('/_astro/') || url.pathname.startsWith('/icons/');
}
// هل المسار بيانات API؟
function isApi(url) {
  return url.pathname.startsWith('/api/');
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== 'GET') return;

  // API والوسائط: network-first (لا بيانات قديمة)
  if (isApi(url)) {
    event.respondWith(
      fetch(request)
        .catch(() => caches.match(request))
        .then((res) => res || Response.error())
    );
    return;
  }
  if (isMedia(url)) {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const clone = res.clone();
          caches.open(MEDIA_CACHE).then((c) => c.put(request, clone));
          return res;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // الأصول الثابتة: cache-first
  if (isStaticAsset(url)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const fetchPromise = fetch(request).then((res) => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(STATIC_CACHE).then((c) => c.put(request, clone));
          }
          return res;
        });
        return cached || fetchPromise;
      })
    );
    return;
  }

  // الصفحات (تنقل): network-first
  event.respondWith(
    fetch(request)
      .then((res) => {
        if (res.ok && res.headers.get('content-type')?.includes('text/html')) {
          const clone = res.clone();
          caches.open(PAGE_CACHE).then((c) => c.put(request, clone));
        }
        return res;
      })
      .catch(() => caches.match(request).then((c) => c || caches.match('/')))
  );
});
