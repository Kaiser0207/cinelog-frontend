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

  const backdropUrl = review.custom_backdrop_url
    ? review.custom_backdrop_url
    : review.backdrop_path
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
      className="relative"
    >
      {/* Back Button - Fixed float to avoid being blocked by content */}
      <button
        onClick={() => navigate('/')}
        className="fixed top-6 left-6 z-[100] px-5 py-2 bg-[#FFB6C1] hover:bg-[#FBA3B5] text-black font-bold font-[var(--font-jetbrains)] text-sm rounded-full shadow-lg hover:scale-105 transition-all flex items-center gap-2 border-none"
      >
        ← BACK
      </button>

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
              className="text-6xl md:text-8xl font-black font-[var(--font-bebas)] text-white uppercase leading-none mb-4 drop-shadow-[4px_4px_0_rgba(254,73,74,1)]"
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
          <div className="glass p-6 flex flex-col items-center justify-center text-center border-4 border-black shadow-[8px_8px_0_rgba(255,255,255,0.1)]">
            <p className="text-xl font-bold font-[var(--font-bebas)] uppercase tracking-widest text-text-muted mb-2">Total Score</p>
            <span className="text-8xl font-black font-[var(--font-bebas)] tabular-nums text-[#1A1A1A]">
              {total.toFixed(1)}
            </span>
            <p className="text-sm font-bold font-[var(--font-bebas)] text-text-dim mt-2">/ 10.0</p>
          </div>

          {/* Entertainment */}
          <div className="glass p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-text-primary">🎭 Entertainment</h3>
              <span className="text-lg font-bold text-[#1A1A1A] tabular-nums">
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
              <span className="text-lg font-bold text-[#1A1A1A] tabular-nums">
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
          <h3 className="text-2xl font-bold font-[var(--font-bebas)] text-accent-red uppercase tracking-wider mb-4 border-b-4 border-accent-red pb-2">
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

        {/* AI Recommendation & Related Movies */}
        {(review.ai_recommendation || (review.ai_related_movies && review.ai_related_movies.length > 0)) && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.65 }}
            className="border-4 border-accent-blue bg-[#1A1A1A] p-6 my-8 shadow-[8px_8px_0_var(--color-accent-blue)]"
          >
            <h3 className="text-3xl font-black font-[var(--font-bebas)] uppercase text-accent-blue mb-4">
              🤖 AI Director's Cut
            </h3>
            {review.ai_recommendation && (
              <p className="text-white text-lg font-medium leading-relaxed font-[var(--font-inter)] mb-6">
                {review.ai_recommendation}
              </p>
            )}
            
            {review.ai_related_movies && review.ai_related_movies.length > 0 && (
              <div className="border-t-2 border-accent-blue/30 pt-4">
                <h4 className="text-sm font-bold uppercase text-accent-blue/80 tracking-widest mb-3">
                  Also Watch
                </h4>
                <div className="flex flex-wrap gap-2">
                  {review.ai_related_movies.map((movieTitle, i) => (
                    <span key={i} className="px-3 py-1 bg-accent-blue/10 text-accent-blue font-bold text-sm border border-accent-blue/30">
                      {movieTitle}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* Cast */}
        {review.cast_info && review.cast_info.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.68 }}
            className="mt-12"
          >
            <h3 className="text-4xl font-black font-[var(--font-bebas)] text-[#1A1A1A] uppercase tracking-wider mb-6 bg-accent-amber inline-block px-4 py-1 -rotate-1">
              Top Cast
            </h3>
            <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
              {review.cast_info.map((actor, idx) => (
                <div key={actor.id} className="group cursor-pointer flex flex-col" onClick={() => window.open(`https://www.themoviedb.org/person/${actor.id}`, '_blank')}>
                  <div className={`aspect-[2/3] overflow-hidden border-2 border-[#1A1A1A] bg-[#1A1A1A] transition-all duration-300 group-hover:-translate-y-2 group-hover:shadow-[4px_4px_0_#FE494A] ${idx % 2 === 0 ? 'rotate-1' : '-rotate-1'} mb-3`}>
                    {actor.profile_path ? (
                      <img src={`${TMDB_IMG_BASE}w185${actor.profile_path}`} className="w-full h-full object-cover filter grayscale group-hover:grayscale-0 transition-all duration-300 opacity-90 group-hover:opacity-100" alt={actor.name} />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-4xl bg-[#1A1A1A] text-white/20">👤</div>
                    )}
                  </div>
                  <p className="text-xs font-black uppercase truncate text-[#1A1A1A] leading-tight mb-0.5">{actor.name}</p>
                  <p className="text-[10px] text-accent-red uppercase truncate font-bold">{actor.character}</p>
                </div>
              ))}
            </div>
          </motion.div>
        )}

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
          className="flex flex-wrap items-center gap-4 pt-6 border-t border-border-subtle"
        >
          <button
            onClick={onEdit}
            className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#FFB6C1] hover:bg-[#FBA3B5] text-black font-bold hover:scale-105 active:scale-95 transition-all text-sm border-none shadow-sm cursor-pointer"
          >
            ✏️ Edit
          </button>

          <ShareCard review={review} />

          <button
            onClick={handleDelete}
            className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-red-500/10 hover:bg-red-500/20 text-red-600 border border-red-500/20 font-bold hover:scale-105 active:scale-95 transition-all text-sm cursor-pointer ml-auto"
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
