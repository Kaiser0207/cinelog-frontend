import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';

// --- Capture the install prompt as early as possible ---
// Chrome fires `beforeinstallprompt` on its own schedule, often before React
// has mounted. Stash it on window so <InstallPrompt /> can trigger the native
// dialog later instead of losing the event.
window.__deferredInstallPrompt = window.__deferredInstallPrompt || null;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  window.__deferredInstallPrompt = e;
});

// --- Dismiss the bridge launch screen (installed-app only) ---
// It's painted by index.html before React boots; fade it out once the page has
// loaded — a 1.6s floor so the brand moment is seen, a 5s ceiling so it can't hang.
(function dismissLaunchScreen() {
  const el = document.getElementById('launch-screen');
  if (!el) return;
  if (!document.documentElement.classList.contains('pwa-standalone')) {
    el.remove();
    return;
  }
  const start = performance.now();
  let done = false;
  const finish = () => {
    if (done) return;
    done = true;
    const wait = Math.max(0, 1600 - (performance.now() - start));
    window.setTimeout(() => {
      el.classList.add('launch-hide');
      window.setTimeout(() => el.remove(), 550);
    }, wait);
  };
  if (document.readyState === 'complete') window.setTimeout(finish, 1600);
  else window.addEventListener('load', finish, { once: true });
  window.setTimeout(finish, 5000);
})();

// --- Lightweight auto-update (no service worker) ---
// When the app returns to the foreground, check whether a newer build was
// deployed and, if so, reload so you don't have to manually close/reopen.
const runningBuild =
  document.querySelector('script[type="module"][src*="/assets/"]')?.getAttribute('src') || null;

async function checkForUpdate() {
  if (!runningBuild) return;
  try {
    const html = await fetch('/', { cache: 'no-store' }).then((r) => r.text());
    const match = html.match(/\/assets\/index-[-\w]+\.js/);
    if (match && match[0] !== runningBuild) {
      const last = Number(sessionStorage.getItem('cl_reloaded_at') || 0);
      if (Date.now() - last > 10000) {
        sessionStorage.setItem('cl_reloaded_at', String(Date.now()));
        window.location.reload();
      }
    }
  } catch {
    /* offline / fetch failed — ignore */
  }
}

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') checkForUpdate();
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
