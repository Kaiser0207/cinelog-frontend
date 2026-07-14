import { useState, useEffect, useRef, useCallback, memo } from 'react';
import { motion, AnimatePresence, useMotionValue, animate } from 'framer-motion';
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

        {/* The cases just sit on a soft contact shadow. The grey bar that used to
            be here read as a scrollbar, which is the last thing it should look like. */}
        <div className="mx-6 h-5 -mt-1 bg-[radial-gradient(ellipse_at_top,rgba(26,26,26,0.20),transparent_70%)]" />
        <p className="mt-2 text-center text-xs text-[#1A1A1A]/45">
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


const clamp = (v, lo, hi) => Math.min(Math.max(v, lo), hi);
const isDark = (c) => lum((c.match(/\d+/g) || [0, 0, 0]).map(Number)) < 0.55;

// Shared by the spine and by the band that wraps round onto the cover — they have
// to line up to the pixel, because on a real case they're the same printed strip.
const PANEL_H = 'clamp(50px, 9vw, 66px)';
const FOOT_H = 'clamp(30px, 5.5vw, 42px)';
const WRAP_W = 'clamp(6px, 7%, 22px)';

/** The paper edge of the case: soft, milky, slightly out of focus. */
const EDGE_WHITE = 'linear-gradient(180deg, #FAF7F0, #DED7C7)';

/**
 * The strip that wraps round the hinge onto the cover. A case is ONE printed sheet
 * folded over, so whatever is at the spine's edge keeps going: the body colour, the
 * white panel and the foot block all continue across the fold at the same heights.
 * Wrapping only the body colour (what I did first) is the giveaway that it's two
 * separate pieces of art rather than one object.
 */
function WrapBand({ body, foot, total }) {
  return (
    <span className="absolute inset-y-0 left-0 flex flex-col" style={{ width: WRAP_W }}>
      <span className="relative flex-1 min-h-0" style={{ background: body }}>
        <span className="absolute inset-0 spine-weave" />
      </span>
      {total != null && (
        <span className="relative w-full shrink-0 bg-[#F5F1E6]" style={{ height: PANEL_H }}>
          <span className="absolute inset-0 spine-weave" />
        </span>
      )}
      <span className="relative w-full shrink-0" style={{ height: FOOT_H, background: foot }}>
        <span className="absolute inset-0 spine-weave" />
      </span>
      {/* the crease, INSIDE the band — it used to spill 6px over the artwork and
          put a dirty shadow down the left of every poster */}
      <span
        className="absolute inset-y-0 right-0 w-[5px]"
        style={{ background: 'linear-gradient(90deg, transparent, rgba(0,0,0,0.32))' }}
      />
    </span>
  );
}

/**
 * The spine artwork — one component, so the case on the shelf and the case in your
 * hand are literally the same object.
 *
 * Foot of the spine, bottom-up: a colour block, then a white block above it. That's
 * the real layout of a case: the barcode panel sits above the format block, and the
 * barcode panel is the taller of the two. The score lives in the white panel.
 */
function SpineFace({ review, body, foot, total, isFeatured, big }) {
  return (
    <span
      className="absolute inset-0 flex flex-col items-center case-face overflow-hidden shadow-[3px_2px_10px_rgba(0,0,0,0.28)]"
      style={{ background: body, color: isDark(body) ? '#FFFFFF' : '#1A1A1A' }}
    >
      <span className="absolute inset-0 spine-weave pointer-events-none" />
      <span className="absolute inset-0 spine-edges pointer-events-none" />
      <span className="absolute inset-0 case-bevel pointer-events-none" />

      {/* Real spines read top-to-bottom, and the title starts AT THE TOP — it isn't
          floated in the middle of the panel. vertical-rl + mixed orientation rotates
          latin and keeps CJK upright, which is exactly the convention.

          The 精選 mark sits after the title in the same run of text, so it reads as
          part of the typesetting rather than a sticker dropped on top. ★ is a text
          glyph (U+2605), not the emoji — an emoji would render as a colour bitmap
          and break the spine's palette. */}
      {/* In vertical-rl the INLINE axis runs top→bottom, so for a row-flex the main
          axis is vertical: justify-start is what pins the title to the top, and
          items-center is what centres it across the spine's width. (Reaching for
          items-start here would shove the text against the spine's right edge.) */}
      <span
        className="relative flex-1 min-h-0 w-full flex items-center justify-start px-1 pt-4 pb-3 font-black tracking-tight"
        style={{
          writingMode: 'vertical-rl',
          textOrientation: 'mixed',
          fontSize: big ? 'clamp(15px, 3.6vw, 21px)' : 'clamp(14px, 3.4vw, 19px)',
          lineHeight: 1.05,
          overflow: 'hidden',
        }}
      >
        {review.title}
        {isFeatured && (
          <span
            className="font-bold tracking-[0.18em] whitespace-nowrap"
            style={{ fontSize: '0.62em', opacity: 0.72, marginInlineStart: '0.9em' }}
          >
            ★ 精選
          </span>
        )}
      </span>

      {/* white panel — the barcode's slot on a real case; here it carries the score.
          It gets its OWN weave: the face-wide texture layer sits *under* these
          panels (they're painted after it), so without this the white and the foot
          block came out as flat digital blocks stuck on a textured spine. */}
      {total != null && (
        <span
          className="relative w-full flex items-center justify-center bg-[#F5F1E6] text-[#1A1A1A] shrink-0"
          style={{ height: PANEL_H }}
        >
          <span className="absolute inset-0 spine-weave pointer-events-none" />
          <span className="relative text-[15px] font-black tabular-nums leading-none">
            {total.toFixed(1)}
          </span>
        </span>
      )}

      {/* colour block at the very foot */}
      <span
        className="relative w-full shrink-0"
        style={{ height: FOOT_H, background: foot }}
      >
        <span className="absolute inset-0 spine-weave pointer-events-none" />
      </span>
    </span>
  );
}

