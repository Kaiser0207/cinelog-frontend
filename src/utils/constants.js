export const API_URL = import.meta.env?.VITE_API_URL || 'http://localhost:8000';

export const TMDB_IMG_BASE = 'https://image.tmdb.org/t/p/';

export const FONTS = [
  { name: 'Outfit', label: 'Elegant Sans', category: 'Default' },
  { name: 'Playfair Display', label: 'Classic Serif', category: 'Drama' },
  { name: 'Noto Serif TC', label: '中文襯線', category: 'Chinese' },
  { name: 'Caveat', label: 'Handwritten', category: 'Animation' },
  { name: 'Nunito', label: 'Rounded', category: 'Comedy' },
  { name: 'Bebas Neue', label: 'Bold Display', category: 'Action' },
  { name: 'JetBrains Mono', label: 'Monospace', category: 'Sci-fi' },
  { name: 'UnifrakturCook', label: 'Gothic', category: 'Fantasy' },
  { name: 'DM Serif Display', label: 'Editorial Serif', category: 'Drama' },
  { name: 'Cormorant Garamond', label: 'Elegant Serif', category: 'Romance' },
  { name: 'Lora', label: 'Literary', category: 'Indie' },
  { name: 'Space Grotesk', label: 'Modern Geometric', category: 'Thriller' },
  { name: 'Ma Shan Zheng', label: '中文書法', category: 'Wuxia' },
  { name: 'LXGW WenKai TC', label: '中文文楷', category: 'Literary' },
  { name: 'Zhi Mang Xing', label: '中文手寫', category: 'Indie' },
];

// Literal font stacks, NOT var(--font-*). Site chrome uses Noto Sans TC/Inter,
// while Nevis is reserved for display headings. A review's chosen font must not
// inherit either stack — picking "Caveat" has to actually render as Caveat — so
// the review font picker owns these explicit stacks.
export const FONT_MAP = {
  'Outfit': "'Outfit', system-ui, sans-serif",
  'Playfair Display': "'Playfair Display', serif",
  'Noto Serif TC': "'Noto Serif TC', serif",
  'Caveat': "'Caveat', cursive",
  'Nunito': "'Nunito', sans-serif",
  'Bebas Neue': "'Bebas Neue', sans-serif",
  'JetBrains Mono': "'JetBrains Mono', monospace",
  'UnifrakturCook': "'UnifrakturCook', cursive",
  'DM Serif Display': "'DM Serif Display', serif",
  'Cormorant Garamond': "'Cormorant Garamond', serif",
  'Lora': "'Lora', serif",
  'Space Grotesk': "'Space Grotesk', sans-serif",
  'Ma Shan Zheng': "'Ma Shan Zheng', cursive",
  'LXGW WenKai TC': "'LXGW WenKai TC', 'Noto Serif TC', serif",
  'Zhi Mang Xing': "'Zhi Mang Xing', cursive",
};

export const SCORE_LABELS = {
  emotion: 'Emotion',
  pacing: 'Pacing',
  acting: 'Acting',
  cinematography: 'Cinematography',
  soundtrack: 'Soundtrack',
  story: 'Story',
};

export const SORT_OPTIONS = [
  { value: 'watched', label: 'Recently Watched' },
  { value: 'newest', label: 'Newest First' },
  { value: 'rating', label: 'Highest Rated' },
  { value: 'title', label: 'Title A → Z' },
];

