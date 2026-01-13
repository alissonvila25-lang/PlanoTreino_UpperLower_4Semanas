const CACHE_NAME = 'plano-ul-4s-v29';
const ASSETS = [
  './index.html',
  './style.css',
  './app.js',
  './manifest.webmanifest',
  './icons/icon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './images/placeholder.svg',
  './plano-4-semanas.csv',
  './tecnicas.csv'
];
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)).then(self.skipWaiting())
  );
});
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))
  );
  self.clients.claim();
  // Notifica clientes que o SW foi ativado (informativo)
  event.waitUntil((async () => {
    try {
      const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      for (const client of all) {
        client.postMessage({ type: 'SW_ACTIVATED', version: CACHE_NAME });
      }
    } catch (e) {}
  })());
});
self.addEventListener('message', (event) => {
  if (event && event.data && event.data.type === 'SKIP_WAITING') {
    // Permite que a página force a ativação do novo SW
    self.skipWaiting();
  }
});
self.addEventListener('fetch', (event) => {
  const req = event.request;
  event.respondWith(
    caches.match(req).then((cached) => cached || fetch(req).then((res) => {
      // Only cache successful responses; avoid caching 404s
      if (res && res.ok) {
        const copy = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
      }
      return res;
    }).catch(() => cached))
  );
});
