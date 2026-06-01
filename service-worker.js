/* 日本酒DB — Service Worker
   - 静的アセットを cache-first で配信
   - HTML/JS/JSX は network-first（更新があればすぐ反映）
   - GAS API は常にネットワーク（キャッシュしない）
*/

const VERSION = 'sake-db-v3';
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
  './icons/apple-touch-icon.png',
  './icons/favicon-32.png',
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

  // GAS API / Drive サムネイル は常に network（キャッシュしない）
  if (url.hostname.includes('script.google.com') ||
      url.hostname.includes('googleusercontent.com') ||
      url.hostname.includes('drive.google.com')) {
    return;
  }

  // 外部CDN（fonts, react, babel）はネットワーク優先＋キャッシュフォールバック
  if (url.origin !== self.location.origin) {
    event.respondWith(
      fetch(event.request)
        .then(r => {
          const copy = r.clone();
          caches.open(VERSION).then(c => c.put(event.request, copy)).catch(() => {});
          return r;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // 同一オリジンの HTML/JS/JSX は network-first（更新が即座に反映される）
  if (event.request.mode === 'navigate' ||
      url.pathname.endsWith('.html') ||
      url.pathname.endsWith('.jsx') ||
      url.pathname.endsWith('.js') ||
      url.pathname.endsWith('.webmanifest')) {
    event.respondWith(
      fetch(event.request)
        .then(r => {
          const copy = r.clone();
          caches.open(VERSION).then(c => c.put(event.request, copy)).catch(() => {});
          return r;
        })
        .catch(() => caches.match(event.request).then(r => r || caches.match('./index.html')))
    );
    return;
  }

  // それ以外（画像・CSS等）は cache-first
  event.respondWith(
    caches.match(event.request).then(cached =>
      cached || fetch(event.request).then(r => {
        const copy = r.clone();
        caches.open(VERSION).then(c => c.put(event.request, copy)).catch(() => {});
        return r;
      })
    )
  );
});
