/* 日本酒DB — Service Worker
   - 静的アセットを cache-first で配信
   - HTML/JSX は network-first（更新があればすぐ反映）
   - GAS API は常にネットワーク（キャッシュしない）
*/

const VERSION = 'sake-db-v1';
const STATIC_ASSETS = [
  './',
  './index.html',
  './styles.css',
  './manifest.webmanifest',
  './data.js',
  './api.js',
  './components.jsx',
  './screens-home.jsx',
  './sheets.jsx',
  './detail.jsx',
  './add.jsx',
  './browse.jsx',
  './app.jsx',
  './icons/icon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon-180.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(VERSION).then(cache => cache.addAll(STATIC_ASSETS).catch(() => {}))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // GAS API は常に network
  if (url.hostname.includes('script.google.com')) {
    return;
  }

  // 外部CDN（fonts, react, babel）はネットワーク優先＋キャッシュフォールバック
  if (url.origin !== self.location.origin) {
    event.respondWith(
      fetch(event.request)
        .then(r => {
          const copy = r.clone();
          caches.open(VERSION).then(c => c.put(event.request, copy));
          return r;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // 同一オリジンの HTML/JSX は network-first
  if (event.request.mode === 'navigate' || url.pathname.endsWith('.html') || url.pathname.endsWith('.jsx')) {
    event.respondWith(
      fetch(event.request)
        .then(r => {
          const copy = r.clone();
          caches.open(VERSION).then(c => c.put(event.request, copy));
          return r;
        })
        .catch(() => caches.match(event.request).then(r => r || caches.match('./index.html')))
    );
    return;
  }

  // それ以外は cache-first
  event.respondWith(
    caches.match(event.request).then(cached =>
      cached || fetch(event.request).then(r => {
        const copy = r.clone();
        caches.open(VERSION).then(c => c.put(event.request, copy));
        return r;
      })
    )
  );
});
