export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

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

export const FONT_MAP = {
  'Outfit': 'var(--font-outfit)',
  'Playfair Display': 'var(--font-playfair)',
  'Noto Serif TC': 'var(--font-noto-serif-tc)',
  'Caveat': 'var(--font-caveat)',
  'Nunito': 'var(--font-nunito)',
  'Bebas Neue': 'var(--font-bebas)',
  'JetBrains Mono': 'var(--font-jetbrains)',
  'UnifrakturCook': 'var(--font-unifraktur)',
  'DM Serif Display': 'var(--font-dm-serif)',
  'Cormorant Garamond': 'var(--font-cormorant)',
  'Lora': 'var(--font-lora)',
  'Space Grotesk': 'var(--font-space)',
  'Ma Shan Zheng': 'var(--font-ma-shan)',
  'LXGW WenKai TC': 'var(--font-wenkai)',
  'Zhi Mang Xing': 'var(--font-zhimang)',
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

export function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
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
