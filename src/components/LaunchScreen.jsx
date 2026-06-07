import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/*
 * LaunchScreen — an in-app splash shown when CineRooms is opened as an
 * installed PWA (standalone). The native apple-touch-startup-image only shows
 * the icon for the brief moment before React boots and its duration is fixed by
 * iOS; this overlay takes over with the icon + CINEROOMS wordmark and stays
 * until the page has actually loaded (with a floor so the brand moment is
 * always visible, and a ceiling so it can never hang).
 *
 * Gated to standalone so casual visitors reading a shared link in a normal
 * browser tab aren't delayed. Append ?splash to the URL to preview it anywhere.
 */

const MIN_MS = 1600; // floor — the brand moment is always seen this long
const MAX_MS = 5000; // ceiling — never hang if `load` never fires

function shouldShow() {
  if (typeof window === 'undefined') return false;
  const standalone =
    (typeof window.matchMedia === 'function' &&
      window.matchMedia('(display-mode: standalone)').matches) ||
    window.navigator.standalone === true;
  const preview = new URLSearchParams(window.location.search).has('splash');
  return standalone || preview;
}

export default function LaunchScreen() {
  const [show, setShow] = useState(shouldShow);

  useEffect(() => {
    if (!show) return;
    const start = performance.now();
    let done = false;

    const finish = () => {
      if (done) return;
      done = true;
      const wait = Math.max(0, MIN_MS - (performance.now() - start));
      window.setTimeout(() => setShow(false), wait);
    };

    // Hide once everything has loaded — but never before MIN_MS, never after MAX_MS.
    if (document.readyState === 'complete') {
      window.setTimeout(finish, MIN_MS);
    } else {
      window.addEventListener('load', finish, { once: true });
    }
    const cap = window.setTimeout(finish, MAX_MS);

    return () => {
      window.clearTimeout(cap);
      window.removeEventListener('load', finish);
    };
  }, [show]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key="launch"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, ease: 'easeInOut' }}
          className="fixed inset-0 z-[2000] flex items-center justify-center bg-bg-deep"
        >
          {/* Icon centered at exactly 32vmin — same size + position as the native
              iOS splash, with no box/shadow and no entrance animation — so the
              hand-off from the native splash is seamless instead of a visible jump.
              (The icon already carries its own cream background, so a shadow would
              just outline the square.) */}
          <img
            src="/icons/icon-512.png"
            alt=""
            aria-hidden="true"
            className="w-[32vmin] h-[32vmin]"
          />
          {/* Wordmark sits just below the centered icon without shifting it. */}
          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="absolute left-0 right-0 text-center font-nevis text-4xl md:text-5xl tracking-tight text-text-primary"
            style={{ top: 'calc(50% + 19vmin)' }}
          >
            CINEROOMS
          </motion.h1>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
