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
// Helper para obter URL absoluta de index.html no escopo do SW
const INDEX_URL = new URL('./index.html', self.registration.scope).href;

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Navegação HTML: usa network-first com fallback para index.html do cache
  const accept = req.headers.get('accept') || '';
  const isNavigate = req.mode === 'navigate' || accept.includes('text/html');
  if (isNavigate) {
    event.respondWith(
      fetch(req).then((res) => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
        }
        return res;
      }).catch(() => caches.match(INDEX_URL))
    );
    return;
  }

  // Normalização para assets com query (?v=...): tenta sem query no cache
  const isStatic = /\.(css|js|png|jpg|jpeg|webp|svg|csv|json|webmanifest)$/i.test(url.pathname);
  const normalizedUrl = (isStatic && url.search) ? (url.origin + url.pathname) : null;

  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      if (normalizedUrl) {
        return caches.match(normalizedUrl).then((normCached) => {
          if (normCached) return normCached;
          return fetch(req).then((res) => {
            if (res && res.ok) {
              const copy = res.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
            }
            return res;
          });
        });
      }
      return fetch(req).then((res) => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
        }
        return res;
      });
    }).catch(() => normalizedUrl ? caches.match(normalizedUrl) : caches.match(req))
  );
});
