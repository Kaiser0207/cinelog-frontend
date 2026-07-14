import { useState, useEffect, useLayoutEffect, useMemo, useRef, useCallback, memo } from 'react';
import { motion, AnimatePresence, useMotionValue, useMotionTemplate, useTransform, animate } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { TMDB_IMG_BASE, getReviewTotal } from '../utils/constants';
import { getPosterColors, cachedColors, fallbackFor, isDark } from '../utils/posterColors';
import { useCatalogNumbers, formatCatalogNo } from '../utils/catalog';
import './SpineShelf.css';

/**
 * 書脊牆 — the collection as a shelf of cases (A24 blu-ray style).
 *
 * These are REAL 3D boxes, not pictures of boxes: each case is a spine face, a
 * cover face (which is also its thickness, because a case is exactly as deep as its
 * cover is wide) and a top face, assembled in CSS 3D and turned a few degrees so you
 * actually see the depth and the top edge. Perspective lives on each case rather than
 * the row — a shared perspective across a scroller that's thousands of pixels wide
 * would smear the cases at the far ends into nonsense.
 *
 * Click once: the case pulls off the shelf and turns to face you (its poster).
 * Click again: it opens into the review.
 */

const SHELF_H = 'clamp(340px, 62svh, 580px)';
const CASE_W = 'clamp(52px, 12vw, 72px)';
const POSTER_RATIO = 2 / 3;
// Resting Y rotation: brings the right edge forward. Every degree here costs a lot
// more cover than it used to — the box is now as deep as the poster is wide, so the
// cover it swings into view is ~310px of face, not 64px. −8° was showing a 43px band
// of it beside every spine, which reads as a shelf raked much harder than it is.
const TURN = -6;
const TILT = 3;          // resting X rotation: you're looking slightly DOWN at it
// One camera for both the shelf and the pull-out. If they differ, the case is
// projected one way in its slot and another way in your hand, and the hand-off at
// each end of the animation visibly jumps.
const CAMERA = 1200;
const NUDGE = 60;        // how far the cases to the right shuffle over to make room

const clamp = (v, lo, hi) => Math.min(Math.max(v, lo), hi);

// A touchscreen fires pointerenter on tap and then never fires pointerleave until you
// touch something else — so `whileHover` doesn't "hover", it STICKS: tap a case, come
// back from its poster, and it's still leaning out at −10° and still promoted to the
// top of the stack, lying across its neighbours. Hover is a mouse idea. Only give it
// to a mouse.
const CAN_HOVER = typeof window !== 'undefined'
  && window.matchMedia?.('(hover: hover)').matches;

// How lit the poster is on the shelf vs. in your hand. It ANIMATES between the two
// (see PullOut) rather than switching: the same object can't change its exposure in
// a single frame just because you picked it up.
const SHELF_DIM = 0.66;
const HAND_DIM = 1.04;
const filmFilter = (b) =>
  `brightness(${b}) saturate(0.78) contrast(1.16) sepia(0.2) hue-rotate(-4deg)`;

/**
 * THE case's geometry, derived in ONE place from its height.
 *
 * A DVD case is as deep as its cover is wide — spine 14mm, cover 135mm, and that
 * 135mm IS the box's depth. The shelf used to build a 64px-deep box while the
 * pull-out built a ~310px-deep one, so the instant your hand took the case (and again
 * the instant the shelf took it back) it silently swapped for a DIFFERENT object: a
 * 40px band of poster appeared along its edge out of nowhere, or was sliced off. That
 * is the "側邊海報突然被切斷". One geometry, both places, and the hand-off is a
 * non-event because nothing about the case changes.
 */
function caseGeometry(h) {
  const artW = h * POSTER_RATIO;
  const wrapW = clamp(Math.round(artW * 0.07), 8, 24);
  return { artW, wrapW, faceW: artW + wrapW };
}

function useSpineColors(posterPath, seed) {
  const [pair, setPair] = useState(() => cachedColors(posterPath) || null);

  useEffect(() => {
    if (!posterPath) return undefined;
    let cancelled = false;
    getPosterColors(posterPath, seed).then((p) => { if (!cancelled) setPair(p); });
    return () => { cancelled = true; };
  }, [posterPath, seed]);

  return pair || fallbackFor(seed);
}

