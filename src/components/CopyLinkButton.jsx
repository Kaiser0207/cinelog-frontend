import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * 複製連結 — the little round one beside Share to Story.
 *
 * Share to Story makes a PICTURE, which is the thing you post; this is the thing you
 * paste. Deliberately not navigator.share(): the share sheet is two extra taps and then
 * asks you to pick an app, when all you wanted was the URL on the clipboard.
 *
 * The link is built from the review's id rather than read off window.location, so it's
 * the canonical URL even when you got here with a ?from= or a #hash hanging off it.
 */
export default function CopyLinkButton({ review, title = '複製連結' }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef(null);
  useEffect(() => () => clearTimeout(timer.current), []);

  const copy = useCallback(async () => {
    const url = `${window.location.origin}/review/${review.id}`;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        // The Clipboard API needs a secure context, and it isn't there at all in older
        // WebKit. The textarea trick is ugly but it's the only thing that works when it
        // isn't — and a copy button that silently does nothing is worse than ugly.
        const ta = document.createElement('textarea');
        ta.value = url;
        ta.setAttribute('readonly', '');
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      setCopied(true);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 1800);
    } catch (err) {
      console.error('Copy link failed:', err);
      // Last resort: show them the URL so they can copy it by hand.
      window.prompt('複製這個連結：', url);
    }
  }, [review.id]);

  return (
    <button
      type="button"
      onClick={copy}
      title={title}
      aria-label={copied ? '已複製連結' : title}
      className={`group relative shrink-0 w-12 h-12 rounded-full flex items-center justify-center border-none cursor-pointer shadow-sm transition-colors duration-300 active:scale-95 ${
        copied ? 'bg-[#4C9A6A] text-white' : 'bg-[#E8E2D2] text-[#1A1A1A] hover:bg-[#D480C0]'
      }`}
    >
      {/* The two icons cross-fade in place. Swapping the glyph outright reads as the
          button flickering; a check that grows in reads as "done". */}
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={copied ? 'done' : 'link'}
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.6 }}
          transition={{ duration: 0.18 }}
          className="flex"
        >
          {copied ? <CheckIcon /> : <LinkIcon />}
        </motion.span>
      </AnimatePresence>
    </button>
  );
}

const stroke = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
};

function LinkIcon() {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" aria-hidden="true" {...stroke}>
      <path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7" />
      <path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" aria-hidden="true" {...stroke}>
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}
