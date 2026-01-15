const APP_VERSION = 'v30';
const CACHE_NAME = `plano-ul-4s-${APP_VERSION}`;
const PRECACHE_ASSETS = [
  './',
  './index.html',
  './style.css',
  './app.entry.v30.js',
  './app.js',
  './manifest.webmanifest',
  './plano-4-semanas.csv',
  './tecnicas.csv',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon.svg',
  './images/placeholder.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
    ))
  );
  self.clients.claim();
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);
  const accept = request.headers.get('accept') || '';
  const isNavigation = request.mode === 'navigate' || accept.includes('text/html');

  if (isNavigation) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  const isStaticAsset = /\.(?:css|js|png|jpe?g|webp|svg|csv|json|webmanifest)$/i.test(url.pathname);
  if (isStaticAsset) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return response;
        });
      })
    );
    return;
  }

  event.respondWith(fetch(request).catch(() => caches.match(request)));
});