export default function SpineShelf({ reviews = [], featuredIds }) {
  const navigate = useNavigate();
  // The case being taken off the shelf: { review, el, rect, colors, index }.
  //
  // `el` is the case's PERSPECTIVE WRAPPER, not the button inside it. The button
  // carries the 3D transform (and, on a mouse, the hover lift), and
  // getBoundingClientRect() reports the *transformed* box — so measuring the button
  // handed us a slot that was a few px wide of where the case actually lives, and
  // 18px high whenever you'd hovered it. The wrapper is untransformed: its rect is
  // the true slot on the shelf, which is the thing the case has to go back into.
  //
  // We keep the element itself, not just the rect, so the case can ask the shelf
  // where its slot is NOW when it's time to go back — see PullOut.putBack().
  const [pulled, setPulled] = useState(null);
  // Set once the case is on its way down into its slot — the shelf closes the gap
  // around it from here, instead of waiting for the overlay to unmount and then doing
  // twenty springs in the same frame as the repaint.
  const [settling, setSettling] = useState(false);

  // SHELF_H is a clamp(): only the browser knows what it actually works out to, and
  // the case's whole geometry hangs off it. Measure it once, pre-paint.
  const rulerRef = useRef(null);
  const [caseH, setCaseH] = useState(0);
  useLayoutEffect(() => {
    const el = rulerRef.current;
    if (!el) return undefined;
    const read = () => setCaseH(el.getBoundingClientRect().height);
    read();
    const ro = new ResizeObserver(read);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Memoised: a fresh object every render would break every Case's memo().
  const geom = useMemo(() => caseGeometry(caseH), [caseH]);

  // 館藏編號. Global — a film's number is its place in the whole collection, not its
  // place in whatever the shelf happens to be filtered down to right now.
  const catalog = useCatalogNumbers();

  const pull = useCallback((review, el, colors, index) => {
    setSettling(false);
    setPulled({ review, el, rect: el.getBoundingClientRect(), colors, index });
  }, []);

  if (reviews.length === 0) return null;

  return (
    <>
      {/*
        Full-bleed: the shelf breaks out of <main>'s max-width and runs edge to edge,
        so cases are cut off by both sides of the screen and the row reads as a shelf
        that carries on past the frame — not a widget with margins. (w-screen +
        left-1/2 + -ml-50vw is the standard escape hatch from a centred container;
        <body> is overflow-x: clip, so nothing gains a horizontal scrollbar from it.)

        The negative top margin pulls it up under the controls row for a bigger peek.
        Safe only because that row carries `relative z-20` — otherwise this would sit
        on top of it and eat every tap on the view buttons.

        z-0 matters more than it looks: each case carries `zIndex: depthOrder`, which
        runs to 100+ on a full shelf. Without a stacking context of its own here, those
        z-indexes compete in the PAGE's context — where they beat the controls row's
        z-20 outright, and the shelf paints straight over the sort dropdown. z-0 seals
        them inside, so the whole shelf ranks as one layer below the controls.
      */}
      <div className="relative z-0 -mt-[3vh] w-screen left-1/2 -ml-[50vw]">
        {/* the ruler — nothing to look at, it just tells us what clamp() decided */}
        <span
          ref={rulerRef}
          aria-hidden="true"
          className="absolute left-0 top-0 w-0 opacity-0 pointer-events-none"
          style={{ height: SHELF_H }}
        />

        <div
          className="flex items-end gap-[7px] overflow-x-auto overflow-y-hidden scrollbar-none pl-10 pt-10"
          style={{ height: `calc(${SHELF_H} + 3rem)` }}
        >
          {reviews.map((review, i) => (
            <Case
              key={review.id}
              review={review}
              seed={i}
              geom={geom}
              // Paint LEFT-under-RIGHT. Now that a case is as deep as its cover is
              // wide, its cover recedes ~40px to the right — straight through where
              // the next case's spine is standing. On a packed shelf the next case
              // WINS that overlap: you see its spine, and only a glimpse of its
              // neighbour's cover in the gap between them. Painting left-over-right
              // (what we did when the box was a thin 64px) had every case's cover
              // slapped across the front of the one beside it.
              depthOrder={i + 1}
              isFeatured={!!featuredIds?.has(review.id)}
              catalogNo={formatCatalogNo(catalog?.get(review.id))}
              // Everything to the RIGHT of the case in your hand shuffles over to
              // make room, and closes back up once it's slotted in. A shelf where
              // the neighbours don't move is a shelf of pictures, not of objects.
              nudged={pulled != null && !settling && i > pulled.index}
              // While it's in your hand it is NOT also on the shelf.
              held={pulled != null && i === pulled.index}
              onPull={pull}
            />
          ))}
          {/* Trailing gutter as a real element, not padding-right: a horizontal flex
              scroller drops its end padding in several engines, and the last case
              ends up flush against the edge no matter what you set. */}
          <div className="shrink-0 w-10" aria-hidden="true" />
        </div>

        {/* The cases just sit on a soft contact shadow. The grey bar that used to
            be here read as a scrollbar, which is the last thing it should look like. */}
        <div className="h-5 -mt-1 bg-[radial-gradient(ellipse_at_top,rgba(26,26,26,0.20),transparent_70%)]" />
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
            geom={geom}
            isFeatured={!!featuredIds?.has(pulled.review.id)}
            catalogNo={formatCatalogNo(catalog?.get(pulled.review.id))}
            // Ask the shelf where the slot is when it's time to go back, rather than
            // trusting a rect we measured a rotation ago.
            getHome={() => (pulled.el?.isConnected ? pulled.el.getBoundingClientRect() : pulled.rect)}
            colors={pulled.colors}
            onOpen={() => navigate(`/review/${pulled.review.id}`, { state: { review: pulled.review } })}
            onSettling={() => setSettling(true)}
            onClose={() => { setPulled(null); setSettling(false); }}
          />
        )}
      </AnimatePresence>
    </>
  );
}


