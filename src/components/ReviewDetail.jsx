import { motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useNavigate } from 'react-router-dom';
import ScoreSlider from './ScoreSlider';
import RadarChart from './RadarChart';
import SpotifyEmbed from './SpotifyEmbed';
import ShareCard from './ShareCard';
import { useAdmin } from './AdminAuth';
import { useToast } from './Toast';
import {
  TMDB_IMG_BASE,
  FONT_MAP,
  computeEntertainment,
  computeCinematic,
  computeTotal,
  getScoreColor,
  formatDate,
  API_URL,
} from '../utils/constants';

export default function ReviewDetail({ review, onEdit, onDeleted }) {
  const navigate = useNavigate();
  const { requireAuth } = useAdmin();
  const { addToast } = useToast();

  const entertainment = computeEntertainment(review.emotion || 0, review.pacing || 0);
  const cinematic = computeCinematic(review.acting || 0, review.cinematography || 0, review.soundtrack || 0);
  const total = computeTotal(entertainment, cinematic);

  const genres = review.genres
    ? (typeof review.genres === 'string' ? JSON.parse(review.genres) : review.genres)
    : [];

  const watchDates = review.watch_dates || [];
  const fontFamily = FONT_MAP[review.review_font] || FONT_MAP['Outfit'];

  const backdropUrl = review.backdrop_path
    ? `${TMDB_IMG_BASE}original${review.backdrop_path}`
    : null;

  const posterUrl = review.poster_path
    ? `${TMDB_IMG_BASE}w342${review.poster_path}`
    : null;

  const isEdited = review.updated_at && review.created_at && review.updated_at !== review.created_at;

  const handleDelete = () => {
    if (!window.confirm('Delete this review permanently?')) return;

    requireAuth(async (password) => {
      try {
        const res = await fetch(`${API_URL}/api/reviews/${review.id}`, {
          method: 'DELETE',
          headers: { 'X-Admin-Password': password },
        });
        if (res.ok || res.status === 204) {
          addToast('Review deleted.', 'success');
          onDeleted?.();
          navigate('/');
        } else {
          throw new Error('Delete failed');
        }
      } catch (err) {
        addToast(err.message, 'error');
      }
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {/* Hero */}
      <div className="relative h-[50vh] md:h-[60vh] overflow-hidden">
        {backdropUrl ? (
          <motion.img
            src={backdropUrl}
            alt={review.title}
            className="absolute inset-0 w-full h-full object-cover"
            initial={{ scale: 1.1 }}
            animate={{ scale: 1 }}
            transition={{ duration: 1.2, ease: 'easeOut' }}
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-bg-card to-bg-deep" />
        )}

        {/* Hero Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-bg-deep via-bg-deep/50 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-bg-deep/60 to-transparent" />

        {/* Back Button */}
        <button
          onClick={() => navigate('/')}
          className="absolute top-4 left-4 z-10 w-10 h-10 rounded-full glass flex items-center justify-center text-text-primary hover:text-accent-red transition-colors"
        >
          ←
        </button>

        {/* Hero Content */}
        <div className="absolute bottom-0 left-0 right-0 p-6 md:p-10 flex items-end gap-6">
          {posterUrl && (
            <motion.img
              src={posterUrl}
              alt={review.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="hidden md:block w-40 h-60 object-cover rounded-xl shadow-2xl border border-white/10"
            />
          )}
          <div className="flex-1 min-w-0">
            {/* Genre pills */}
            {genres.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="flex flex-wrap gap-2 mb-3"
              >
                {genres.map((g, i) => {
                  const name = typeof g === 'string' ? g : g.name;
                  return (
                    <span
                      key={i}
                      className="text-xs uppercase tracking-wider font-semibold text-white/60 bg-white/10 backdrop-blur-sm px-2.5 py-1 rounded-lg"
                    >
                      {name}
                    </span>
                  );
                })}
              </motion.div>
            )}

            {/* Title */}
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-3xl md:text-5xl font-black font-[var(--font-outfit)] text-white leading-tight mb-2"
            >
              {review.title}
            </motion.h1>

            {/* Meta */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="flex flex-wrap items-center gap-3 text-sm text-white/50"
            >
              {review.release_date && (
                <span>{new Date(review.release_date).getFullYear()}</span>
              )}
              {review.runtime && <span>· {review.runtime} min</span>}
              {isEdited && (
                <span className="bg-accent-gold/20 text-accent-gold text-xs px-2 py-0.5 rounded-md">
                  Edited
                </span>
              )}
            </motion.div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-5 md:px-10 py-8 space-y-10">
        {/* Scores Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="grid md:grid-cols-3 gap-6"
        >
          {/* Total Score */}
          <div className="glass p-6 flex flex-col items-center justify-center text-center">
            <p className="text-xs uppercase tracking-widest text-text-muted mb-2">Total Score</p>
            <span
              className="text-6xl font-black font-[var(--font-outfit)] tabular-nums"
              style={{
                color: getScoreColor(total),
                textShadow: `0 0 40px ${getScoreColor(total)}50`,
              }}
            >
              {total.toFixed(1)}
            </span>
            <p className="text-xs text-text-dim mt-2">/ 10.0</p>
          </div>

          {/* Entertainment */}
          <div className="glass p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-text-primary">🎭 Entertainment</h3>
              <span className="text-lg font-bold text-accent-gold tabular-nums">
                {entertainment.toFixed(1)}
              </span>
            </div>
            <ScoreSlider label="Emotion" value={review.emotion || 0} readOnly />
            <ScoreSlider label="Pacing" value={review.pacing || 0} readOnly />
          </div>

          {/* Cinematic */}
          <div className="glass p-6 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-text-primary">🎬 Cinematic</h3>
              <span className="text-lg font-bold text-accent-gold tabular-nums">
                {cinematic.toFixed(1)}
              </span>
            </div>
            <RadarChart
              acting={review.acting || 0}
              cinematography={review.cinematography || 0}
              soundtrack={review.soundtrack || 0}
            />
          </div>
        </motion.div>

        {/* Overview */}
        {review.overview && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="glass p-6"
          >
            <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-3">
              Synopsis
            </h3>
            <p className="text-text-primary leading-relaxed text-sm">{review.overview}</p>
          </motion.div>
        )}

        {/* Review Text */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-4">
            Review
          </h3>
          <div
            className="prose-cinelog"
            style={{ fontFamily }}
          >
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {review.review_text || ''}
            </ReactMarkdown>
          </div>
        </motion.div>

        {/* Spotify */}
        {review.spotify_track_id && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
          >
            <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-3">
              🎵 Soundtrack Pick
            </h3>
            <SpotifyEmbed trackId={review.spotify_track_id} />
          </motion.div>
        )}

        {/* Watch History */}
        {watchDates.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="glass p-6"
          >
            <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-4">
              Watch History
            </h3>
            <div className="flex flex-wrap gap-3">
              {watchDates.map((date, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 bg-bg-card px-3 py-2 rounded-lg border border-border-subtle"
                >
                  <span className="text-xs text-text-muted">
                    {['1st', '2nd', '3rd'][i] || `${i + 1}th`}
                  </span>
                  <span className="text-sm text-text-primary">{formatDate(date)}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9 }}
          className="flex flex-wrap items-center gap-3 pt-4 border-t border-border-subtle"
        >
          <button
            onClick={onEdit}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-bg-card border border-border-subtle text-text-primary hover:border-accent-gold/40 hover:text-accent-gold transition-colors text-sm font-medium"
          >
            ✏️ Edit
          </button>

          <ShareCard review={review} />

          <button
            onClick={handleDelete}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-bg-card border border-border-subtle text-text-muted hover:border-red-500/40 hover:text-red-400 transition-colors text-sm font-medium ml-auto"
          >
            🗑️ Delete
          </button>
        </motion.div>

        {/* Timestamps */}
        <div className="text-xs text-text-dim flex flex-wrap gap-4 pb-8">
          {review.created_at && (
            <span>Created: {formatDate(review.created_at)}</span>
          )}
          {isEdited && (
            <span>Updated: {formatDate(review.updated_at)}</span>
          )}
        </div>
      </div>
    </motion.div>
  );
}
