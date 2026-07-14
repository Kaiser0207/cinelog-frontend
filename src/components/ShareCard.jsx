import { useCallback, useState } from 'react';
import { getReviewTotal, TMDB_IMG_BASE } from '../utils/constants';
import { getPosterColors, isDark } from '../utils/posterColors';

/**
 * Share to Story — a photograph of the film's case.
 *
 * Drawn on a 2D canvas, NOT screenshotted off the DOM. html2canvas (pro or not)
 * has no support for CSS 3D: `perspective`, `preserve-3d` and `rotateY` are simply
 * dropped, so capturing the real 3D case gives you its faces collapsed into a pile
 * of flat rectangles. Projecting the box by hand is both more faithful and more
 * predictable — and it drops the 246 KB html2canvas chunk entirely.
 *
 * The case is drawn in a light axonometric: the cover face-on, the spine and the top
 * receding up-and-left along one shared vector. Same two poster colours the shelf
 * uses, so the case you post is the case you own.
 */

const W = 1080;
const H = 1920;          // 9:16 — it's a story

const COVER_W = 600;
const COVER_H = 900;     // 2:3
const COVER_X = 330;
const COVER_Y = 400;
const RX = -112;         // recession vector: back = up and to the left
const RY = -68;

const WRAP = 44;         // the printed band that folds onto the cover
const PANEL_TOP = 0.65;  // white panel starts 65% down the spine
const FOOT_TOP = 0.90;   // colour block starts at 90%

const CREAM = '#E7E0CF';
const INK = '#1A1A1A';
const RED = '#FE494A';

const loadImage = (src) =>
  new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous'; // TMDB sends Access-Control-Allow-Origin: *
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });

/** A point on the spine/top parallelogram: u = 0 at the cover, 1 at the back. */
const back = (x, y, u = 1) => [x + RX * u, y + RY * u];

function quad(ctx, pts, fill) {
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
}

/** The weave — the same warp-and-weft the real case carries (see SpineShelf.css),
 *  drawn as a tiled 3px grid. This is a photo of a printed, folded sheet, so the
 *  texture is the one thing that has to survive; the film grain that used to be here
 *  was reshaping artwork someone else had already art-directed. */