function avgDefined(values) {
  const nums = values.filter((v) => typeof v === 'number' && !Number.isNaN(v));
  if (nums.length === 0) return null;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

export function computeEntertainment(emotion, pacing) {
  const v = avgDefined([emotion, pacing]);
  return v == null ? null : Math.round(v * 10) / 10;
}

// Story (6th dimension) joins the cinematic group; it's averaged in only when
// present, so older reviews without a story score degrade gracefully.
export function computeCinematic(acting, cinematography, soundtrack, story) {
  const v = avgDefined([acting, cinematography, soundtrack, story]);
  return v == null ? null : Math.round(v * 10) / 10;
}

export function computeTotal(entertainment, cinematic) {
  if (entertainment == null || cinematic == null) return null;
  // 1/3 entertainment + 2/3 cinematic → each of the 6 sub-dimensions carries
  // an equal 1/6 weight in the total.
  return Math.round(((entertainment + 2 * cinematic) / 3) * 10) / 10;
}

// The one place to get a review's headline score: series/anime use a single
// manual overall_score (no 6-dim); movies use the computed 6-dim total.
export function getReviewTotal(review) {
  if (!review) return null;
  if (review.media_type === 'tv') {
    // Hybrid: a manual overall_score wins; otherwise auto from season averages.
    if (typeof review.overall_score === 'number') return review.overall_score;
    // Summary payloads expose the already-resolved headline score but omit the
    // episode arrays required to recompute it.
    if (typeof review.total_score === 'number') return review.total_score;
    return autoSeriesTotal(review.episode_scores, review.seasons);
  }
  // Summary payloads intentionally omit the six score dimensions. Trust the
  // backend's calculated value when present; full detail remains backward-
  // compatible through the local calculation below.
  if (typeof review.total_score === 'number') return review.total_score;
  const ent = computeEntertainment(review.emotion, review.pacing);
  const cine = computeCinematic(review.acting, review.cinematography, review.soundtrack, review.story);
  return computeTotal(ent, cine);
}

export function getScoreColor(score) {
  if (score >= 8) return '#1db954';
  if (score >= 6) return '#f5c518';
  if (score >= 4) return '#ff6b35';
  return '#e50914';
}

// Finer 0-10 scale for the per-episode heatmap cells (red → amber → green).
export function getEpisodeColor(score) {
  if (score == null || Number.isNaN(score)) return null;
  if (score >= 9) return '#16a34a';
  if (score >= 8) return '#22c55e';
  if (score >= 7) return '#84cc16';
  if (score >= 6) return '#eab308';
  if (score >= 5) return '#f59e0b';
  if (score >= 4) return '#f97316';
  if (score >= 3) return '#ef4444';
  return '#dc2626';
}

// 'movie' | 'tv' | 'anime' — anime (動漫) wins over the movie/tv split.
export function mediaCategory(review) {
  if (!review) return 'movie';
  if (review.is_anime) return 'anime';
  return review.media_type === 'tv' ? 'tv' : 'movie';
}

export const MEDIA_BADGES = {
  movie: { en: 'Film', zh: '電影', icon: '🎬' },
  tv: { en: 'Series', zh: '影集', icon: '📺' },
  anime: { en: 'Anime', zh: '動漫', icon: '🌸' },
};

// Average of the rated episodes within one season (null if none rated).
export function seasonAverage(episodeScores, seasonNumber) {
  const vals = (episodeScores || [])
    .filter((e) => e.season_number === seasonNumber && typeof e.score === 'number')
    .map((e) => e.score);
  if (vals.length === 0) return null;
  return Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10;
}

// Auto series score = the mean of each season's average (seasons with no rated
// episode are skipped). null if nothing is rated yet.
export function autoSeriesTotal(episodeScores, seasons) {
  const avgs = (seasons || [])
    .map((s) => seasonAverage(episodeScores, s.season_number))
    .filter((v) => v != null);
  if (avgs.length === 0) return null;
  return Math.round((avgs.reduce((a, b) => a + b, 0) / avgs.length) * 10) / 10;
}

export function formatDate(dateStr, locale = 'en-US') {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString(locale, { year: 'numeric', month: 'short', day: 'numeric' });
}

// Postgres TIMESTAMPTZ serializes as "2026-06-10 15:23:18.506250+00:00"
// (space-separated, 6-digit microseconds) which Safari/iOS refuses to parse
// (→ "Invalid Date"). Normalize to ISO — 'T' separator, ≤3 fractional digits —
// before building the Date. Returns '' for null/garbage instead of "Invalid Date".
export function formatDateTime(value) {
  if (!value) return '';
  const iso = String(value).replace(' ', 'T').replace(/\.(\d{3})\d+/, '.$1');
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleString();
}

/**
 * Flatten the nested API response into a flat review object for components.
 * API returns: { id, movie: { title, poster_path, ... }, emotion, ... }
 * Components expect: { id, title, poster_path, ..., emotion, ... }
 */
export function flattenReview(review) {
  if (!review) return review;
  // Already flattened or no movie object
  if (!review.movie) return review;
  const { movie, ...rest } = review;
  return {
    ...rest,
    tmdb_id: movie.tmdb_id,
    title: movie.title,
    poster_path: movie.poster_path,
    backdrop_path: movie.backdrop_path,
    runtime: movie.runtime,
    release_date: movie.release_date,
    overview: movie.overview,
    genres: (movie.genres || []).map(g => typeof g === 'object' ? g.name : g),
    color_palette: movie.color_palette || [],
    // TV / anime
    media_type: movie.media_type || 'movie',
    is_anime: !!movie.is_anime,
    number_of_seasons: movie.number_of_seasons ?? null,
    number_of_episodes: movie.number_of_episodes ?? null,
    seasons: movie.seasons || [],
    // episode_scores rides along in ...rest (top-level on the API response)
  };
}
