import { useCallback, useState } from 'react';
import { getReviewTotal, TMDB_IMG_BASE } from '../utils/constants';
import { getPosterColors, isDark } from '../utils/posterColors';
import { useCatalogNumbers, formatCatalogNo } from '../utils/catalog';

/**
 * Share to Story — a photograph of the film's case.
 *
 * The SAME case that's on the shelf: same proportions, same two poster colours, same
 * printed sheet — the vertical title, the score panel, the 館藏編號 in the foot block —
 * and the same paper. Turned to three-quarters, so you get the spine AND the cover in
 * one picture. The case you post is the case you own.
 *
 * Drawn on a 2D canvas, NOT screenshotted off the DOM. html2canvas (pro or not) has no
 * support for CSS 3D: `perspective`, `preserve-3d` and `rotateY` are simply dropped, so
 * capturing the real 3D case gives you its faces collapsed into a pile of flat
 * rectangles. So the box is projected by hand — and that drops the 246 KB html2canvas
 * chunk entirely.
 */

const W = 1080;
const H = 1920;          // 9:16 — it's a story

/**
 * THE case, from one number — exactly the rule SpineShelf's caseGeometry() follows.
 * A DVD case is as deep as its cover is wide (spine 14mm, cover 135mm, and that 135mm
 * IS the box's depth), so its height fixes the whole box. Same ratios as the shelf, at
 * print scale, which is what makes this read as the same object rather than a diagram
 * of one.
 */
const CASE_H = 940;
const ART_W = CASE_H * (2 / 3);          // the poster: 2:3
const WRAP_W = Math.round(ART_W * 0.07); // the printed band that folds onto the cover
const FACE_W = ART_W + WRAP_W;           // the cover's width — and the box's depth
const SPINE_W = Math.round(CASE_H * 0.135);

// Everything on the spine is sized off the shelf's, whose spine lands ~62 CSS px wide.
// One factor, so the type here is the type there — just bigger.
const S = SPINE_W / 62;

const PANEL_TOP = 0.65;  // white panel starts 65% down (the shelf's PANEL_H: 25%)
const FOOT_TOP = 0.90;   // colour block at the foot (FOOT_H: 10%)

/**
 * THE CAMERA.
 *
 *   TURN — how far the case is turned. It is the one dial worth touching: at −70° the
 *          spine is a 30px sliver you can't read, at −46° the poster is squashed to 73%
 *          of its width. −55° is where both survive.
 *   VY   — the camera's height, ABOVE the top of the case (the case's centre is y=0),
 *          which is what puts its top edge in view and sends the far side of the box
 *          receding up-and-away. You're looking down at an object on a table.
 *   CAM  — camera distance. Gentle: enough that the box's far edge is visibly smaller
 *          than its near one, not so much that a 9:16 card looks fisheyed.
 */
const TURN = -55;
const CAM = 2400;
const VY = -750;
const PIVOT_X = 558;     // lands the projected case's centre on the card's centre
const PIVOT_Y = 660;

const INK = '#1A1A1A';
const RED = '#FE494A';
const PANEL_CREAM = '#F5F1E6';

// The paper's grain has to be the same physical size on the card as on the shelf, where
// a 340px tile prints across a ~373px cover. Anything else and the case reads as a
// different sheet of paper photographed at a different distance.
const PAPER_TILE = Math.round(FACE_W * (340 / 373));

// How much of the paper each face takes, straight from SpineShelf.css: the cover fades
// its weave in to 0.42, `.spine-weave-face` is 0.8, and the white score panel gets a
// whisper (0.2) because multiply bites a near-white block far harder than a dark spine.
const WEAVE_COVER = 0.42;
const WEAVE_FACE = 0.8;
const WEAVE_PANEL = 0.2;
const WEAVE_EDGE = 1;

const loadImage = (src, cors) =>
  new Promise((resolve) => {
    const img = new Image();
    // Opt IN to CORS, never by default. TMDB needs it (its bitmaps get read back off a
    // canvas by the colour sampler, and without it the canvas taints). paper.png must
    // NOT have it: it's same-origin, so the canvas stays clean either way — but the
    // stylesheet already fetches that exact URL as a background-image, which is always
    // no-CORS, and WebKit will hand a cached no-CORS response to a CORS request and then
    // fail the CORS check on it. Ask for it with crossOrigin and the paper just doesn't
    // load, in Safari only. (Same trap that broke the pull-out's poster on w500.)
    if (cors) img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });

const surface = (w, h) => {
  const cv = document.createElement('canvas');
  cv.width = Math.round(w);
  cv.height = Math.round(h);
  return cv;
};

// ───────────────────────── a very small 3D ─────────────────────────

const TC = Math.cos((TURN * Math.PI) / 180);
const TS = Math.sin((TURN * Math.PI) / 180);

/** A point on the case → the point on the card. Origin is the box's centre. */
function project([x, y, z]) {
  const rx = x * TC + z * TS;          // rotateY
  const rz = -x * TS + z * TC;
  const k = CAM / (CAM - rz);          // ...and the perspective divide
  return [PIVOT_X + rx * k, PIVOT_Y + VY + (y - VY) * k];
}

const HW = SPINE_W / 2;
const HH = CASE_H / 2;
const HD = FACE_W / 2;

// Each face's corners in the order its texture's are: (0,0), (w,0), (w,h), (0,h).
// The cover is the box's RIGHT WALL, receding backwards — that's not a quirk of this
// file, it's how the shelf builds it too (a case's cover goes back into the shelf, and
// the pull-out swings it round to face you). Its u=0 edge is the hinge, so the wrap band
// comes out where the fold is.
const SPINE_QUAD = [[-HW, -HH, HD], [HW, -HH, HD], [HW, HH, HD], [-HW, HH, HD]];
const COVER_QUAD = [[HW, -HH, HD], [HW, -HH, -HD], [HW, HH, -HD], [HW, HH, HD]];
const TOP_QUAD = [[-HW, -HH, -HD], [HW, -HH, -HD], [HW, -HH, HD], [-HW, -HH, HD]];

/**
 * Paint a texture onto one of the box's faces.
 *
 * Canvas 2D's transform is affine, and the perspective projection of a rectangle is
 * NOT an affine image of it: hand the whole face to a single setTransform and straight
 * lines bend — the poster shears, and the case stops being a box. So subdivide the face
 * in 3D, where everything still is linear, and project each cell. Small enough cells and
 * the affine each one needs is indistinguishable from the projective map it stands in
 * for. (A one-off export, so ~600 drawImage calls per face costs nothing.)
 *
 * Textures must be OPAQUE. Cells are drawn a pixel over their neighbour so the seams
 * can't show — which with any transparency would double-composite into a visible grid.
 */
function warp(ctx, tex, quad, n = 24) {
  const P = quad.map(project);

  ctx.save();
  ctx.beginPath();
  ctx.moveTo(P[0][0], P[0][1]);
  for (let i = 1; i < 4; i++) ctx.lineTo(P[i][0], P[i][1]);
  ctx.closePath();
  ctx.clip();                       // set before setTransform: a clip is in device space
  ctx.imageSmoothingQuality = 'high';

  const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  // The face is a rectangle in 3D, so bilinear in (u, v) IS its texture parameterisation.
  const at = (u, v) => mix(mix(quad[0], quad[1], u), mix(quad[3], quad[2], u), v);

  const cw = tex.width / n;
  const ch = tex.height / n;

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      const A = project(at(i / n, j / n));
      const B = project(at((i + 1) / n, j / n));
      const C = project(at(i / n, (j + 1) / n));
      const a = (B[0] - A[0]) / cw;
      const b = (B[1] - A[1]) / cw;
      const c = (C[0] - A[0]) / ch;
      const d = (C[1] - A[1]) / ch;
      const sx = i * cw;
      const sy = j * ch;
      ctx.setTransform(a, b, c, d, A[0] - a * sx - c * sy, A[1] - b * sx - d * sy);
      const sw = Math.min(cw + 1, tex.width - sx);
      const sh = Math.min(ch + 1, tex.height - sy);
      ctx.drawImage(tex, sx, sy, sw, sh, sx, sy, sw, sh);
    }
  }

  ctx.restore();                    // puts back the transform AND drops the clip
}

// ───────────────────────── the printed sheet ─────────────────────────

function paperTile(paper) {
  if (!paper) return null;
  const t = surface(PAPER_TILE, PAPER_TILE * (paper.height / paper.width));
  const ctx = t.getContext('2d');
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(paper, 0, 0, t.width, t.height);
  return t;
}

/**
 * Press the paper into a face — the CSS `mix-blend-mode: multiply`, on canvas.
 *
 * multiply, not overlay: the scan is near-white, so under overlay all that white would
 * just wash the spine's colour out. Under multiply the white goes transparent
 * (white × colour = colour) and only the fibres darken the art. Which is exactly what
 * "printed on this paper" looks like.
 */