// Shared by the spine and by the band that wraps round onto the cover — they have
// to line up to the pixel, because on a real case they're the same printed strip.
// Proportions, not pixels: the two panels together own the bottom 35% of the spine,
// whatever the shelf's height works out to. A fixed px block would swallow a short
// spine and look like a stripe on a tall one.
const PANEL_H = '25%';   // white panel (the barcode's slot) — carries the score
const FOOT_H = '10%';    // colour block at the very foot

/** Every non-printed face of the case — top, underside, open edge. A cool, misty
 *  white-grey, and nearly solid: these are the cut edge of a stack of paper behind
 *  clear plastic, not a piece of gauze. */
const EDGE_WHITE = 'linear-gradient(180deg, rgba(247,247,245,0.95), rgba(214,214,212,0.92))';

/**
 * The strip that wraps round the hinge onto the cover. A case is ONE printed sheet
 * folded over, so whatever is at the spine's edge keeps going: the body colour, the
 * white panel and the foot block all continue across the fold at the same heights.
 * Wrapping only the body colour (what I did first) is the giveaway that it's two
 * separate pieces of art rather than one object.
 */
function WrapBand({ body, foot, total, width }) {
  return (
    <span className="absolute inset-y-0 left-0 flex flex-col" style={{ width }}>
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
 * hand are literally the same object. Same type size, same 精選 mark, same score, in
 * both: the spine faces you square-on at the moment of the hand-off, so ANY
 * difference between them is a pop you can see.
 *
 * Foot of the spine, bottom-up: a colour block, then a white block above it. That's
 * the real layout of a case — the barcode panel sits above the format block, and the
 * barcode panel is the taller of the two — and both of them earn their keep:
 *
 *   white panel  →  the score, a hairline rule, the year. A spec sheet.
 *   colour block →  the 館藏編號, Criterion-style.
 */
function SpineFace({ review, body, foot, total, isFeatured, catalogNo }) {
  const year = review.release_date ? String(review.release_date).slice(0, 4) : null;

  return (
    <span
      className="absolute inset-0 flex flex-col items-center case-face overflow-hidden shadow-[-3px_2px_10px_rgba(0,0,0,0.28)]"
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
          fontSize: 'clamp(14px, 3.4vw, 19px)',
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
          className="relative w-full flex flex-col items-center justify-center gap-[3px] bg-[#F5F1E6] text-[#1A1A1A] shrink-0"
          style={{ height: PANEL_H }}
        >
          <span className="absolute inset-0 spine-weave pointer-events-none" />
          <span className="relative text-[17px] font-black tabular-nums leading-none">
            {total.toFixed(1)}
          </span>
          {year && (
            <>
              {/* the rule is what makes the pair read as a spec sheet rather than as
                  two numbers that happen to be stacked */}
              <span className="relative w-4 h-px bg-[#1A1A1A]/25" />
              <span className="relative text-[9px] font-bold tabular-nums tracking-[0.08em] leading-none text-[#1A1A1A]/55">
                {year}
              </span>
            </>
          )}
        </span>
      )}

      {/* colour block at the very foot — the catalogue number lives here. Criterion
          puts its spine number in exactly this block, and it's what turns a row of
          cases into a COLLECTION: you can see at a glance that you own №1 through
          №30, and that they're in order. */}
      <span
        className="relative w-full shrink-0 flex items-center justify-center gap-[2px]"
        style={{
          height: FOOT_H,
          background: foot,
          // The foot colour is picked off the poster, so it can come back anything
          // from near-black to pale cream. Ask it which ink it needs.
          color: isDark(foot) ? 'rgba(255,255,255,0.92)' : 'rgba(26,26,26,0.82)',
        }}
      >
        <span className="absolute inset-0 spine-weave pointer-events-none" />
        {catalogNo && (
          <>
            <span className="relative text-[8px] font-bold leading-none opacity-55">№</span>
            <span className="relative text-[12px] font-black tabular-nums tracking-[0.04em] leading-none">
              {catalogNo}
            </span>
          </>
        )}
      </span>
    </span>
  );
}

