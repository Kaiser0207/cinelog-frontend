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
};

export const SCORE_LABELS = {
  emotion: 'Emotion',
  pacing: 'Pacing',
  acting: 'Acting',
  cinematography: 'Cinematography',
  soundtrack: 'Soundtrack',
};

export const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest First' },
  { value: 'rating', label: 'Highest Rated' },
  { value: 'title', label: 'Title A → Z' },
];

export function computeEntertainment(emotion, pacing) {
  return Math.round(((emotion + pacing) / 2) * 10) / 10;
}

export function computeCinematic(acting, cinematography, soundtrack) {
  return Math.round(((acting + cinematography + soundtrack) / 3) * 10) / 10;
}

export function computeTotal(entertainment, cinematic) {
  return Math.round(((entertainment + cinematic) / 2) * 10) / 10;
}

export function getScoreColor(score) {
  if (score >= 8) return '#1db954';
  if (score >= 6) return '#f5c518';
  if (score >= 4) return '#ff6b35';
  return '#e50914';
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
  };
}
