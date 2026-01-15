// Entrypoint único (v30) para o app na raiz
const APP_VERSION = 'v30';
(function bootstrap(){
  try {
    const verEl = document.getElementById('version-label');
    if (verEl) {
      verEl.textContent = APP_VERSION;
      verEl.title = `app ${APP_VERSION}`;
    }
  } catch {}

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', async () => {
      try {
        const reg = await navigator.serviceWorker.register('./sw.v30.js');
        let refreshing = false;
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          if (refreshing) return;
          refreshing = true;
          window.location.reload();
        });
        if (reg.waiting) {
          try { reg.waiting.postMessage({ type: 'SKIP_WAITING' }); } catch {}
        }
      } catch (err) {
        console.error('SW register failed', err);
      }
    });
  }

  const injectApp = () => {
    try {
      const script = document.createElement('script');
      script.src = './app.js';
      script.defer = true;
      document.body.appendChild(script);
    } catch (err) {
      console.error('Failed to load app.js', err);
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectApp, { once: true });
  } else {
    injectApp();
  }
})();
