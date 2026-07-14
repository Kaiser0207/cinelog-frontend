import { TMDB_IMG_BASE } from './constants';

/**
 * The two colours a film's case is printed in, pulled off its poster: the body,
 * and the block at the foot of the spine.
 *
 * Hue-bucketed and saturation-weighted, NOT averaged. A movie poster is mostly dark
 * background — a plain mean of its pixels is always the same brown mud, so every
 * case on the shelf would come out the same colour. Bucketing by hue finds what the
 * poster is actually *about*; the second colour is the heaviest bucket that's a
 * genuinely different hue, so the pair reads as a deliberate two-colour scheme
 * rather than two shades of one.
 *
 * Shared by the shelf and the share card — they have to agree, or a film's case
 * would be one colour on screen and another in the picture you post of it.
 */

export const FALLBACK_PAIRS = [
  ['#FE494A', '#3B4856'], ['#D480C0', '#2E2A33'], ['#3B4856', '#E8B84B'],
  ['#E8B84B', '#1A1A1A'], ['#4C9A6A', '#F0EAD6'], ['#E86A33', '#1A1A1A'],
];

const cache = new Map();

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

const cssRgb = ([r, g, b]) => `rgb(${r}, ${g}, ${b})`;

export const lum = (rgb) => (0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2]) / 255;
export const isDark = (css) => lum((css.match(/\d+/g) || [0, 0, 0]).map(Number)) < 0.55;

const shade = ([r, g, b], f) =>
  [r, g, b].map((v) => Math.round(f > 0 ? v + (255 - v) * f : v * (1 + f)));

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

  // No second hue (a monochrome one-sheet) — derive the foot block by pushing the
  // primary the other way in lightness, so it still reads as a pair.
  const secondary = other
    ? other.col
    : shade(primary.col, lum(primary.col) > 0.5 ? -0.6 : 0.55);

  return [cssRgb(primary.col), cssRgb(secondary)];
}

export function cachedColors(posterPath) {
  return posterPath ? cache.get(posterPath) : undefined;
}

export function fallbackFor(seed = 0) {
  return FALLBACK_PAIRS[seed % FALLBACK_PAIRS.length];
}

/** Resolves to [body, foot]. Never rejects — falls back on CORS or a missing poster. */
export function getPosterColors(posterPath, seed = 0) {
  if (!posterPath) return Promise.resolve(fallbackFor(seed));
  if (cache.has(posterPath)) return Promise.resolve(cache.get(posterPath));

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous'; // TMDB serves Access-Control-Allow-Origin: *
    img.onload = () => {
      try {
        const cv = document.createElement('canvas');
        cv.width = 20;
        cv.height = 30;
        const ctx = cv.getContext('2d', { willReadFrequently: true });
        ctx.drawImage(img, 0, 0, 20, 30);
        const found = extractPair(ctx.getImageData(0, 0, 20, 30).data);
        if (found) {
          cache.set(posterPath, found);
          resolve(found);
          return;
        }
      } catch {
        /* tainted canvas */
      }
      resolve(fallbackFor(seed));
    };
    img.onerror = () => resolve(fallbackFor(seed));
    img.src = `${TMDB_IMG_BASE}w92${posterPath}`;
  });
}
