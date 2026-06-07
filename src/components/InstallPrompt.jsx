import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import { useLanguage } from './LanguageContext';

/*
 * InstallPrompt — a top banner that nudges mobile visitors to add CineRooms to
 * their home screen. The PWA itself is already installable (valid manifest +
 * apple meta tags in index.html); this component is purely the *prompt UI*.
 *
 * Three real-world cases are handled separately:
 *   • Android  → fire the native install dialog via the captured
 *                `beforeinstallprompt` event (stashed early in main.jsx).
 *   • iOS Safari → Apple has no install API, so show the manual
 *                Share ➔ "Add to Home Screen" hint.
 *   • iOS but inside an in-app webview (Instagram / FB / LINE / Threads) OR a
 *                non-Safari iOS browser (Chrome/Firefox/Edge) → "Add to Home
 *                Screen" is unavailable there, so tell them to open in Safari
 *                first. This is the common path since most traffic arrives from
 *                the Instagram link.
 */

const DISMISS_KEY = 'cineroom_install_dismissed_until';
const SNOOZE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const REVEAL_DELAY_MS = 2000;

function detectEnv() {
  const ua = navigator.userAgent || '';
  const isStandalone =
    (typeof window.matchMedia === 'function' &&
      window.matchMedia('(display-mode: standalone)').matches) ||
    window.navigator.standalone === true;
  // IG / FB / LINE / Threads / WeChat / Twitter in-app webviews
  const isInApp = /Instagram|FBAN|FBAV|FB_IAB|Line\/|Threads|MicroMessenger|Twitter/i.test(ua);
  // iPadOS 13+ reports a desktop Mac UA, so fall back to touch-point sniffing
  const isIOS =
    /iphone|ipad|ipod/i.test(ua) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isAndroid = /android/i.test(ua);
  // Only real Safari (not CriOS/FxiOS/EdgiOS, not an in-app webview) can A2HS
  const isIOSSafari = isIOS && !/CriOS|FxiOS|EdgiOS/i.test(ua) && !isInApp;
  return { isStandalone, isIOS, isAndroid, isIOSSafari };
}

function isSnoozed() {
  try {
    return Date.now() < Number(localStorage.getItem(DISMISS_KEY) || 0);
  } catch {
    return false;
  }
}

function snooze(ms) {
  try {
    localStorage.setItem(DISMISS_KEY, String(Date.now() + ms));
  } catch {
    /* private mode / storage disabled — just skip persistence */
  }
}

// iOS share glyph (box with an up arrow), used in the Safari hint
function ShareIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M12 3v13" />
      <path d="M8 7l4-4 4 4" />
      <path d="M5 12v7a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-7" />
    </svg>
  );
}

export default function InstallPrompt() {
  const { t } = useLanguage();
  const { pathname } = useLocation();
  const [env] = useState(detectEnv);
  const [deferred, setDeferred] = useState(() => window.__deferredInstallPrompt || null);
  const [ready, setReady] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (env.isStandalone || isSnoozed()) {
      setDismissed(true);
      return;
    }

    // The event may fire after mount; keep listening and re-stash it.
    const onBeforeInstall = (e) => {
      e.preventDefault();
      window.__deferredInstallPrompt = e;
      setDeferred(e);
    };
    // Installed for real → never nag again on this device.
    const onInstalled = () => {
      window.__deferredInstallPrompt = null;
      setDismissed(true);
      snooze(3650 * 24 * 60 * 60 * 1000); // ~10 years
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onInstalled);
    const timer = setTimeout(() => setReady(true), REVEAL_DELAY_MS);

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
      clearTimeout(timer);
    };
  }, [env]);

  // Decide which card (if any) to show.
  const mode = (() => {
    if (dismissed || env.isStandalone) return null;
    if (env.isIOS) return env.isIOSSafari ? 'ios-safari' : 'ios-other';
    if (env.isAndroid && deferred) return 'android';
    return null;
  })();

  // Only on the home feed — on a review page this fixed top banner would cover
  // the back/language buttons and block their taps.
  const show = ready && !!mode && pathname === '/';

  const handleInstall = async () => {
    if (!deferred) return;
    deferred.prompt();
    try {
      await deferred.userChoice;
    } catch {
      /* user dismissed — ignore */
    }
    window.__deferredInstallPrompt = null;
    setDeferred(null);
    setDismissed(true);
  };

  const handleDismiss = () => {
    snooze(SNOOZE_MS);
    setDismissed(true);
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key="install-banner"
          initial={{ y: -120, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -120, opacity: 0 }}
          transition={{ type: 'spring', damping: 26, stiffness: 280 }}
          className="md:hidden fixed top-0 left-0 right-0 z-[120]"
          role="dialog"
          aria-label={t('installTitle')}
        >
          <div
            className="mx-3 rounded-2xl bg-bg-elevated/95 backdrop-blur-xl border border-border-subtle shadow-xl shadow-black/10"
            style={{ marginTop: 'calc(env(safe-area-inset-top, 0px) + 0.75rem)' }}
          >
            <div className="flex items-center gap-3 p-3">
              <img
                src="/icons/icon-192.png"
                alt=""
                aria-hidden="true"
                className="w-11 h-11 rounded-xl flex-shrink-0 border border-border-subtle"
              />

              <div className="min-w-0 flex-1">
                <p className="text-text-primary text-sm font-semibold leading-tight font-google-sans">
                  {t('installTitle')}
                </p>

                {mode === 'android' && (
                  <p className="text-text-muted text-xs mt-0.5 leading-snug">{t('installDesc')}</p>
                )}

                {mode === 'ios-safari' && (
                  <p className="text-text-muted text-xs mt-0.5 leading-snug flex items-center gap-1 flex-wrap">
                    {t('iosInstallHintPre')}
                    <ShareIcon className="w-3.5 h-3.5 inline-block text-text-primary" />
                    {t('iosInstallHintPost')}
                  </p>
                )}

                {mode === 'ios-other' && (
                  <p className="text-text-muted text-xs mt-0.5 leading-snug">{t('openInSafari')}</p>
                )}
              </div>

              {mode === 'android' && (
                <button
                  onClick={handleInstall}
                  className="flex-shrink-0 px-4 py-2 rounded-xl bg-[#FE494A] text-white text-sm font-bold active:scale-95 transition-transform shadow-md shadow-[#FE494A]/25"
                >
                  {t('installBtn')}
                </button>
              )}

              <button
                onClick={handleDismiss}
                aria-label={t('installDismiss')}
                className="flex-shrink-0 w-8 h-8 -mr-1 flex items-center justify-center rounded-lg text-text-dim active:scale-90 transition-transform"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                  strokeLinecap="round" className="w-4 h-4">
                  <line x1="6" y1="6" x2="18" y2="18" />
                  <line x1="18" y1="6" x2="6" y2="18" />
                </svg>
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