/**
 * The front cover. The wrapped band sits alongside the artwork, never on top of it —
 * the poster gets everything to the right of the fold, uncropped and unshadowed.
 */
/**
 * The two faces the box was missing: its underside, and the open edge opposite the
 * spine. Without them, tilt the case and you look straight through a hollow shell.
 *
 * Both are the paper edge, not the printed sheet — milky white, softly blurred.
 * That's what the cut edge of a stack of paper actually looks like, and it's also
 * what stops the case reading as an infinitely thin box.
 */
function PaperEdges({ depth, hit = true }) {
  const off = hit ? '' : 'pointer-events-none';
  return (
    <>
      {/* underside — folds back from the bottom edge */}
      <span
        className={`absolute top-full left-0 w-full block ${off}`}
        style={{
          height: depth,
          transformOrigin: 'center top',
          transform: 'rotateX(-90deg)',
          background: EDGE_WHITE,
          filter: 'blur(0.4px) brightness(0.86)',
        }}
      >
        <span className="absolute inset-0 spine-weave" />
      </span>

      {/* the open edge — the far face of the box, which after the case turns to
          meet you ends up as its right-hand side */}
      <span
        className={`absolute inset-0 block ${off}`}
        style={{
          transform: `translateZ(${-depth}px)`,
          background: EDGE_WHITE,
          filter: 'blur(0.5px)',
        }}
      >
        <span className="absolute inset-0 spine-weave" />
      </span>
    </>
  );
}

function CoverFace({ art, body, foot, total, width, radius = 'rounded-r-[2px]', dim, hit = true }) {
  return (
    <span
      // On the shelf this face must NOT take clicks. It's turned into the screen,
      // but it still projects a sliver over the case to its right — and since the
      // left cases sit on top in the stack, that sliver was swallowing taps meant
      // for the next case. In your hand it's the opposite: it has to take the drag.
      className={`absolute top-0 left-full h-full block overflow-hidden case-face ${radius} ${hit ? '' : 'pointer-events-none'}`}
      style={{
        width,
        transformOrigin: 'left center',
        transform: 'rotateY(90deg)',
        backgroundColor: body,
      }}
    >
      {art && (
        <>
          {/* The dim belongs to the ART, not to the whole face. Dimming the face
              darkened the wrapped band too, so the spine and its own wrap came out
              as two different colours — which is the one thing they can never be. */}
          <span
            className="absolute inset-y-0 right-0 block bg-cover bg-center film-img"
            style={{
              left: WRAP_W,
              backgroundImage: `url(${art})`,
              filter: dim ? `brightness(${dim}) saturate(0.88) contrast(1.12) sepia(0.16)` : undefined,
            }}
          />
          <span
            className="absolute inset-y-0 right-0 block film-grain pointer-events-none"
            style={{ left: WRAP_W }}
          />
          <span
            className="absolute inset-y-0 right-0 block film-vignette pointer-events-none"
            style={{ left: WRAP_W }}
          />
        </>
      )}

      <WrapBand body={body} foot={foot} total={total} />
      {/* the case is ONE printed sheet: the weave runs across the cover too */}
      <span className="absolute inset-0 spine-weave pointer-events-none" />
      <span className="absolute inset-0 case-bevel pointer-events-none" />
    </span>
  );
}

const Case = memo(function Case({ review, seed, depthOrder, isFeatured, onPull }) {
  const colors = useSpineColors(review.poster_path, seed);
  const [body, foot] = colors;
  const total = getReviewTotal(review);
  // Already fetched for the colour sampling, so it's cached — the sliver of art
  // along the case's edge costs nothing.
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
        <PaperEdges depth={DEPTH} hit={false} />

        <CoverFace
          art={thumb}
          body={body}
          foot={foot}
          total={total}
          width={DEPTH}
          dim={0.66}
          hit={false}
        />

        {/* top face — the edge you look down on. Also non-hit: it juts up over the
            case beside it and would steal that case's taps. */}
        <span
          className="absolute top-0 left-0 w-full block pointer-events-none rounded-t-[3px]"
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

        <SpineFace
          review={review}
          body={body}
          foot={foot}
          total={total}
          isFeatured={isFeatured}
        />
      </motion.button>
    </div>
  );
});

