const CACHE_NAME = 'plano-ul-4s-v32';
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
  './tecnicas.csv',
  // Exercício imagens (webp + png fallbacks)
  './images/supino-inclinado-maquina.webp',
  './images/supino-inclinado-maquina.png',
  './images/supino-reto-smith.webp',
  './images/supino-reto-smith.png',
  './images/crucifixo-maquina.webp',
  './images/crucifixo-maquina.png',
  './images/pulldown.webp',
  './images/pulldown.png',
  './images/remada-cavalinho-maquina.webp',
  './images/remada-cavalinho-maquina.png',
  './images/puxada-pronada.webp',
  './images/puxada-pronada.png',
  './images/desenvolvimento-maquina.webp',
  './images/desenvolvimento-maquina.png',
  './images/elevacao-lateral-halteres.webp',
  './images/elevacao-lateral-halteres.png',
  './images/rosca-direta.webp',
  './images/rosca-direta.png',
  './images/triceps-frances.webp',
  './images/triceps-frances.png',
  './images/abdutora.webp',
  './images/abdutora.png',
  './images/agachamento-smith.webp',
  './images/agachamento-smith.png',
  './images/leg-press.webp',
  './images/leg-press.png',
  './images/levantamento-terra.webp',
  './images/levantamento-terra.png',
  './images/elevacao-pelvica.webp',
  './images/elevacao-pelvica.png',
  './images/extensora.webp',
  './images/extensora.png',
  './images/flexora-deitado.webp',
  './images/flexora-deitado.png',
  './images/stiff.webp',
  './images/stiff.png',
  './images/puxada-supinada.webp',
  './images/puxada-supinada.png',
  './images/remada-unilateral-halteres.webp',
  './images/remada-unilateral-halteres.png',
  './images/remada-cavalinho-maquina-pronada.webp',
  './images/remada-cavalinho-maquina-pronada.png',
  './images/elevacao-lateral.webp',
  './images/elevacao-lateral.png',
  './images/rosca-scott-maquina.webp',
  './images/rosca-scott-maquina.png',
  './images/triceps-corda.webp',
  './images/triceps-corda.png',
  './images/leg-press-unilateral.webp',
  './images/leg-press-unilateral.png',
  './images/bulgaro.webp',
  './images/bulgaro.png',
  './images/rosca-scott.webp',
  './images/rosca-scott.png'
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

  // Assets estáticos: se tiver query (?v=...), usa network-first para sempre pegar a versão mais nova; caso contrário, cache-first
  const isStatic = /\.(css|js|png|jpg|jpeg|webp|svg|csv|json|webmanifest)$/i.test(url.pathname);
  const hasQuery = Boolean(url.search);
  const normalizedUrl = isStatic ? (url.origin + url.pathname) : null;

  if (isStatic && hasQuery) {
    // Network-first para assets versionados
    event.respondWith(
      fetch(req).then((res) => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
        }
        return res;
      }).catch(async () => {
        // Fallback: versão sem query ou própria requisição
        return (normalizedUrl && await caches.match(normalizedUrl)) || caches.match(req);
      })
    );
    return;
  }

  // Cache-first para demais requisições (inclui imagens sem query e outros estáticos)
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