function press(ctx, tile, x, y, w, h, alpha) {
  if (!tile) return;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.globalCompositeOperation = 'multiply';
  ctx.globalAlpha = alpha;
  ctx.fillStyle = ctx.createPattern(tile, 'repeat');
  ctx.fillRect(x, y, w, h);
  ctx.restore();
}

// ───────────────────────── type ─────────────────────────

const face = (size, weight = 900) => `${weight} ${size}px Nevis, "Noto Sans TC", sans-serif`;

// What `text-orientation: mixed` calls upright: CJK, kana, and full-width punctuation.
// Everything else — latin, digits — is rotated as a run.
const UPRIGHT = /[\u2E80-\u9FFF\u3000-\u303F\uF900-\uFAFF\uFF00-\uFFEF]/;

/**
 * The spine's title, set the way the shelf sets it: `writing-mode: vertical-rl` with
 * `text-orientation: mixed`. Chinese stays upright, one character under the next; a run
 * of latin is turned on its side as a WHOLE WORD, not letter by letter — which is the
 * convention, and the reason a real shelf is readable with your head tilted right.
 *
 * Returns the y it finished at, so the 精選 mark can follow in the same run of text.
 */
function verticalText(ctx, text, cx, top, limit, size) {
  ctx.textBaseline = 'middle';
  let y = top;

  const runs = [];
  for (const ch of text) {
    const up = UPRIGHT.test(ch);
    const last = runs[runs.length - 1];
    if (last && last.up === up) last.text += ch;
    else runs.push({ up, text: ch });
  }

  for (const run of runs) {
    if (run.up) {
      for (const ch of run.text) {
        if (y + size > limit) return y;
        ctx.textAlign = 'center';
        ctx.fillText(ch, cx, y + size / 2);
        y += size * 1.05;
      }
    } else {
      const w = ctx.measureText(run.text).width;
      if (y + Math.min(w, size) > limit) return y;
      ctx.save();
      ctx.translate(cx, y);
      ctx.rotate(Math.PI / 2);       // the run lies down; its top faces right
      ctx.textAlign = 'left';
      ctx.fillText(run.text, 0, 0);
      ctx.restore();
      y += w;
    }
  }
  return y;
}

function wrapText(ctx, text, maxWidth, maxLines) {
  const chars = [...text];
  const lines = [];
  let line = '';
  for (const ch of chars) {
    const next = line + ch;
    if (ctx.measureText(next).width > maxWidth && line) {
      lines.push(line);
      line = ch;
      if (lines.length === maxLines) break;
    } else {
      line = next;
    }
  }
  if (lines.length < maxLines && line) lines.push(line);
  if (lines.length === maxLines && chars.length) {
    const joined = lines.join('');
    if (joined.length < chars.length) {
      lines[maxLines - 1] = lines[maxLines - 1].slice(0, -1) + '…';
    }
  }
  return lines;
}

// ───────────────────────── the faces ─────────────────────────

/**
 * The spine: the body colour, the white score panel, the colour block at the foot — and
 * the type. This is the face the shelf is made of, and it was the whole reason the old
 * card looked worse than the shelf did: it drew these three bands and then left them
 * blank, so the case you posted had no title, no score and no number on it.
 */
