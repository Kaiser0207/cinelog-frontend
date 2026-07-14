import { useState, useEffect, useRef, useCallback, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { TMDB_IMG_BASE, getReviewTotal } from '../utils/constants';
import './SpineShelf.css';

/**
 * 書脊牆 — the collection as a shelf of cases (A24 blu-ray style).
 *
 * These are REAL 3D boxes, not pictures of boxes: each case is a spine face, a
 * side face (its thickness) and a top face, assembled in CSS 3D and turned a few
 * degrees so you actually see the depth and the top edge. Perspective lives on
 * each case rather than the row — a shared perspective across a scroller that's
 * thousands of pixels wide would smear the cases at the far ends into nonsense.
 *
 * Click once: the case pulls off the shelf and turns to face you (its poster).
 * Click again: it opens into the review.
 */

const SHELF_H = 'clamp(340px, 62svh, 580px)';
const POSTER_RATIO = 2 / 3;
const DEPTH = 64;   // case thickness, px — how far the side face runs back
const TURN = -13;   // resting Y rotation: brings the right edge forward
const TILT = 5;     // resting X rotation: you're looking slightly DOWN at it

const FALLBACK = [
  ['#FE494A', '#3B4856'], ['#D480C0', '#2E2A33'], ['#3B4856', '#E8B84B'],
  ['#E8B84B', '#1A1A1A'], ['#4C9A6A', '#F0EAD6'], ['#E86A33', '#1A1A1A'],
];

const colorCache = new Map();

const rgbToHsv = (r, g, b) => {
  const mx = Math.max(r, g, b);
  const mn = Math.min(r, g, b);
  const d = mx - mn;
  let h = 0;
  if (d) {
    if (mx === r) h = ((g - b) / d) % 6;
    else if (mx === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return [h, mx === 0 ? 0 : d / mx, mx / 255];
};

const css = ([r, g, b]) => `rgb(${r}, ${g}, ${b})`;
const lum = ([r, g, b]) => (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
const shade = ([r, g, b], f) =>
  [r, g, b].map((v) => Math.round(f > 0 ? v + (255 - v) * f : v * (1 + f)));

/**
 * TWO colours off the poster: the case body, and the block at its foot.
 *
 * Hue-bucketed and saturation-weighted, NOT averaged. A movie poster is mostly
 * dark background — a plain mean of its pixels is always the same brown mud, and
 * every spine on the shelf would come out the same colour. Bucketing by hue finds
 * what the poster is actually *about*, and the second colour is the heaviest
 * bucket that's a genuinely different hue, so the pair reads as a deliberate
 * two-colour scheme rather than two shades of one.
 */
function extractPair(data) {
  const bins = new Map(); // hue bin (30° each) -> { r, g, b, w }
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const [h, s, v] = rgbToHsv(r, g, b);
    if (v < 0.12) continue;                  // near-black carries no hue
    const key = s < 0.16 ? -1 : Math.floor(h / 30);
    const w = 0.15 + s * 1.8;
    const acc = bins.get(key) || { r: 0, g: 0, b: 0, w: 0 };
    acc.r += r * w; acc.g += g * w; acc.b += b * w; acc.w += w;
    bins.set(key, acc);
  }
  if (!bins.size) return null;

  const ranked = [...bins.entries()]
    .sort((a, b) => b[1].w - a[1].w)
    .map(([key, a]) => ({
      key,
      col: [Math.round(a.r / a.w), Math.round(a.g / a.w), Math.round(a.b / a.w)],
    }));

  const primary = ranked[0];
  const other = ranked.find((c) => {
    if (c.key === primary.key) return false;
    if (c.key === -1 || primary.key === -1) return true;
    const d = Math.abs(c.key - primary.key);
    return Math.min(d, 12 - d) >= 2;         // at least 60° away in hue
  });

  // No second hue in the poster (a monochrome one-sheet) — derive the foot block
  // by pushing the primary the other way in lightness, so it still reads as a pair.
  const secondary = other
    ? other.col
    : shade(primary.col, lum(primary.col) > 0.5 ? -0.6 : 0.55);

  return [css(primary.col), css(secondary)];
}

function useSpineColors(posterPath, seed) {
  const [pair, setPair] = useState(() => colorCache.get(posterPath) || null);

  useEffect(() => {
    if (!posterPath) return undefined;
    if (colorCache.has(posterPath)) {
      setPair(colorCache.get(posterPath));
      return undefined;
    }

    let cancelled = false;
    const img = new Image();
    img.crossOrigin = 'anonymous'; // TMDB serves Access-Control-Allow-Origin: *
    img.src = `${TMDB_IMG_BASE}w92${posterPath}`;
    img.onload = () => {
      try {
        const cv = document.createElement('canvas');
        cv.width = 20;
        cv.height = 30;
        const ctx = cv.getContext('2d', { willReadFrequently: true });
        ctx.drawImage(img, 0, 0, 20, 30);
        const found = extractPair(ctx.getImageData(0, 0, 20, 30).data);
        if (found) {
          colorCache.set(posterPath, found);
          if (!cancelled) setPair(found);
        }
      } catch {
        /* tainted canvas — keep the fallback */
      }
    };
    return () => { cancelled = true; };
  }, [posterPath]);

  return pair || FALLBACK[seed % FALLBACK.length];
}

export default function SpineShelf({ reviews = [], featuredIds }) {
  const navigate = useNavigate();
  // The case being taken off the shelf: { review, rect, colors }. rect is its
  // on-screen box at click time — that's where the pull-out starts from.
  const [pulled, setPulled] = useState(null);

  const pull = useCallback((review, el, colors) => {
    setPulled({ review, rect: el.getBoundingClientRect(), colors });
  }, []);

  if (reviews.length === 0) return null;

  return (
    <>
      <div className="relative">
        <div
          className="flex items-end gap-[7px] overflow-x-auto overflow-y-hidden scrollbar-none px-6 pt-14"
          style={{ height: `calc(${SHELF_H} + 4.5rem)` }}
        >
          {reviews.map((review, i) => (
            <Case
              key={review.id}
              review={review}
              seed={i}
              depthOrder={reviews.length - i}
              isFeatured={!!featuredIds?.has(review.id)}
              onPull={pull}
            />
          ))}
        </div>

        {/* The shelf the cases stand on. */}
        <div className="mx-6 h-2 rounded-full bg-[#1A1A1A]/18 shadow-[0_8px_20px_rgba(0,0,0,0.14)]" />
        <p className="mt-4 text-center text-xs text-[#1A1A1A]/45">
          ← 左右滑動瀏覽 · 點一片抽出來 →
        </p>
      </div>

      <AnimatePresence>
        {pulled && (
          <PullOut
            key={pulled.review.id}
            review={pulled.review}
            rect={pulled.rect}
            colors={pulled.colors}
            onOpen={() => navigate(`/review/${pulled.review.id}`, { state: { review: pulled.review } })}
            onClose={() => setPulled(null)}
          />
        )}
      </AnimatePresence>
    </>
  );
}

const Case = memo(function Case({ review, seed, depthOrder, isFeatured, onPull }) {
  const colors = useSpineColors(review.poster_path, seed);
  const [body, foot] = colors;
  const darkBody = lum((body.match(/\d+/g) || [0, 0, 0]).map(Number)) < 0.55;
  const darkFoot = lum((foot.match(/\d+/g) || [0, 0, 0]).map(Number)) < 0.55;
  const total = getReviewTotal(review);
  // Already fetched for the colour sampling, so it's cached — the sliver of art
  // you see along the case's edge costs nothing.
  const thumb = review.poster_path ? `${TMDB_IMG_BASE}w92${review.poster_path}` : null;

  return (
    <div
      className="relative shrink-0"
      style={{
        // Perspective PER CASE, not on the row: the row is a scroller thousands of
        // pixels wide, and one shared vanishing point would shear the far cases.
        perspective: 900,
        width: 'clamp(52px, 12vw, 72px)',
        height: SHELF_H,
        zIndex: depthOrder,
      }}
    >
      <motion.button
        type="button"
        onClick={(e) => onPull(review, e.currentTarget, colors)}
        initial={false}
        animate={{ rotateY: TURN, rotateX: TILT, y: 0, z: 0 }}
        whileHover={{ rotateY: -30, rotateX: TILT, y: -18, z: 40 }}
        whileTap={{ rotateY: -30, y: -8, z: 20 }}
        transition={{ type: 'spring', stiffness: 320, damping: 26 }}
        className="absolute inset-0 border-none bg-transparent p-0 cursor-pointer"
        style={{ transformStyle: 'preserve-3d' }}
        title={review.title}
      >
        {/* ── the front cover: the case's big face, running back from the spine's
             right edge. It IS the poster — this is the face that swings round to
             meet you when you take the case off the shelf. On the shelf you only
             catch its edge, which is exactly right. ── */}
        <span
          className="absolute top-0 left-full h-full block rounded-r-[2px] bg-cover bg-center"
          style={{
            width: DEPTH,
            transformOrigin: 'left center',
            transform: 'rotateY(90deg)',
            backgroundColor: foot,
            backgroundImage: thumb ? `url(${thumb})` : undefined,
            filter: 'brightness(0.66)',
          }}
        >
          <span className="absolute inset-0 spine-weave" />
        </span>

        {/* ── top face: the edge you look down on ── */}
        <span
          className="absolute top-0 left-0 w-full block"
          style={{
            height: DEPTH,
            transformOrigin: 'center top',
            transform: 'rotateX(-90deg)',
            background: `linear-gradient(180deg, ${body}, ${foot})`,
            filter: 'brightness(0.78)',
          }}
        >
          <span className="absolute inset-0 spine-weave" />
        </span>

        {/* ── spine face ── */}
        <span
          className="absolute inset-0 flex flex-col items-center rounded-[3px] overflow-hidden shadow-[3px_2px_10px_rgba(0,0,0,0.28)]"
          style={{ background: body, color: darkBody ? '#FFFFFF' : '#1A1A1A' }}
        >
          <span className="absolute inset-0 spine-weave pointer-events-none" />
          <span className="absolute inset-0 spine-edges pointer-events-none" />

          {isFeatured && (
            <span className="relative mt-2.5 text-[12px] leading-none" aria-hidden="true">⭐</span>
          )}

          {/* Real spines read top-to-bottom. vertical-rl + mixed orientation rotates
              latin and keeps CJK upright — which is exactly the convention. */}
          <span
            className="relative flex-1 min-h-0 flex items-center justify-center px-1 py-3 font-black tracking-tight text-center"
            style={{
              writingMode: 'vertical-rl',
              textOrientation: 'mixed',
              fontSize: 'clamp(14px, 3.4vw, 19px)',
              lineHeight: 1.05,
              overflow: 'hidden',
            }}
          >
            {review.title}
          </span>

          {/* The block at the foot — A24 puts its logo here; you get the score. */}
          {total != null && (
            <span
              className="relative w-full py-2 text-[11px] font-black tabular-nums"
              style={{ background: foot, color: darkFoot ? '#FFFFFF' : '#1A1A1A' }}
            >
              {total.toFixed(1)}
            </span>
          )}
        </span>
      </motion.button>
    </div>
  );
});

/**
 * Taking the case off the shelf. This is the SAME 3D object as on the shelf — a
 * spine, a cover and a top — not a picture of the poster flying in. Two beats:
 *
 *   1. it floats forward off the shelf (translateZ) and lifts, still spine-on
 *   2. the whole case turns (rotateY → -90°) about the spine's right edge, which
 *      is the hinge, and the cover swings round into view
 *
 * That's the motion of your hand: pull it out, then turn it over. It STOPS there —
 * a second tap opens the review, because looking at the cover is the entire point
 * of having taken it off the shelf.
 *
 * The maths: the box pivots on its right edge, so after the -90° turn the cover
 * occupies the screen from that hinge rightwards by its own width. To land the
 * COVER dead centre, the box has to be parked left of centre by exactly
 * (spine width + half a cover).
 */
function PullOut({ review, rect, colors, onOpen, onClose }) {
  const [settled, setSettled] = useState(false);
  const [body, foot] = colors || FALLBACK[0];
  const darkBody = lum((body.match(/\d+/g) || [0, 0, 0]).map(Number)) < 0.55;

  const h = rect.height;
  const spineW = rect.width;
  const coverW = h * POSTER_RATIO;
  const targetX = window.innerWidth / 2 - coverW / 2 - spineW;
  const targetY = Math.max(16, (window.innerHeight - h) / 2);
  const poster = review.poster_path ? `${TMDB_IMG_BASE}w500${review.poster_path}` : null;
  const total = getReviewTotal(review);

  return (
    <div className="fixed inset-0 z-[300]" style={{ perspective: 1600 }} onClick={onClose}>
      <motion.div
        className="absolute inset-0 bg-black/55 backdrop-blur-[2px]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      />

      <motion.div
        className="absolute cursor-pointer"
        style={{
          top: 0,
          left: 0,
          width: spineW,
          height: h,
          transformStyle: 'preserve-3d',
          transformOrigin: 'right center', // the hinge: the spine's right edge
        }}
        initial={{ x: rect.left, y: rect.top, z: 0, rotateY: TURN, rotateX: TILT }}
        animate={{
          x: [rect.left, rect.left, targetX],
          y: [rect.top, rect.top - 28, targetY],
          z: [0, 170, 90],
          rotateY: [TURN, TURN, -90],
          rotateX: [TILT, TILT, 0],
        }}
        exit={{ opacity: 0, scale: 0.94 }}
        transition={{ duration: 1.0, times: [0, 0.36, 1], ease: [0.22, 1, 0.36, 1] }}
        onAnimationComplete={() => setSettled(true)}
        onClick={(e) => { e.stopPropagation(); if (settled) onOpen(); }}
      >
        {/* front cover — the poster, hinged off the spine's right edge */}
        <span
          className="absolute top-0 left-full h-full block rounded-r-lg overflow-hidden shadow-2xl bg-cover bg-center"
          style={{
            width: coverW,
            transformOrigin: 'left center',
            transform: 'rotateY(90deg)',
            backgroundColor: body,
            backgroundImage: poster ? `url(${poster})` : undefined,
          }}
        />

        {/* top edge */}
        <span
          className="absolute top-0 left-0 w-full block"
          style={{
            height: coverW,
            transformOrigin: 'center top',
            transform: 'rotateX(-90deg)',
            background: `linear-gradient(180deg, ${body}, ${foot})`,
            filter: 'brightness(0.8)',
          }}
        >
          <span className="absolute inset-0 spine-weave" />
        </span>

        {/* spine */}
        <span
          className="absolute inset-0 flex flex-col items-center rounded-l-lg overflow-hidden shadow-2xl"
          style={{ background: body, color: darkBody ? '#FFFFFF' : '#1A1A1A' }}
        >
          <span className="absolute inset-0 spine-weave pointer-events-none" />
          <span className="absolute inset-0 spine-edges pointer-events-none" />
          <span
            className="relative flex-1 min-h-0 flex items-center justify-center px-1 py-3 font-black tracking-tight text-center"
            style={{
              writingMode: 'vertical-rl',
              textOrientation: 'mixed',
              fontSize: 'clamp(14px, 3.4vw, 19px)',
              lineHeight: 1.05,
              overflow: 'hidden',
            }}
          >
            {review.title}
          </span>
          {total != null && (
            <span
              className="relative w-full py-2 text-[11px] font-black tabular-nums text-center"
              style={{ background: foot }}
            >
              {total.toFixed(1)}
            </span>
          )}
        </span>
      </motion.div>

      <AnimatePresence>
        {settled && (
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="absolute inset-x-0 text-center text-white/85 text-sm font-bold pointer-events-none"
            style={{ top: Math.min(targetY + h + 16, window.innerHeight - 32) }}
          >
            再點一次 → 進入影評
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}
