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
