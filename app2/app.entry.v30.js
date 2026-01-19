// Entrypoint v30 for app/ subtree — loads full `app.js` so UI bindings initialize
const APP_VERSION = 'v30';
(function bootstrap(){
  try {
    const verElInit = document.getElementById('version-label');
    if (verElInit) { verElInit.textContent = APP_VERSION; verElInit.title = `app ${APP_VERSION}`; }
  } catch {}

  // Register service worker on load (skip if ?no-sw=1)
  const params = new URLSearchParams(window.location.search);
  const skipSW = params.has('no-sw');
  if ('serviceWorker' in navigator && !skipSW) {
    window.addEventListener('load', async () => {
      try {
        const reg = await navigator.serviceWorker.register('./sw.v30.js?v=30');
        // auto-reload when new SW takes control
        let refreshing = false;
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          if (refreshing) return; refreshing = true; window.location.reload();
        });
        if (reg.waiting) {
          try { reg.waiting.postMessage({ type: 'SKIP_WAITING' }); } catch {}
        }
      } catch (e) { console.error(e); }
    });
  }

  // Load the full app script (only after DOM is ready so queries find the elements)
  const injectApp = () => {
    try {
      const s = document.createElement('script');
      // Cache-bust to ensure latest app.js when SW cached older version
      s.src = './app.js?v=30';
      s.defer = true;
      document.body.appendChild(s);
    } catch (e) { console.error(e); }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectApp, { once: true });
  } else {
    injectApp();
  }
})();