function spineTexture({ review, body, foot, total, catalogNo, isFeatured, tile }) {
  const cv = surface(SPINE_W, CASE_H);
  const ctx = cv.getContext('2d');
  const year = review.release_date ? String(review.release_date).slice(0, 4) : null;

  const panelY = total != null ? Math.round(CASE_H * PANEL_TOP) : Math.round(CASE_H * FOOT_TOP);
  const footY = Math.round(CASE_H * FOOT_TOP);

  ctx.fillStyle = body;
  ctx.fillRect(0, 0, SPINE_W, CASE_H);
  if (total != null) {
    ctx.fillStyle = PANEL_CREAM;
    ctx.fillRect(0, panelY, SPINE_W, footY - panelY);
  }
  ctx.fillStyle = foot;
  ctx.fillRect(0, footY, SPINE_W, CASE_H - footY);

  // The paper goes on band by band, at each band's own strength — the white panel takes
  // a fraction of what the coloured spine does, or its fibres read as grime.
  press(ctx, tile, 0, 0, SPINE_W, panelY, WEAVE_FACE);
  if (total != null) press(ctx, tile, 0, panelY, SPINE_W, footY - panelY, WEAVE_PANEL);
  press(ctx, tile, 0, footY, SPINE_W, CASE_H - footY, WEAVE_FACE);

  // A lit fold on one edge, shade on the other (.spine-edges), then the bevel — a CSS
  // 3D box meets at a perfect 90°, which is the one thing no folded object ever does.
  ctx.fillStyle = 'rgba(255,255,255,0.22)';
  ctx.fillRect(0, 0, 2 * S, CASE_H);
  ctx.fillStyle = 'rgba(0,0,0,0.28)';
  ctx.fillRect(SPINE_W - 3 * S, 0, 3 * S, CASE_H);

  // ── the title, from the top down ──
  ctx.fillStyle = isDark(body) ? '#FFFFFF' : INK;
  const titleSize = Math.round(17 * S);
  ctx.font = face(titleSize);
  const end = verticalText(ctx, review.title || '', SPINE_W / 2, 16 * S, panelY - 12 * S, titleSize);

  if (isFeatured) {
    ctx.save();
    ctx.globalAlpha = 0.72;
    ctx.font = face(Math.round(titleSize * 0.62));
    verticalText(ctx, '★ 精選', SPINE_W / 2, end + titleSize * 0.9, panelY - 12 * S, Math.round(titleSize * 0.62));
    ctx.restore();
  }

  // ── the white panel: the score, a hairline rule, the year. A spec sheet. ──
  if (total != null) {
    const mid = panelY + (footY - panelY) / 2;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = INK;
    ctx.font = face(Math.round(17 * S));
    ctx.fillText(total.toFixed(1), SPINE_W / 2, year ? mid - 9 * S : mid);
    if (year) {
      ctx.fillStyle = 'rgba(26,26,26,0.25)';
      ctx.fillRect(SPINE_W / 2 - 8 * S, mid + 1 * S, 16 * S, Math.max(1, S));
      ctx.fillStyle = 'rgba(26,26,26,0.55)';
      ctx.font = face(Math.round(9 * S), 700);
      ctx.fillText(year, SPINE_W / 2, mid + 9 * S);
    }
  }

  // ── the foot block: the 館藏編號, Criterion-style ──
  if (catalogNo) {
    const mid = footY + (CASE_H - footY) / 2;
    ctx.fillStyle = isDark(foot) ? 'rgba(255,255,255,0.92)' : 'rgba(26,26,26,0.82)';
    ctx.textAlign = 'left';
    ctx.font = face(Math.round(12 * S));
    const nw = ctx.measureText(catalogNo).width;
    ctx.font = face(Math.round(8 * S), 700);
    const lw = ctx.measureText('№').width;
    const x0 = SPINE_W / 2 - (nw + lw + 2 * S) / 2;
    ctx.save();
    ctx.globalAlpha = 0.55;
    ctx.fillText('№', x0, mid);
    ctx.restore();
    ctx.font = face(Math.round(12 * S));
    ctx.fillText(catalogNo, x0 + lw + 2 * S, mid);
  }

  return cv;
}

/** The cover: the wrap band, then the poster. The band lives BESIDE the artwork, never
 *  over it — sizing the face to the poster and insetting the art is what used to crop
 *  every poster's edge off to make room. */