/**
 * The two faces the box was missing: its underside, and the open edge opposite the
 * spine. Without them, tilt the case and you look straight through a hollow shell.
 *
 * Both are the paper edge, not the printed sheet — milky white, softly blurred.
 * That's what the cut edge of a stack of paper actually looks like, and it's also
 * what stops the case reading as an infinitely thin box.
 */
function PaperEdges({ depth, opacity = 1, hit = true }) {
  const off = hit ? '' : 'pointer-events-none';
  return (
    <>
      {/* underside — folds back from the bottom edge */}
      <motion.span
        className={`absolute top-full left-0 w-full block ${off}`}
        style={{
          height: depth,
          opacity,
          transformOrigin: 'center top',
          transform: 'rotateX(-90deg)',
          background: EDGE_WHITE,
          filter: 'blur(0.4px) brightness(0.86)',
        }}
      >
        <span className="absolute inset-0 spine-weave" />
      </motion.span>

      {/* the open edge — the far face of the box, which after the case turns to
          meet you ends up as its right-hand side */}
      <motion.span
        className={`absolute inset-0 block ${off}`}
        style={{
          opacity,
          transform: `translateZ(${-depth}px)`,
          background: EDGE_WHITE,
          filter: 'blur(0.5px)',
        }}
      >
        <span className="absolute inset-0 spine-weave" />
      </motion.span>
    </>
  );
}

/**
 * The front cover: a wrap band, then the poster.
 *
 * `width` is the ART's width. The face is drawn wider than that, by exactly the
 * band — because the band lives BESIDE the artwork, not over it. Sizing the face
 * to the poster and then insetting the art (what I did before) silently squeezed
 * every poster into a narrower box, and `bg-cover` cropped the difference off the
 * sides. That crop is the "海報被遮到" you kept seeing: the band was never on top
 * of the art, it was eating the art's width.
 *
 * `artFilter` may be a plain string (the shelf) or a MotionValue (the pull-out,
 * where the exposure travels with the case instead of switching in one frame).
 *
 * `detail` is the opacity of the grain / vignette / weave layers, and 0 means DON'T
 * BUILD THEM. On the shelf this face is ~310px of poster foreshortened into a 30px
 * band, so none of that detail is resolvable — but it was still costing three
 * full-size composited layers per case, two of them mix-blend-mode: overlay, thirty
 * times over. That's what the tap was fighting. In your hand the face is 300px of
 * poster staring straight at you and every one of those layers earns its keep, so the
 * pull-out fades them in (a MotionValue) rather than switching them on.
 */