/**
 * Taking the case off the shelf. This is the SAME 3D object as on the shelf — a
 * spine, a cover and a top — not a picture of the poster flying in. Two beats:
 *
 *   1. it floats forward off the shelf (translateZ) and lifts, still spine-on
 *   2. the whole case turns (rotateY → -90°) about the spine's right edge — the
 *      hinge — and the cover swings round into view
 *
 * Then it's YOURS: drag it and it turns under your finger, and springs back when
 * you let go. That's the difference between holding an object and looking at a
 * picture of one.
 *
 * The maths: the box pivots on its right edge, so after the -90° turn the cover
 * occupies the screen from that hinge rightwards by its own width. To land the
 * COVER dead centre, the box has to be parked left of centre by exactly
 * (spine width + half a cover).
 */
function PullOut({ review, rect, colors, onOpen, onClose }) {
  const [settled, setSettled] = useState(false);
  const [body, foot] = colors || FALLBACK[0];

  const h = rect.height;
  const spineW = rect.width;
  const coverW = h * POSTER_RATIO;
  const targetX = window.innerWidth / 2 - coverW / 2 - spineW;
  const targetY = Math.max(16, (window.innerHeight - h) / 2);
  const poster = review.poster_path ? `${TMDB_IMG_BASE}w500${review.poster_path}` : null;
  const total = getReviewTotal(review);

  // Driven as motion values (not the `animate` prop) so that once the intro is
  // done, the very same values can be handed over to your finger.
  const x = useMotionValue(rect.left);
  const y = useMotionValue(rect.top);
  const z = useMotionValue(0);
  const rotY = useMotionValue(TURN);
  const rotX = useMotionValue(TILT);

  useEffect(() => {
    const t = { duration: 1.0, times: [0, 0.36, 1], ease: [0.22, 1, 0.36, 1] };
    const runs = [
      animate(x, [rect.left, rect.left, targetX], t),
      animate(y, [rect.top, rect.top - 28, targetY], t),
      animate(z, [0, 170, 90], t),
      animate(rotY, [TURN, TURN, -90], t),
      animate(rotX, [TILT, TILT, 0], t),
    ];
    let cancelled = false;
    runs[0].then(() => { if (!cancelled) setSettled(true); }).catch(() => {});
    return () => {
      cancelled = true;
      runs.forEach((r) => r.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Freeze the page underneath. Without this the shelf (and the whole feed) keeps
  // scrolling behind the case you're holding — and worse, the pull-out's start
  // rect was measured against a page that's since moved.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  const grab = useRef(null);
  const travelled = useRef(0);

  const onPointerDown = (e) => {
    if (!settled) return;
    e.stopPropagation();
    e.currentTarget.setPointerCapture?.(e.pointerId);
    grab.current = { px: e.clientX, py: e.clientY, ry: rotY.get(), rx: rotX.get() };
    travelled.current = 0;
  };

  const onPointerMove = (e) => {
    if (!grab.current) return;
    const dx = e.clientX - grab.current.px;
    const dy = e.clientY - grab.current.py;
    travelled.current = Math.max(travelled.current, Math.hypot(dx, dy));
    // Tightly bounded, and half as sensitive as before. Turned far enough, the case
    // stops reading as a case: you're looking down the length of a 380px-deep slab,
    // and the honest geometry just looks broken. A ±20° nudge is the whole point —
    // it says "this is an object", it isn't a turntable.
    rotY.set(clamp(grab.current.ry + dx * 0.18, -112, -68));
    rotX.set(clamp(grab.current.rx - dy * 0.14, -13, 13));
  };

  const release = (e) => {
    if (!grab.current) return;
    e.stopPropagation();
    const wasTap = travelled.current < 6;
    grab.current = null;
    if (wasTap) {
      onOpen();
      return;
    }
    const spring = { type: 'spring', stiffness: 130, damping: 15 };
    animate(rotY, -90, spring);
    animate(rotX, 0, spring);
  };

  return (
    <div className="fixed inset-0 z-[300]" style={{ perspective: 1600 }} onClick={onClose}>
      {/* Opaque enough that the title and the genre pills genuinely go away — at
          55% they were still legible through it, so the case never felt like it had
          the stage to itself. */}
      <motion.div
        className="absolute inset-0 bg-[#12100E]/92 backdrop-blur-md"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      />

      <motion.div
        className="absolute cursor-grab active:cursor-grabbing"
        style={{
          top: 0,
          left: 0,
          width: spineW,
          height: h,
          x,
          y,
          z,
          rotateY: rotY,
          rotateX: rotX,
          transformStyle: 'preserve-3d',
          transformOrigin: 'right center', // the hinge: the spine's right edge
          touchAction: 'none',             // the finger turns the case, not the page
        }}
        exit={{ opacity: 0, scale: 0.94 }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={release}
        onPointerCancel={release}
        onClick={(e) => e.stopPropagation()}
      >
        <PaperEdges depth={coverW} />

        <CoverFace
          art={poster}
          body={body}
          foot={foot}
          total={total}
          width={coverW}
          radius="rounded-r-lg"
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

        <SpineFace review={review} body={body} foot={foot} total={total} big />
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
            拖曳可以轉動 · 再點一次 → 進入影評
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}