function coverTexture({ body, foot, total, poster, tile }) {
  const cv = surface(FACE_W, CASE_H);
  const ctx = cv.getContext('2d');

  ctx.fillStyle = body;
  ctx.fillRect(0, 0, FACE_W, CASE_H);

  if (poster) {
    // object-cover, into everything to the right of the band
    const scale = Math.max(ART_W / poster.width, CASE_H / poster.height);
    const dw = poster.width * scale;
    const dh = poster.height * scale;
    ctx.save();
    ctx.beginPath();
    ctx.rect(WRAP_W, 0, ART_W, CASE_H);
    ctx.clip();
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(poster, WRAP_W + (ART_W - dw) / 2, (CASE_H - dh) / 2, dw, dh);
    ctx.restore();
  }

  // The band: a case is ONE sheet folded over, so whatever is at the spine's edge keeps
  // going — the body colour, the white panel and the foot block all carry across the
  // fold at the same heights. Wrapping only the body colour is the giveaway that it's
  // two pieces of art rather than one object.
  const panelY = Math.round(CASE_H * PANEL_TOP);
  const footY = Math.round(CASE_H * FOOT_TOP);
  ctx.fillStyle = body;
  ctx.fillRect(0, 0, WRAP_W, total != null ? panelY : footY);
  if (total != null) {
    ctx.fillStyle = PANEL_CREAM;
    ctx.fillRect(0, panelY, WRAP_W, footY - panelY);
  }
  ctx.fillStyle = foot;
  ctx.fillRect(0, footY, WRAP_W, CASE_H - footY);

  press(ctx, tile, 0, 0, FACE_W, CASE_H, WEAVE_COVER);

  // the crease where the sheet folds round the hinge — INSIDE the band, or it spills a
  // dirty shadow down the left of the poster
  const creaseW = 5 * (WRAP_W / 24);
  const cr = ctx.createLinearGradient(WRAP_W - creaseW, 0, WRAP_W, 0);
  cr.addColorStop(0, 'rgba(0,0,0,0)');
  cr.addColorStop(1, 'rgba(0,0,0,0.32)');
  ctx.fillStyle = cr;
  ctx.fillRect(WRAP_W - creaseW, 0, creaseW, CASE_H);

  // .case-bevel — the softened top and bottom edge
  const top = ctx.createLinearGradient(0, 0, 0, 12 * S);
  top.addColorStop(0, 'rgba(255,255,255,0.16)');
  top.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = top;
  ctx.fillRect(0, 0, FACE_W, 12 * S);
  const bot = ctx.createLinearGradient(0, CASE_H, 0, CASE_H - 14 * S);
  bot.addColorStop(0, 'rgba(0,0,0,0.18)');
  bot.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = bot;
  ctx.fillRect(0, CASE_H - 14 * S, FACE_W, 14 * S);

  return cv;
}

/** The top: not the printed sheet but the cut edge of the paper inside it — milky,
 *  and a touch darker toward the front. (SpineShelf's EDGE_WHITE_TOP.) */