function CoverFace({
  art,
  artFallback,
  body,
  foot,
  total,
  width,
  wrap,
  radius = 'rounded-r-[2px]',
  artFilter,
  detail = null,
  hit = true,
}) {
  // Two bitmaps, stacked as CSS background layers: the big one on top, the shelf's
  // already-cached thumbnail underneath. The w500 is a fresh request the moment you
  // pull a case, and until it lands the cover would otherwise be a blank slab of
  // spine colour — a poster popping in mid-turn is exactly the kind of seam we're
  // here to kill. This way it's the same picture throughout, just sharpening.
  const layers = [art, artFallback].filter(Boolean).map((u) => `url("${u}")`).join(', ');

  return (
    <span
      // On the shelf this face must NOT take clicks. It's turned into the screen,
      // but it still projects a sliver over the case to its right — and that sliver
      // was swallowing taps meant for the next case. In your hand it's the opposite:
      // it has to take the drag.
      className={`absolute top-0 left-full h-full block overflow-hidden case-face ${radius} ${hit ? '' : 'pointer-events-none'}`}
      style={{
        width: width + wrap,
        transformOrigin: 'left center',
        transform: 'rotateY(90deg)',
        backgroundColor: body,
      }}
    >
      {layers && (
        // The film look belongs to the ART, not to the whole face. Filtering the face
        // darkened the wrapped band too, so the spine and its own wrap came out as two
        // different colours — the one thing they can never be.
        <motion.span
          className="absolute inset-y-0 right-0 block bg-cover bg-center"
          style={{ left: wrap, backgroundImage: layers, filter: artFilter }}
        />
      )}

      {/* Grain, vignette and weave. They must stay SIBLINGS of the art, never children
          of one shared opacity wrapper: grain and weave are mix-blend-mode: overlay,
          an opacity < 1 opens a stacking context, and inside one they'd blend against
          the wrapper instead of against the poster. So each carries its own opacity —
          scaled so that "fully faded in" means the value the stylesheet asked for
          (grain 0.38, weave 0.42), not 1. */}
      {detail && (
        <>
          {layers && (
            <>
              <motion.span
                className="absolute inset-y-0 right-0 block film-grain pointer-events-none"
                style={{ left: wrap, opacity: detail.grain }}
              />
              <motion.span
                className="absolute inset-y-0 right-0 block film-vignette pointer-events-none"
                style={{ left: wrap, opacity: detail.vignette }}
              />
            </>
          )}
          {/* the case is ONE printed sheet: the weave runs across the cover too */}
          <motion.span
            className="absolute inset-0 spine-weave pointer-events-none"
            style={{ opacity: detail.weave }}
          />
        </>
      )}

      <WrapBand body={body} foot={foot} total={total} width={wrap} />
      <span className="absolute inset-0 case-bevel pointer-events-none" />
    </span>
  );
}

