import { useState, useEffect, useRef, useCallback, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { TMDB_IMG_BASE, getReviewTotal } from '../utils/constants';

/**
 * 書脊牆 — the collection as a shelf of spines (A24 blu-ray style).
 *
 * Why a shelf and not a deck: a deck shows you ONE title at a time, so browsing
 * 100 reviews means 100 flips. A shelf is scanned, not stepped through — and it's
 * horizontal, which sidesteps the "swipe up or down?" problem entirely.
 *
 * Clicking a spine pulls it out of the shelf and turns it to face you: the narrow
 * spine rotates from edge-on (-78°) to flat (0°) while it flies to the centre,
 * which is exactly the motion of taking a case off a shelf. Then it opens the
 * review.
 */

const SHELF_H = 'clamp(340px, 62svh, 580px)';
const POSTER_RATIO = 2 / 3;

// Fallback spine colours when a poster can't be read (CORS, no poster).
const FALLBACK = ['#FE494A', '#D480C0', '#3B4856', '#E8B84B', '#4C9A6A', '#E86A33'];

const colorCache = new Map();

/**
 * Dominant poster colour, so the wall is YOUR collection rather than a set of
 * swatches. Saturation-weighted: a plain average of a movie poster is almost
 * always mud, because posters are mostly dark background.
 */
function useSpineColor(posterPath, seed) {
  const [rgb, setRgb] = useState(() => colorCache.get(posterPath) || null);

  useEffect(() => {
    if (!posterPath) return undefined;
    if (colorCache.has(posterPath)) {
      setRgb(colorCache.get(posterPath));
      return undefined;
    }

    let cancelled = false;
    const img = new Image();
    img.crossOrigin = 'anonymous'; // TMDB serves Access-Control-Allow-Origin: *
    img.src = `${TMDB_IMG_BASE}w92${posterPath}`;
    img.onload = () => {
      try {
        const cv = document.createElement('canvas');
        cv.width = 16;
        cv.height = 24;
        const ctx = cv.getContext('2d', { willReadFrequently: true });
        ctx.drawImage(img, 0, 0, 16, 24);
        const d = ctx.getImageData(0, 0, 16, 24).data;

        let r = 0, g = 0, b = 0, wsum = 0;
        for (let i = 0; i < d.length; i += 4) {
          const R = d[i], G = d[i + 1], B = d[i + 2];
          const mx = Math.max(R, G, B);
          const mn = Math.min(R, G, B);
          const sat = mx === 0 ? 0 : (mx - mn) / mx;
          const w = 0.2 + sat * 1.6; // saturated pixels dominate
          r += R * w; g += G * w; b += B * w; wsum += w;
        }
        const col = [Math.round(r / wsum), Math.round(g / wsum), Math.round(b / wsum)];
        colorCache.set(posterPath, col);
        if (!cancelled) setRgb(col);
      } catch {
        /* tainted canvas — keep the fallback */
      }
    };
    return () => { cancelled = true; };
  }, [posterPath]);

  if (rgb) return `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;
  return FALLBACK[seed % FALLBACK.length];
}

const luminance = (css) => {
  const m = css.match(/\d+/g);
  if (!m) return 0;
  const [r, g, b] = m.map(Number);
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
};

export default function SpineShelf({ reviews = [], featuredIds }) {
  const navigate = useNavigate();
  // The spine being pulled out: { review, rect } — rect is its on-screen box at
  // the moment of the click, which is where the 3D pull-out starts from.
  const [pulling, setPulling] = useState(null);

  const pull = useCallback((review, el) => {
    setPulling({ review, rect: el.getBoundingClientRect() });
  }, []);

  if (reviews.length === 0) return null;

  return (
    <>
      <div className="relative">
        <div
          className="flex items-end gap-[2px] overflow-x-auto overflow-y-hidden scrollbar-none px-5 pt-10"
          style={{ height: `calc(${SHELF_H} + 3rem)` }}
        >
          {reviews.map((review, i) => (
            <Spine
              key={review.id}
              review={review}
              seed={i}
              isFeatured={!!featuredIds?.has(review.id)}
              onPull={pull}
            />
          ))}
        </div>

        {/* The shelf itself — the books need something to stand on. */}
        <div className="mx-5 h-2 rounded-full bg-[#1A1A1A]/15 shadow-[0_6px_16px_rgba(0,0,0,0.12)]" />
        <p className="mt-4 text-center text-xs text-[#1A1A1A]/45">
          ← 左右滑動瀏覽 · 點一片抽出來 →
        </p>
      </div>

      <AnimatePresence>
        {pulling && (
          <PullOut
            key={pulling.review.id}
            review={pulling.review}
            rect={pulling.rect}
            onDone={() => navigate(`/review/${pulling.review.id}`, { state: { review: pulling.review } })}
            onCancel={() => setPulling(null)}
          />
        )}
      </AnimatePresence>
    </>
  );
}

const Spine = memo(function Spine({ review, seed, isFeatured, onPull }) {
  const color = useSpineColor(review.poster_path, seed);
  const dark = luminance(color) < 0.55;
  const ink = dark ? '#FFFFFF' : '#1A1A1A';
  const total = getReviewTotal(review);

  return (
    <motion.button
      type="button"
      onClick={(e) => onPull(review, e.currentTarget)}
      // Lifts out of the shelf on hover, the way a book does when you hook a
      // finger over its spine.
      whileHover={{ y: -14 }}
      whileTap={{ y: -6 }}
      transition={{ type: 'spring', stiffness: 400, damping: 28 }}
      className="relative shrink-0 flex flex-col items-center rounded-[3px] border-none cursor-pointer overflow-hidden shadow-[2px_0_6px_rgba(0,0,0,0.18)]"
      style={{
        width: 'clamp(38px, 9vw, 52px)',
        height: SHELF_H,
        background: color,
        color: ink,
      }}
      title={review.title}
    >
      {isFeatured && (
        <span className="mt-2 text-[11px] leading-none" aria-hidden="true">⭐</span>
      )}

      {/* Real spines read top-to-bottom; vertical-rl + mixed orientation rotates
          latin and keeps CJK upright, which is exactly the convention. */}
      <span
        className="flex-1 min-h-0 flex items-center justify-center px-1 py-3 font-black tracking-tight text-center"
        style={{
          writingMode: 'vertical-rl',
          textOrientation: 'mixed',
          fontSize: 'clamp(11px, 2.6vw, 14px)',
          overflow: 'hidden',
        }}
      >
        {review.title}
      </span>

      {/* The A24-style block at the foot of the spine — here it's the score. */}
      {total != null && (
        <span
          className="w-full py-1.5 text-[10px] font-black tabular-nums"
          style={{
            background: dark ? 'rgba(255,255,255,0.16)' : 'rgba(0,0,0,0.14)',
          }}
        >
          {total.toFixed(1)}
        </span>
      )}
    </motion.button>
  );
});

/**
 * The pull-out. Starts as the spine's exact on-screen box, edge-on (rotateY -78°,
 * hinged on its left edge — the shelf-facing edge), and swings flat while flying
 * to the centre and widening into the full poster. Same object, turned to face you.
 */
function PullOut({ review, rect, onDone, onCancel }) {
  const doneRef = useRef(false);
  const h = rect.height;
  const w = h * POSTER_RATIO;
  const targetX = (window.innerWidth - w) / 2;
  const targetY = Math.max(16, (window.innerHeight - h) / 2);
  const poster = review.poster_path ? `${TMDB_IMG_BASE}w500${review.poster_path}` : null;

  return (
    <div className="fixed inset-0 z-[300]" onClick={onCancel}>
      <motion.div
        className="absolute inset-0 bg-black/45"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      />

      <motion.div
        className="absolute rounded-xl overflow-hidden shadow-2xl"
        style={{
          top: 0,
          left: 0,
          height: h,
          transformPerspective: 1400,
          transformOrigin: 'left center',
        }}
        initial={{ x: rect.left, y: rect.top, width: rect.width, rotateY: -78 }}
        animate={{ x: targetX, y: targetY, width: w, rotateY: 0 }}
        transition={{ duration: 0.62, ease: [0.22, 1, 0.36, 1] }}
        onAnimationComplete={() => {
          if (doneRef.current) return;
          doneRef.current = true;
          onDone();
        }}
      >
        {poster ? (
          <img src={poster} alt={review.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-bg-card" />
        )}
      </motion.div>
    </div>
  );
}
