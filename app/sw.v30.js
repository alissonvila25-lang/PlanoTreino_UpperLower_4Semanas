const CACHE_NAME='plano-ul-4s-v30';
const ASSETS=['./index.html','./app.js','./app.entry.v30.js','./plano-4-semanas.csv','./tecnicas.csv','./style.css','./manifest.webmanifest'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE_NAME).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting()));});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE_NAME).map(k=>caches.delete(k)))));self.clients.claim();});
self.addEventListener('fetch',e=>{e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request)));});
const CACHE_NAME = 'plano-ul-4s-v30';
const ASSETS = [
  './index.html',
  './style.css',
  './app.js',
  './manifest.webmanifest',
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
});

// Helper para obter URL absoluta de index.html no escopo do SW
const INDEX_URL = new URL('./index.html', self.registration.scope).href;

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Navegação HTML: network-first com fallback para index.html do cache
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

  // Assets estáticos: network-first quando houver query (?v=...), cache-first caso contrário
  const isStatic = /\.(css|js|png|jpg|jpeg|webp|svg|csv|json|webmanifest)$/i.test(url.pathname);
  const hasQuery = Boolean(url.search);
  const normalizedUrl = isStatic ? (url.origin + url.pathname) : null;

  if (isStatic && hasQuery) {
    event.respondWith(
      fetch(req).then((res) => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
        }
        return res;
      }).catch(async () => {
        return (normalizedUrl && await caches.match(normalizedUrl)) || caches.match(req);
      })
    );
    return;
  }

  // Cache-first para demais estáticos
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((res) => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
        }
        return res;
      });
    }).catch(() => (normalizedUrl ? caches.match(normalizedUrl) : caches.match(req)))
  );
});