function topTexture(tile) {
  const cv = surface(SPINE_W, FACE_W);
  const ctx = cv.getContext('2d');
  const g = ctx.createLinearGradient(0, 0, 0, FACE_W);
  g.addColorStop(0, 'rgb(242,242,240)');
  g.addColorStop(1, 'rgb(210,210,208)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, SPINE_W, FACE_W);
  press(ctx, tile, 0, 0, SPINE_W, FACE_W, WEAVE_EDGE);
  return cv;
}

/** The shadow the case casts on the table. A radial gradient, NOT ctx.filter — Safari
 *  only grew filter in 17.4, and where it's missing a blur silently becomes a
 *  hard-edged black ellipse under the case. */
function contactShadow(ctx) {
  const feet = [[-HW, HH, HD], [HW, HH, HD], [HW, HH, -HD], [-HW, HH, -HD]].map(project);
  const xs = feet.map((p) => p[0]);
  const ys = feet.map((p) => p[1]);
  const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
  const cy = (Math.min(...ys) + Math.max(...ys)) / 2 + 14;
  const rx = (Math.max(...xs) - Math.min(...xs)) / 2 + 30;
  const ry = (Math.max(...ys) - Math.min(...ys)) / 2 + 34;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(1, ry / rx);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
  g.addColorStop(0, 'rgba(26,26,26,0.34)');
  g.addColorStop(0.55, 'rgba(26,26,26,0.16)');
  g.addColorStop(1, 'rgba(26,26,26,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, rx, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** Paints the case and reports the two poster colours and where it landed. */
async function drawCase(ctx, review, total, catalogNo, isFeatured) {
  const [body, foot] = await getPosterColors(review.poster_path);
  const [poster, paper] = await Promise.all([
    review.poster_path ? loadImage(`${TMDB_IMG_BASE}w780${review.poster_path}`, true) : null,
    loadImage('/textures/paper.png'),
  ]);
  const tile = paperTile(paper);

  contactShadow(ctx);

  // Back to front. At this angle the far wall, the back cover and the underside are all
  // turned away — the three faces below are the whole visible box.
  warp(ctx, topTexture(tile), TOP_QUAD);
  warp(ctx, spineTexture({ review, body, foot, total, catalogNo, isFeatured, tile }), SPINE_QUAD);
  warp(ctx, coverTexture({ body, foot, total, poster, tile }), COVER_QUAD);

  const bottom = Math.max(...[...SPINE_QUAD, ...COVER_QUAD].map((p) => project(p)[1]));
  return { body, foot, bottom };
}

// ───────────────────────── the button ─────────────────────────

export default function ShareCard({ review, className, isFeatured = false }) {
  const [sharing, setSharing] = useState(false);
  const total = getReviewTotal(review);
  // The same 館藏編號 the shelf prints. Free: catalog.js is already loaded and already
  // fetching on every route (HomePage isn't lazy, so the shelf pulls it into the entry
  // chunk), and it's shared through the API cache regardless.
  const catalog = useCatalogNumbers();
  const catalogNo = formatCatalogNo(catalog?.get(review.id));

  const handleShare = useCallback(async () => {
    if (sharing) return;
    setSharing(true);
    try {
      // Nevis and Noto Sans TC have to be resolved before fillText, or the canvas
      // silently falls back to a system face.
      if (document.fonts?.ready) await document.fonts.ready;

      const cv = document.createElement('canvas');
      cv.width = W;
      cv.height = H;
      const ctx = cv.getContext('2d');

      // ── backdrop ──
      const bg = ctx.createLinearGradient(0, 0, W * 0.4, H);
      bg.addColorStop(0, '#F2ECDD');
      bg.addColorStop(1, '#D9CFBB');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, W, H);

      const { foot, bottom } = await drawCase(ctx, review, total, catalogNo, isFeatured);

      // ── the score: the loudest thing on the card after the artwork ──
      const scoreY = bottom + 242;
      if (total != null) {
        ctx.textAlign = 'left';
        ctx.textBaseline = 'alphabetic';
        ctx.font = face(208);
        const s = total.toFixed(1);
        const sw = ctx.measureText(s).width;

        ctx.fillStyle = RED;
        ctx.fillText(s, 90, scoreY);

        ctx.font = face(30);
        ctx.fillStyle = 'rgba(26,26,26,0.55)';
        ctx.fillText('CINEROOMS SCORE', 100 + sw + 24, scoreY - 118);

        // a rule that runs from the score out to the edge, like a spec sheet
        ctx.fillStyle = 'rgba(26,26,26,0.18)';
        ctx.fillRect(100 + sw + 24, scoreY - 92, W - (100 + sw + 24) - 90, 3);

        ctx.font = '700 26px "Noto Sans TC", sans-serif';
        ctx.fillStyle = 'rgba(26,26,26,0.45)';
        ctx.fillText('/ 10.0', 100 + sw + 26, scoreY - 24);
      }

      // ── title ──
      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';
      ctx.font = face(66);
      ctx.fillStyle = INK;
      const lines = wrapText(ctx, review.title || '', W - 180, 2);
      lines.forEach((line, i) => {
        ctx.fillText(line, 90, scoreY + 110 + i * 76);
      });

      // ── watermark ──
      ctx.font = face(34);
      ctx.fillStyle = 'rgba(26,26,26,0.35)';
      ctx.fillText('CINEROOMS', 90, H - 80);

      ctx.fillStyle = foot;
      ctx.fillRect(W - 90 - 56, H - 112, 56, 34);

      const blob = await new Promise((r) => cv.toBlob(r, 'image/png'));
      if (!blob) throw new Error('toBlob returned nothing');

      const file = new File([blob], `cinerooms-${review.title || 'review'}.png`, {
        type: 'image/png',
      });

      if (navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({
            files: [file],
            title: `CineRooms: ${review.title}`,
            text: `Check out my review of ${review.title}!`,
          });
        } catch (err) {
          // Dismissing the OS share sheet rejects with AbortError. That's the user
          // saying "no", not a failure — falling back to a download meant backing out
          // of the share sheet quietly dropped a PNG into their Downloads folder.
          if (err?.name === 'AbortError') return;
          downloadBlob(blob, file.name);
        }
      } else {
        downloadBlob(blob, file.name);
      }
    } catch (err) {
      console.error('ShareCard error:', err);
      alert('分享圖片產生失敗，請稍後再試');
    } finally {
      setSharing(false);
    }
  }, [review, total, catalogNo, isFeatured, sharing]);

  return (
    <button
      onClick={handleShare}
      disabled={sharing}
      className={className || "group flex items-center gap-2 px-8 py-3 rounded-full bg-[#D480C0] hover:bg-[#FE494A] hover:text-white text-black font-extrabold transition-all duration-300 cursor-pointer border-none shadow-sm"}
    >
      <span className="inline-block font-black text-sm uppercase tracking-wider transition-all duration-300 group-hover:scale-105">
        {sharing ? '⏳ 產生中...' : '📱 Share to Story'}
      </span>
    </button>
  );
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
