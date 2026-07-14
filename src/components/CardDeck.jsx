import { useRef, useState, useEffect, useCallback, memo } from 'react';
import {
  motion,
  useScroll,
  useTransform,
  useMotionValueEvent,
  useReducedMotion,
} from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { TMDB_IMG_BASE, getReviewTotal } from '../utils/constants';

/**
 * 影評疊卡 — a VERTICAL deck of movie posters you flip through by scrolling.
 *
 * Every transform is driven DIRECTLY off scroll progress (scroll-linked), not by
 * springing to a discrete index — so the front poster slides and fades away
 * exactly as far as you scroll, instead of snapping. Scrolling back up rewinds it.
 *
 * NOTE: relies on `position: sticky`, which silently dies if ANY ancestor has
 * `overflow: hidden` — <body> and the HomePage wrapper use `overflow-x: clip`.
 *
 * Sizing uses svh, NOT dvh. dvh tracks the *live* viewport, which on mobile grows
 * and shrinks as the address bar collapses while you scroll — so a dvh-sized
 * sticky box gets relaid out mid-scroll, every scroll. svh is the stable
 * (bar-visible) height: same look, no layout thrash.
 */

const Y_STEP = 30;            // vertical offset per card behind (fans upward)
const Z_STEP = 90;            // depth pushed back per card
const SCROLL_PER_CARD = 85;   // vh of scrolling to flip one card (bigger = slower)
const DROP = 620;             // how far the passed card falls

const CARD_H = 'clamp(340px, 62svh, 580px)';

// How many cards around the front actually get mounted.
const BEHIND = 2;   // kept mounted while they fall away
const AHEAD = 5;    // beyond this the opacity transform is already 0
const PRELOAD = 4;  // posters fetched past the window so they're warm on mount

const posterUrl = (r) => (r.poster_path ? `${TMDB_IMG_BASE}w500${r.poster_path}` : null);

export default function CardDeck({ reviews = [], featuredIds }) {
  const navigate = useNavigate();
  const sectionRef = useRef(null);
  const [front, setFront] = useState(0);

  const n = reviews.length;
  const last = Math.max(0, n - 1);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start start', 'end end'],
  });

  // Continuous (fractional) index — 3.4 means "40% of the way from card 3 to 4".
  const pos = useTransform(scrollYProgress, [0, 1], [0, last]);

  // Rounded index, used only for click targeting / the counter — never for motion.
  useMotionValueEvent(pos, 'change', (v) => {
    setFront(Math.min(Math.max(Math.round(v), 0), last));
  });

  // Warm the posters just past the mount window. Without this, every card you
  // flip past mounts an <img> that only THEN starts fetching + decoding — a hitch
  // on the exact frame you're scrolling. By the time it mounts it's in cache.
  useEffect(() => {
    for (let i = front; i <= front + AHEAD + PRELOAD && i < n; i++) {
      const url = posterUrl(reviews[i]);
      if (url) {
        const img = new Image();
        img.decoding = 'async';
        img.src = url;
      }
    }
  }, [front, n, reviews]);

  // Stable across renders so the memoised cards don't all re-render whenever the
  // front index ticks over.
  const openReview = useCallback(
    (review) => navigate(`/review/${review.id}`, { state: { review } }),
    [navigate]
  );

  if (n === 0) return null;

  return (
    // The negative top margin only moves where the deck sits IN FLOW — i.e. how
    // much of the front card peeks above the fold before you've scrolled. Once
    // the sticky child pins (top-0) the margin is irrelevant and it's still dead
    // centre, so this buys a bigger peek for free.
    <div
      ref={sectionRef}
      className="relative -mt-[8vh]"
      style={{ height: `${Math.max(n, 2) * SCROLL_PER_CARD}vh` }}
    >
      {/*
        Centred in the viewport once pinned. At rest the deck peeks up from the
        fold instead — that's the invitation to scroll; the header above it slides
        away as you do, and the deck settles dead centre with nothing competing.
      */}
      <div
        className="sticky top-0 flex items-center justify-center"
        style={{ perspective: 1500, height: '100svh' }}
      >
        {/*
          Poster (2:3), sized with clamp() so it adapts to every phone: never
          smaller than 300px, never larger than 520px, otherwise 54% of the
          viewport height. Relative units + clamp(), not per-device breakpoints.
        */}
        <div className="relative aspect-[2/3]" style={{ height: CARD_H }}>
          {/*
            Only the cards you can actually see get mounted. The deck holds the
            WHOLE feed, and every card is a full-bleed TMDB poster stacked in the
            same spot — lazy loading can't save you when all 100 are technically
            on screen. Behind AHEAD the opacity transform has already hit 0.
          */}
          {reviews.map((review, i) => (
            i < front - BEHIND || i > front + AHEAD ? null : (
              <DeckCard
                key={review.id}
                review={review}
                i={i}
                n={n}
                pos={pos}
                isFront={i === front}
                isFeatured={!!featuredIds?.has(review.id)}
                onOpen={openReview}
              />
            )
          ))}

          <div className="absolute -bottom-11 left-1/2 -translate-x-1/2 flex items-center gap-2 whitespace-nowrap text-[#1A1A1A]/50">
            <span className="text-xs font-bold font-[var(--font-jetbrains)] tabular-nums">
              {front + 1} / {n}
            </span>
            <span className="text-xs">↓ 往下滑翻卡</span>
          </div>
        </div>
      </div>
    </div>
  );
}