function weave(ctx, x, y, w, h, alpha) {
  const n = 12;   // 4 cells of 3px — a whole number of periods, so the tile seams don't show
  const tile = document.createElement('canvas');
  tile.width = n;
  tile.height = n;
  const tctx = tile.getContext('2d');
  for (let i = 0; i < n; i += 3) {
    tctx.fillStyle = 'rgba(255,255,255,0.5)';   // warp — vertical threads
    tctx.fillRect(i, 0, 1, n);
    tctx.fillStyle = 'rgba(0,0,0,0.5)';         // weft — horizontal threads
    tctx.fillRect(0, i, n, 1);
  }

  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.globalAlpha = alpha;
  ctx.globalCompositeOperation = 'overlay';
  ctx.fillStyle = ctx.createPattern(tile, 'repeat');
  ctx.fillRect(x, y, w, h);
  ctx.restore();
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

async function drawCase(ctx, review, total) {
  const [body, foot] = await getPosterColors(review.poster_path);
  const poster = review.poster_path
    ? await loadImage(`${TMDB_IMG_BASE}w780${review.poster_path}`)
    : null;

  const x0 = COVER_X;
  const y0 = COVER_Y;
  const x1 = COVER_X + COVER_W;
  const y1 = COVER_Y + COVER_H;

  // Contact shadow on the "table"
  ctx.save();
  ctx.filter = 'blur(30px)';
  ctx.fillStyle = 'rgba(26,26,26,0.35)';
  ctx.beginPath();
  ctx.ellipse(x0 + COVER_W / 2 - 20, y1 + 26, COVER_W * 0.52, 34, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // ── top face: the paper edge you look down on ──
  quad(ctx, [[x0, y0], [x1, y0], back(x1, y0), back(x0, y0)], '#EDEDEA');
  quad(ctx, [[x0, y0], [x1, y0], back(x1, y0), back(x0, y0)], 'rgba(26,26,26,0.06)');

  // ── spine face: body, then the white panel, then the foot block ──
  const spineBand = (t0, t1, fill) => {
    const ya = y0 + COVER_H * t0;
    const yb = y0 + COVER_H * t1;
    quad(ctx, [[x0, ya], [x0, yb], back(x0, yb), back(x0, ya)], fill);
  };
  spineBand(0, PANEL_TOP, body);
  spineBand(PANEL_TOP, FOOT_TOP, '#F5F1E6');
  spineBand(FOOT_TOP, 1, foot);
  // the spine is in shade — it's turned away from the light
  quad(
    ctx,
    [[x0, y0], [x0, y1], back(x0, y1), back(x0, y0)],
    'rgba(0,0,0,0.22)'
  );

  // ── cover: the poster, with the printed band folded onto its left edge ──
  ctx.save();
  ctx.beginPath();
  ctx.rect(x0, y0, COVER_W, COVER_H);
  ctx.clip();

  if (poster) {
    // No filter. The art gets everything to the RIGHT of the band — the band sits
    // beside it, never on top, so the poster is never cropped to make room.
    const artW = COVER_W - WRAP;
    const scale = Math.max(artW / poster.width, COVER_H / poster.height);
    const dw = poster.width * scale;
    const dh = poster.height * scale;
    ctx.drawImage(poster, x0 + WRAP + (artW - dw) / 2, y0 + (COVER_H - dh) / 2, dw, dh);
  } else {
    ctx.fillStyle = body;
    ctx.fillRect(x0 + WRAP, y0, COVER_W - WRAP, COVER_H);
  }

  // the wrapped band — the same three bands as the spine, at the same heights
  ctx.fillStyle = body;
  ctx.fillRect(x0, y0, WRAP, COVER_H * PANEL_TOP);
  ctx.fillStyle = '#F5F1E6';
  ctx.fillRect(x0, y0 + COVER_H * PANEL_TOP, WRAP, COVER_H * (FOOT_TOP - PANEL_TOP));
  ctx.fillStyle = foot;
  ctx.fillRect(x0, y0 + COVER_H * FOOT_TOP, WRAP, COVER_H * (1 - FOOT_TOP));

  // the crease where the sheet folds round the hinge
  const cr = ctx.createLinearGradient(x0 + WRAP, 0, x0 + WRAP + 14, 0);
  cr.addColorStop(0, 'rgba(0,0,0,0.35)');
  cr.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = cr;
  ctx.fillRect(x0 + WRAP, y0, 14, COVER_H);

  ctx.restore();

  // gloss: a single soft highlight raked across the plastic
  ctx.save();
  ctx.beginPath();
  ctx.rect(x0, y0, COVER_W, COVER_H);
  ctx.clip();
  const gl = ctx.createLinearGradient(x0, y0, x0 + COVER_W, y0 + COVER_H);
  gl.addColorStop(0, 'rgba(255,255,255,0.16)');
  gl.addColorStop(0.35, 'rgba(255,255,255,0.02)');
  gl.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = gl;
  ctx.fillRect(x0, y0, COVER_W, COVER_H);
  ctx.restore();

  ctx.strokeStyle = 'rgba(0,0,0,0.25)';
  ctx.lineWidth = 2;
  ctx.strokeRect(x0, y0, COVER_W, COVER_H);

  return { body, foot };
}

export default function ShareCard({ review, className }) {
  const [sharing, setSharing] = useState(false);
  const total = getReviewTotal(review);

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

      const { foot } = await drawCase(ctx, review, total);
      // The weave stays on the CASE — this is a photo of an object sitting on a
      // surface, and the surface isn't made of paper. Before the type goes down, not
      // after: the score has no business being woven.
      weave(ctx, COVER_X, COVER_Y, COVER_W, COVER_H, 0.3);

      // ── the score: the loudest thing on the card after the artwork ──
      const scoreY = COVER_Y + COVER_H + 210;
      if (total != null) {
        ctx.textBaseline = 'alphabetic';
        ctx.font = '900 208px Nevis, "Noto Sans TC", sans-serif';
        const s = total.toFixed(1);
        const sw = ctx.measureText(s).width;

        ctx.fillStyle = RED;
        ctx.fillText(s, 90, scoreY);

        ctx.font = '900 30px Nevis, "Noto Sans TC", sans-serif';
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
      ctx.font = '900 66px Nevis, "Noto Sans TC", sans-serif';
      ctx.fillStyle = INK;
      const lines = wrapText(ctx, review.title || '', W - 180, 2);
      lines.forEach((line, i) => {
        ctx.fillText(line, 90, scoreY + 110 + i * 76);
      });

      // ── watermark ──
      ctx.font = '900 34px Nevis, "Noto Sans TC", sans-serif';
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
  }, [review, total, sharing]);

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
