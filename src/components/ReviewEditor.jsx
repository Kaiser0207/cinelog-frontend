import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import MovieSearch from './MovieSearch';
import FontSelector from './FontSelector';
import ScoreSlider from './ScoreSlider';
import RadarChart from './RadarChart';
import SpotifySearch from './SpotifySearch';
import WatchHistory from './WatchHistory';
import AIPredictButton from './AIPredictButton';
import { useAdmin } from './AdminAuth';
import { useToast } from './Toast';
import { API_URL, TMDB_IMG_BASE, FONT_MAP, computeEntertainment, computeCinematic, computeTotal, getScoreColor } from '../utils/constants';

const EMPTY_STATE = {
  // Movie info
  tmdb_id: null,
  title: '',
  poster_path: '',
  backdrop_path: '',
  genres: [],
  runtime: null,
  release_date: '',
  overview: '',
  // Review
  review_text: '',
  review_font: 'Outfit',
  // Scores
  emotion: 5,
  pacing: 5,
  acting: 5,
  cinematography: 5,
  soundtrack: 5,
  // Spotify
  spotify_track_id: '',
  spotify_track_name: '',
  // Watch dates
  watch_dates: [],
};

export default function ReviewEditor({ review = null, onClose, onSaved }) {
  const isEdit = !!review;
  const { requireAuth } = useAdmin();
  const { addToast } = useToast();

  const [form, setForm] = useState(() => {
    if (review) {
      return {
        tmdb_id: review.tmdb_id,
        title: review.title || '',
        poster_path: review.poster_path || '',
        backdrop_path: review.backdrop_path || '',
        genres: typeof review.genres === 'string' ? JSON.parse(review.genres) : (review.genres || []),
        runtime: review.runtime,
        release_date: review.release_date || '',
        overview: review.overview || '',
        review_text: review.review_text || '',
        review_font: review.review_font || 'Outfit',
        emotion: review.emotion ?? 5,
        pacing: review.pacing ?? 5,
        acting: review.acting ?? 5,
        cinematography: review.cinematography ?? 5,
        soundtrack: review.soundtrack ?? 5,
        spotify_track_id: review.spotify_track_id || '',
        spotify_track_name: review.spotify_track_name || '',
        watch_dates: review.watch_dates || [],
      };
    }
    return { ...EMPTY_STATE };
  });

  const [animated, setAnimated] = useState(false);
  const [saving, setSaving] = useState(false);

  const update = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleMovieSelect = (movie) => {
    setForm((prev) => ({
      ...prev,
      tmdb_id: movie.tmdb_id || movie.id,
      title: movie.title,
      poster_path: movie.poster_path || '',
      backdrop_path: movie.backdrop_path || '',
      genres: movie.genre_ids
        ? movie.genre_ids
        : (movie.genres || []),
      runtime: movie.runtime || null,
      release_date: movie.release_date || '',
      overview: movie.overview || '',
    }));
  };

  const handleAIPredict = (scores) => {
    setAnimated(true);
    setForm((prev) => ({
      ...prev,
      emotion: scores.emotion ?? prev.emotion,
      pacing: scores.pacing ?? prev.pacing,
      acting: scores.acting ?? prev.acting,
      cinematography: scores.cinematography ?? prev.cinematography,
      soundtrack: scores.soundtrack ?? prev.soundtrack,
    }));
    setTimeout(() => setAnimated(false), 800);
  };

  const handleSpotifySelect = (track) => {
    update('spotify_track_id', track.track_id || track.id || '');
    update('spotify_track_name', track.name || '');
    update('spotify_artist_name', track.artist || '');
  };

  const handleSave = () => {
    if (!form.title) {
      addToast('Please select a movie first.', 'error');
      return;
    }
    if (!form.review_text.trim()) {
      addToast('Please write a review.', 'error');
      return;
    }

    requireAuth(async (password) => {
      setSaving(true);
      try {
        const endpoint = isEdit
          ? `${API_URL}/api/reviews/${review.id}`
          : `${API_URL}/api/reviews`;
        const method = isEdit ? 'PUT' : 'POST';

        const body = isEdit
          ? {
              review_text: form.review_text,
              review_font: form.review_font,
              spotify_track_id: form.spotify_track_id || null,
              spotify_track_name: form.spotify_track_name || null,
              spotify_artist_name: form.spotify_artist_name || null,
              emotion: form.emotion,
              pacing: form.pacing,
              acting: form.acting,
              cinematography: form.cinematography,
              soundtrack: form.soundtrack,
            }
          : {
              tmdb_id: form.tmdb_id,
              review_text: form.review_text,
              review_font: form.review_font,
              spotify_track_id: form.spotify_track_id || null,
              spotify_track_name: form.spotify_track_name || null,
              spotify_artist_name: form.spotify_artist_name || null,
              emotion: form.emotion,
              pacing: form.pacing,
              acting: form.acting,
              cinematography: form.cinematography,
              soundtrack: form.soundtrack,
              watch_dates: form.watch_dates,
            };

        const res = await fetch(endpoint, {
          method,
          headers: {
            'Content-Type': 'application/json',
            'X-Admin-Password': password,
          },
          body: JSON.stringify(body),
        });

        if (res.ok) {
          const saved = await res.json();
          addToast(isEdit ? 'Review updated!' : 'Review published!', 'success');
          onSaved?.(saved);
          onClose();
        } else {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.detail || 'Failed to save');
        }
      } catch (err) {
        addToast(err.message, 'error');
      } finally {
        setSaving(false);
      }
    });
  };

  const entertainment = computeEntertainment(form.emotion, form.pacing);
  const cinematicScore = computeCinematic(form.acting, form.cinematography, form.soundtrack);
  const total = computeTotal(entertainment, cinematicScore);

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9000] overflow-y-auto"
    >
      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 40, opacity: 0 }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        className="min-h-screen md:py-8 md:px-4"
      >
        <div className="max-w-5xl mx-auto bg-bg-surface border border-border-subtle md:rounded-2xl overflow-hidden">
          {/* Header */}
          <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-4 bg-bg-surface/90 backdrop-blur-xl border-b border-border-subtle">
            <h2 className="text-lg font-bold font-[var(--font-outfit)]">
              {isEdit ? '✏️ Edit Review' : '🎬 New Review'}
            </h2>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-lg bg-bg-card border border-border-subtle flex items-center justify-center text-text-muted hover:text-text-primary hover:border-border-active transition-colors"
            >
              ✕
            </button>
          </div>

          {/* Content */}
          <div className="p-5 md:p-8 grid md:grid-cols-2 gap-8">
            {/* Left Column: Movie + Review Text */}
            <div className="space-y-6">
              {/* Movie Search */}
              <MovieSearch onSelect={handleMovieSelect} disabled={isEdit} />

              {/* Selected Movie Preview */}
              {form.title && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex gap-4 p-4 rounded-xl bg-bg-card border border-border-subtle"
                >
                  {form.poster_path ? (
                    <img
                      src={`${TMDB_IMG_BASE}w154${form.poster_path}`}
                      alt={form.title}
                      className="w-20 h-28 object-cover rounded-lg flex-shrink-0"
                    />
                  ) : (
                    <div className="w-20 h-28 bg-bg-elevated rounded-lg flex items-center justify-center flex-shrink-0">
                      <span className="text-2xl">🎥</span>
                    </div>
                  )}
                  <div className="min-w-0">
                    <h3 className="font-bold text-text-primary truncate">{form.title}</h3>
                    {form.release_date && (
                      <p className="text-xs text-text-muted mt-0.5">
                        {new Date(form.release_date).getFullYear()}
                      </p>
                    )}
                    {form.overview && (
                      <p className="text-xs text-text-dim mt-1 line-clamp-3">{form.overview}</p>
                    )}
                  </div>
                </motion.div>
              )}

              {/* Font Selector */}
              <FontSelector value={form.review_font} onChange={(v) => update('review_font', v)} />

              {/* Review Text */}
              <div>
                <label className="block text-sm text-text-muted mb-1.5 font-medium">
                  Review (Markdown supported)
                </label>
                <textarea
                  value={form.review_text}
                  onChange={(e) => update('review_text', e.target.value)}
                  placeholder="Write your cinematic thoughts..."
                  rows={10}
                  className="w-full resize-y min-h-[200px]"
                  style={{ fontFamily: FONT_MAP[form.review_font] }}
                />
              </div>

              {/* Spotify */}
              <SpotifySearch onSelect={handleSpotifySelect} />
              {form.spotify_track_name && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-bg-card border border-border-subtle">
                  <span className="text-green-400">🎵</span>
                  <span className="text-sm text-text-primary truncate">{form.spotify_track_name}</span>
                  <button
                    type="button"
                    onClick={() => { update('spotify_track_id', ''); update('spotify_track_name', ''); }}
                    className="ml-auto text-text-muted hover:text-red-400 text-xs"
                  >
                    ✕
                  </button>
                </div>
              )}

              {/* Watch History */}
              <WatchHistory dates={form.watch_dates} onChange={(d) => update('watch_dates', d)} />
            </div>

            {/* Right Column: Scores */}
            <div className="space-y-6">
              {/* AI Predict */}
              <AIPredictButton
                reviewText={form.review_text}
                onPredict={handleAIPredict}
                disabled={!form.review_text.trim()}
              />

              {/* Total Score Display */}
              <div className="text-center py-4">
                <p className="text-xs uppercase tracking-widest text-text-muted mb-1">Total Score</p>
                <motion.span
                  key={total}
                  initial={animated ? { scale: 1.3 } : false}
                  animate={{ scale: 1 }}
                  className="text-5xl font-black font-[var(--font-outfit)] tabular-nums"
                  style={{
                    color: getScoreColor(total),
                    textShadow: `0 0 30px ${getScoreColor(total)}50`,
                  }}
                >
                  {total.toFixed(1)}
                </motion.span>
              </div>

              {/* Entertainment Scores */}
              <div className="glass p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-text-primary">🎭 Entertainment</h4>
                  <span className="text-sm font-bold text-accent-gold tabular-nums">
                    {entertainment.toFixed(1)}
                  </span>
                </div>
                <ScoreSlider
                  label="Emotion"
                  value={form.emotion}
                  onChange={(v) => update('emotion', v)}
                  animated={animated}
                />
                <ScoreSlider
                  label="Pacing"
                  value={form.pacing}
                  onChange={(v) => update('pacing', v)}
                  animated={animated}
                />
              </div>

              {/* Cinematic Scores */}
              <div className="glass p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-text-primary">🎬 Cinematic Score</h4>
                  <span className="text-sm font-bold text-accent-gold tabular-nums">
                    {cinematicScore.toFixed(1)}
                  </span>
                </div>

                <RadarChart
                  acting={form.acting}
                  cinematography={form.cinematography}
                  soundtrack={form.soundtrack}
                  animated={animated}
                />

                <ScoreSlider
                  label="Acting"
                  value={form.acting}
                  onChange={(v) => update('acting', v)}
                  animated={animated}
                />
                <ScoreSlider
                  label="Cinematography"
                  value={form.cinematography}
                  onChange={(v) => update('cinematography', v)}
                  animated={animated}
                />
                <ScoreSlider
                  label="Soundtrack"
                  value={form.soundtrack}
                  onChange={(v) => update('soundtrack', v)}
                  animated={animated}
                />
              </div>

              {/* Save Button */}
              <motion.button
                type="button"
                onClick={handleSave}
                disabled={saving}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                className="w-full py-4 rounded-xl bg-accent-red hover:bg-red-700 text-white font-bold text-base transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed glow-red"
              >
                {saving ? (
                  <span className="flex items-center justify-center gap-2">
                    <motion.span
                      animate={{ rotate: 360 }}
                      transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                      className="inline-block"
                    >
                      ⟳
                    </motion.span>
                    Saving...
                  </span>
                ) : (
                  isEdit ? '💾 Update Review' : '🚀 Publish Review'
                )}
              </motion.button>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
