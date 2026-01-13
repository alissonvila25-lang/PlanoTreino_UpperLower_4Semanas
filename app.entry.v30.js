// Entrypoint único (v30) dentro de app/ para deploy via subtree
const APP_VERSION = 'v30';
(function bootstrap(){
  try {
    const verElInit = document.getElementById('version-label');
    if (verElInit) { verElInit.textContent = APP_VERSION; verElInit.title = `app ${APP_VERSION}`; }
  } catch {}
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', async () => {
      try {
        const reg = await navigator.serviceWorker.register('./sw.v30.js');
        let refreshing = false;
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          if (refreshing) return; refreshing = true; try { /* opcional */ } catch {}; window.location.reload();
        });
        if (reg.waiting) { try { reg.waiting.postMessage({ type: 'SKIP_WAITING' }); } catch {} }
      } catch (e) { console.error(e); }
    });
  }
  // Carrega o app principal (cache bust)
  try {
    const s = document.createElement('script');
    s.src = './app.js?v=30';
    document.body.appendChild(s);
  } catch (e) { console.error(e); }
})();