const Case = memo(function Case({ review, seed, geom, depthOrder, isFeatured, catalogNo, nudged, held, onPull }) {
  const colors = useSpineColors(review.poster_path, seed);
  const [body, foot] = colors;
  const total = getReviewTotal(review);
  // Already fetched for the colour sampling, so it's cached — the cover along the
  // case's edge costs nothing, and at this angle it's foreshortened to ~40px anyway.
  const thumb = review.poster_path ? `${TMDB_IMG_BASE}w92${review.poster_path}` : null;

  return (
    // The shuffle lives on the WRAPPER, not the button: the button's transform is
    // the case's 3D pose (and its hover lift), and the two would fight over it.
    // The wrapper stays untransformed in every other respect, which also keeps it
    // usable as the ruler for measuring the slot.
    <motion.div
      className="case-slot relative shrink-0"
      initial={false}
      animate={{ x: nudged ? NUDGE : 0 }}
      transition={{ type: 'spring', stiffness: 220, damping: 24 }}
      style={{
        // Perspective PER CASE, not on the row: the row is a scroller thousands of
        // pixels wide, and one shared vanishing point would shear the far cases.
        // The value must MATCH the pull-out overlay's, or the case is projected one
        // way on the shelf and another way in your hand — and the hand-off at each
        // end of the animation visibly jumps.
        perspective: CAMERA,
        width: CASE_W,
        height: SHELF_H,
        zIndex: depthOrder,
        // A case in your hand is not also on the shelf. Leaving the shelf copy behind
        // meant that for the last 150ms of the put-back — after the veil has faded —
        // you saw both of them at once, the held one a few percent larger and a few px
        // in front, its poster edge sliding across its own twin's. `visibility` rather
        // than unmounting, so the slot stays open and nothing reflows.
        visibility: held ? 'hidden' : 'visible',
      }}
    >
      <motion.button
        type="button"
        onClick={(e) => onPull(review, e.currentTarget.parentElement, colors, seed)}
        initial={false}
        animate={{ rotateY: TURN, rotateX: TILT, y: 0, z: 0 }}
        // A gentler lean than before, on purpose: the box is now as deep as the poster
        // is wide, so every extra degree of turn swings a lot more cover out over the
        // case beside it. The lift does most of the talking. And on a touchscreen there
        // is no hover at all — see CAN_HOVER.
        whileHover={CAN_HOVER ? { rotateY: -10, rotateX: TILT, y: -20, z: 50 } : undefined}
        whileTap={{ rotateY: -9, y: -8, z: 20 }}
        transition={{ type: 'spring', stiffness: 320, damping: 26 }}
        className="absolute inset-0 border-none bg-transparent p-0 cursor-pointer"
        style={{
          transformStyle: 'preserve-3d',
          // Same hinge the pull-out pivots on. Rotating about the centre here and
          // about the right edge there means the two never line up, however exactly
          // the numbers match — the case would land beside its slot, not in it.
          transformOrigin: 'right center',
        }}
        title={review.title}
      >
        {/* No PaperEdges here. The underside and the far wall are the two faces a
            case on a shelf can never show you: you're looking slightly DOWN at it, so
            the top is toward you and the underside is away; and the far wall's whole
            projection lands exactly where the cover is standing between you and it, so
            the cover occludes it in every frame. Building them anyway cost two more
            310px composited faces per case, each with its own mix-blend-mode layer,
            thirty times over. The pull-out still has them — the moment you turn the
            case they're the first thing you see. */}

        <CoverFace
          art={thumb}
          body={body}
          foot={foot}
          total={total}
          width={geom.artW}
          wrap={geom.wrapW}
          artFilter={filmFilter(SHELF_DIM)}
          detail={null}
          hit={false}
        />

        {/* top face — the edge you look down on.

            Hung from ABOVE the box (bottom-full) and folded back with +90°, not
            hung inside it and folded with −90°. Both land the face in the same
            plane, but the second one leaves its normal pointing DOWN — so from a
            camera that's looking down at the shelf you were seeing the BACK of the
            top face, which is why it read as hollow. This way it faces up.

            Also non-hit: it juts over the case beside it and would steal its taps. */}
        <span
          className="absolute bottom-full left-0 w-full block pointer-events-none rounded-t-[3px]"
          style={{
            height: geom.faceW,
            transformOrigin: 'center bottom',
            transform: 'rotateX(90deg)',
            background: EDGE_WHITE,
            filter: 'blur(0.4px) brightness(0.98)',
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
          catalogNo={catalogNo}
        />
      </motion.button>
    </motion.div>
  );
});

/**
 * Taking the case off the shelf. This is the SAME 3D object as on the shelf — a
 * spine, a cover and a top, built from the same caseGeometry() — not a picture of the
 * poster flying in. Two beats:
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
function PullOut({ review, rect, geom, isFeatured, catalogNo, getHome, colors, onOpen, onSettling, onClose }) {
  const [settled, setSettled] = useState(false);
  const [body, foot] = colors || fallbackFor(0);
  const timers = useRef([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const h = rect.height;
  const spineW = rect.width;
  const { artW, wrapW, faceW } = geom;
  const targetX = window.innerWidth / 2 - faceW / 2 - spineW;
  const targetY = Math.max(16, (window.innerHeight - h) / 2);
  const poster = review.poster_path ? `${TMDB_IMG_BASE}w500${review.poster_path}` : null;
  const thumb = review.poster_path ? `${TMDB_IMG_BASE}w92${review.poster_path}` : null;
  const total = getReviewTotal(review);

  // Driven as motion values (not the `animate` prop) so that once the intro is
  // done, the very same values can be handed over to your finger.
  const x = useMotionValue(rect.left);
  const y = useMotionValue(rect.top);
  const z = useMotionValue(0);
  const rotY = useMotionValue(TURN);
  const rotX = useMotionValue(TILT);
  const veil = useMotionValue(0);
  // The exposure travels with the case. It starts at exactly the shelf's, so the
  // frame where the held case replaces the shelf one is identical, and only then
  // does it come up into the light.
  const dim = useMotionValue(SHELF_DIM);
  const artFilter = useMotionTemplate`brightness(${dim}) saturate(0.78) contrast(1.16) sepia(0.2) hue-rotate(-4deg)`;

  // Grain, vignette and weave don't exist on the shelf's cover — they're unresolvable
  // in a 30px band and they were the shelf's single biggest rendering cost. So they
  // arrive WITH the turn: 0 at the hand-off (identical to the case that was in the
  // slot), full by the time the poster is facing you. Each scaled to the opacity its
  // stylesheet rule asks for.
  const grow = useMotionValue(0);
  const detail = {
    grain: useTransform(grow, (v) => v * 0.38),
    vignette: useTransform(grow, (v) => v),
    weave: useTransform(grow, (v) => v * 0.42),
  };

  useEffect(() => {
    const t = { duration: 1.0, times: [0, 0.36, 1], ease: [0.22, 1, 0.36, 1] };
    const runs = [
      animate(x, [rect.left, rect.left, targetX], t),
      animate(y, [rect.top, rect.top - 28, targetY], t),
      animate(z, [0, 170, 90], t),
      animate(rotY, [TURN, TURN, -90], t),
      animate(rotX, [TILT, TILT, 0], t),
      animate(dim, HAND_DIM, { duration: 0.85, ease: 'easeOut' }),
      animate(grow, 1, { duration: 0.55, delay: 0.3, ease: 'easeOut' }),
      animate(veil, 1, { duration: 0.4 }),
    ];
    let cancelled = false;
    runs[0].then(() => { if (!cancelled) setSettled(true); }).catch(() => {});
    return () => {
      cancelled = true;
      runs.forEach((r) => r.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Putting it BACK on the shelf — the opening run in reverse: turn spine-on, drift
  // back over its slot, then sink into the row.
  //
  // This can't be an AnimatePresence `exit`: position and rotation are motion values
  // we drive by hand, and exit can't take them back off us — it would just fade a
  // case that's still sitting in mid-air. So the component stays mounted, plays the
  // reverse itself, and only then tells the shelf to drop it.
  const closing = useRef(false);
  const putBack = () => {
    if (closing.current) return;
    closing.current = true;
    setSettled(false);
    // Ask the shelf where the slot is NOW, rather than trusting the rect we took a
    // rotation ago. Freezing <body> to stop the page scrolling behind the case takes
    // the scrollbar away on a desktop browser, and that alone shifts the whole
    // centred layout sideways by half a scrollbar — enough for the case to land
    // beside its slot instead of in it.
    const home = getHome?.() || rect;
    const t = { duration: 0.8, times: [0, 0.6, 1], ease: [0.4, 0, 0.2, 1] };

    // Tell the shelf to close the gap while the case is still coming DOWN into it,
    // rather than the instant the overlay unmounts. Two reasons, and they're both
    // real: the frame where the case is handed back was doing everything at once —
    // unmount the overlay, un-hide the case in the slot, repaint the whole un-veiled
    // shelf AND kick off a spring on every one of the twenty-odd cases to the right of
    // it. That's the hitch. And it's the wrong order anyway: a shelf closes AROUND a
    // case as you push it in, not half a second after it's already seated.
    const closeGap = setTimeout(() => onSettling?.(), 430);
    timers.current.push(closeGap);

    animate(veil, 0, { duration: 0.65 });
    animate(dim, SHELF_DIM, { duration: 0.65 });
    animate(grow, 0, { duration: 0.45 });
    animate(x, [x.get(), home.left, home.left], t);
    animate(y, [y.get(), home.top - 28, home.top], t);
    animate(z, [z.get(), 170, 0], t);
    animate(rotX, [rotX.get(), TILT, TILT], t);
    animate(rotY, [rotY.get(), TURN, TURN], t).then(onClose).catch(() => {});
  };

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
    // ±22.5° off face-on, both axes, and a gentle hand: it's a nudge that says
    // "this is an object", not a turntable. Swung much further and you're looking
    // down the length of a slab as deep as the poster is wide — geometrically
    // honest, and it just looks broken.
    rotY.set(clamp(grab.current.ry + dx * 0.16, -112.5, -67.5));
    rotX.set(clamp(grab.current.rx - dy * 0.12, -22.5, 22.5));
  };

  const release = (e) => {
    if (!grab.current || closing.current) return;
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
    <div className="fixed inset-0 z-[300]" onClick={putBack}>
      {/* Opaque enough that the title and the genre pills genuinely go away — at
          55% they were still legible through it, so the case never felt like it had
          the stage to itself.

          NO backdrop-blur. It was asking the GPU to re-blur the entire viewport —
          thirty 3D-transformed cases with mix-blend-mode layers on them — on every
          frame of the fade, at exactly the moment the case is trying to fly. It's the
          same trap the deck fell into. At 95% opaque there is nothing left to see
          through it anyway, so the blur was buying literally nothing. */}
      <motion.div
        className="absolute inset-0 bg-[#12100E]/95"
        style={{ opacity: veil }}
      />

      {/*
        THE CAMERA. It has to travel with the case.

        `perspective` puts the vanishing point at its own box's perspective-origin —
        50% 50% by default. On the shelf that box is the case's own 52px slot, so the
        vanishing point sits at the case's centre and you are looking STRAIGHT AT IT.
        This overlay used to carry the perspective on its full-screen root instead,
        which put the vanishing point at the centre of the SCREEN — so a case whose slot
        is 300px off-centre was being projected from 300px off-axis: sheared, and showing
        far more of its own depth than the shelf ever shows. Same camera distance (1200),
        completely different camera position.

        Invisible while the box was a 64px slab. Impossible to miss now that it's as deep
        as the poster is wide: the case came back looking DEEPER than it left, sat there
        wrong for the last beat of the put-back, and snapped straight the instant the
        overlay handed it back to the shelf.

        So: the perspective lives on a wrapper the exact size of the slot, and x/y move
        THAT. The vanishing point rides along at the case's centre, wherever it goes —
        which is both what the shelf does and, conveniently, what "you're holding it"
        means. Everything 3D (z, the two rotations) stays on the child, whose
        transform-origin is the hinge. Splitting the transform this way is algebraically
        identical to the single-element version — translation commutes with the origin
        shift — so nothing about the motion changes. Only the camera does.
      */}
      <motion.div
        className="absolute"
        style={{ top: 0, left: 0, width: spineW, height: h, x, y, perspective: CAMERA }}
      >
        <motion.div
          className="absolute inset-0 cursor-grab active:cursor-grabbing"
          style={{
            z,
            rotateY: rotY,
            rotateX: rotX,
            transformStyle: 'preserve-3d',
            transformOrigin: 'right center', // the hinge: the spine's right edge
            touchAction: 'none',             // the finger turns the case, not the page
          }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={release}
          onPointerCancel={release}
          onClick={(e) => e.stopPropagation()}
        >
          {/* The underside and the far wall are the two faces the SHELF doesn't build,
              because on a shelf you can never see them. So they arrive with the turn,
              on the same `grow` clock as the grain — which means that at the hand-off,
              in both directions, this case's DOM paints exactly what the case in the
              slot paints. Nothing appears; nothing is taken away. */}
          <PaperEdges depth={faceW} opacity={grow} />

          <CoverFace
            art={poster}
            artFallback={thumb}
            body={body}
            foot={foot}
            total={total}
            width={artW}
            wrap={wrapW}
            artFilter={artFilter}
            detail={detail}
            radius="rounded-r-lg"
          />

          {/* top edge — hung from above and folded back, so its face points UP
              (see the shelf case for why the other way round reads as hollow).
              Same rounding and same brightness as the shelf's: this face is square on
              to you at rest, so any difference between the two IS the pop. */}
          <span
            className="absolute bottom-full left-0 w-full block rounded-t-[3px]"
            style={{
              height: faceW,
              transformOrigin: 'center bottom',
              transform: 'rotateX(90deg)',
              background: EDGE_WHITE,
              filter: 'blur(0.4px) brightness(0.98)',
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
            catalogNo={catalogNo}
          />
        </motion.div>
      </motion.div>

      <AnimatePresence>
        {settled && (
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="absolute inset-x-0 text-center text-white/85 text-sm font-bold pointer-events-none"
            style={{ top: Math.min(targetY + h + 40, window.innerHeight - 30) }}
          >
            拖曳可以轉動 · 再點一次 → 進入影評
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}