const DeckCard = memo(function DeckCard({ review, i, n, pos, isFront, isFeatured, onOpen }) {
  const reduce = useReducedMotion();

  // p = this card's position relative to the front. 0 = front, >0 = stacked
  // behind, and 0 → -1 is the card falling away as you scroll one card forward.
  const p = useTransform(pos, (v) => i - v);

  // All mapped continuously off p, so motion tracks the scroll 1:1.
  const y = useTransform(p, [-1, 0, 1, 2, 3, 4], [DROP, 0, -Y_STEP, -2 * Y_STEP, -3 * Y_STEP, -4 * Y_STEP]);
  // Scale + depth only apply to cards BEHIND (p >= 0). useTransform clamps, so a
  // falling card (p < 0) holds scale 1 / z 0 — it drops and fades at full size,
  // no shrinking, no tilt.
  const z = useTransform(p, [0, 1, 2, 3, 4], [0, -Z_STEP, -2 * Z_STEP, -3 * Z_STEP, -4 * Z_STEP]);
  const scale = useTransform(p, [0, 1, 2, 3, 4], [1, 0.95, 0.9, 0.86, 0.82]);
  // Hold opacity most of the fall, then fade near the end — no instant blink-out.
  const opacity = useTransform(p, [-1, -0.4, 0, 3, 4, 5], [0, 0.85, 1, 0.8, 0.4, 0]);
  // A card that's falling away (p < 0) must stay ON TOP of the stack the whole
  // way down. Using abs(p) here made its z-index sink mid-fall, so it snapped
  // behind the deck — that's the "突然跑到最後面" glitch.
  const zIndex = useTransform(p, (v) => (v < 0 ? n + 1 : Math.round(n - v)));

  const poster = posterUrl(review);
  const total = getReviewTotal(review);

  return (
    <motion.div
      className="absolute inset-0 rounded-2xl overflow-hidden shadow-2xl border border-white/10"
      onClick={() => { if (isFront) onOpen(review); }}
      style={{
        y: reduce ? 0 : y,
        z: reduce ? 0 : z,
        scale: reduce ? 1 : scale,
        opacity,
        zIndex,
        transformStyle: 'preserve-3d',
        pointerEvents: isFront ? 'auto' : 'none',
        cursor: isFront ? 'pointer' : 'default',
      }}
    >
      {poster ? (
        <img
          src={poster}
          alt={review.title}
          className="absolute inset-0 w-full h-full object-cover"
          decoding="async"
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-bg-card to-bg-elevated" />
      )}

      {isFeatured && (
        <div className="absolute top-3 left-3 px-2.5 py-1 rounded-lg bg-[#FE494A] text-white text-[10px] font-black uppercase tracking-wider shadow-lg flex items-center gap-1">
          <span>⭐</span>
          <span>精選</span>
        </div>
      )}

      {/* No backdrop-blur here: a backdrop-filter on a transformed, stacked card
          forces the whole deck to re-composite every scroll frame. The badge is
          already near-opaque, so the blur bought nothing. */}
      {total != null && (
        <div className="absolute top-3 right-3 w-12 h-12 rounded-lg flex items-center justify-center border border-white/10 shadow-lg bg-black/75">
          <span className="text-xl font-black tracking-tighter text-[#FE494A]">
            {total.toFixed(1)}
          </span>
        </div>
      )}

      <div className="absolute inset-x-0 bottom-0 pt-14 pb-4 px-4 bg-gradient-to-t from-black/95 via-black/60 to-transparent">
        <h3 className="text-white font-bold font-syne tracking-tight text-xl leading-tight line-clamp-2">
          {review.title}
        </h3>
      </div>
    </motion.div>
  );
});
