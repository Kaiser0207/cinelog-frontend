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
import { useLanguage } from './LanguageContext';
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
  const { lang, toggleLanguage, t } = useLanguage();

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
    if (!window.confirm(t('confirmDelete'))) return;

    requireAuth(async (password) => {
      try {
        const res = await fetch(`${API_URL}/api/reviews/${review.id}`, {
          method: 'DELETE',
          headers: { 'X-Admin-Password': password },
        });
        if (res.ok || res.status === 204) {
          addToast(t('deleteSuccess'), 'success');
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
        className="group fixed top-6 left-6 z-[100] px-5 py-2 bg-[#FFB6C1] hover:bg-[#D4FF00] rounded-full shadow-lg transition-all flex items-center gap-2 border-none cursor-pointer"
      >
        <span className="inline-block text-black font-bold font-[var(--font-jetbrains)] text-sm transition-all duration-300 group-hover:scale-110 group-hover:font-black">
          {t('back')}
        </span>
      </button>

      {/* Language Toggle Button */}
      <button
        onClick={toggleLanguage}
        className="fixed top-6 right-6 z-[100] px-4 py-2 bg-[#FFB6C1] hover:bg-[#D4FF00] rounded-full shadow-lg transition-all border-none font-[var(--font-jetbrains)] font-bold text-xs cursor-pointer text-black flex items-center gap-1 active:scale-95"
      >
        <span>🌐</span>
        <span>{lang === 'en' ? '繁' : 'EN'}</span>
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

        {/* Hero Overlay - lightened to make the background cover image much more obvious */}
        <div className="absolute inset-0 bg-gradient-to-t from-bg-deep/90 via-bg-deep/30 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-bg-deep/10 to-transparent" />

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

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-4xl md:text-8xl font-black font-[var(--font-bebas)] text-white uppercase leading-none mb-4 drop-shadow-md"
            >
              {review.title}
            </motion.h1>

            {/* Meta */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="flex flex-wrap items-center gap-3 text-base font-bold text-white/90 drop-shadow-md"
            >
              {review.release_date && (
                <span>{new Date(review.release_date).getFullYear()}</span>
              )}
              {review.runtime && <span>· {review.runtime} min</span>}
              {isEdited && (
                <span className="bg-accent-gold/20 text-accent-gold text-xs px-2 py-0.5 rounded-md drop-shadow-none">
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
          <div className="glass p-6 flex flex-col items-center justify-center text-center rounded-lg border border-border-subtle relative">
            <p className="absolute top-6 left-6 text-sm font-bold font-[var(--font-bebas)] uppercase tracking-widest text-text-muted">Total Score</p>
            <span className="text-6xl md:text-8xl font-black font-[var(--font-bebas)] tabular-nums text-[#FE494A] mt-6">
              {total.toFixed(1)}
            </span>
            <p className="text-sm font-bold font-[var(--font-bebas)] text-text-dim mt-2">/ 10.0</p>
          </div>

          {/* Entertainment */}
          <div className="glass p-6 space-y-4 rounded-lg border border-border-subtle">
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
          <div className="glass p-6 space-y-4 rounded-lg border border-border-subtle">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-text-primary">🎬 Cinematic</h3>
              <span className="text-lg font-bold text-[#1A1A1A] tabular-nums">
                {cinematic.toFixed(1)}
              </span>
            </div>
            <ScoreSlider label="Acting" value={review.acting || 0} readOnly />
            <ScoreSlider label="Cinematography" value={review.cinematography || 0} readOnly />
            <ScoreSlider label="Soundtrack" value={review.soundtrack || 0} readOnly />
          </div>
        </motion.div>

        {/* Overview */}
        {review.overview && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="glass p-6 rounded-lg border border-border-subtle"
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
          <h3 className="text-2xl font-bold font-[var(--font-bebas)] text-[#FFB6C1] uppercase tracking-wider mb-4 border-b-4 border-[#FFB6C1] pb-2">
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
            className="border border-accent-blue/30 rounded-lg bg-[#1A1A1A] p-6 my-8"
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
            <h3 className="text-2xl font-bold font-[var(--font-bebas)] text-[#FFB6C1] uppercase tracking-wider mb-4 border-b-4 border-[#FFB6C1] pb-2">
              {t('cast')}
            </h3>
            <div className="flex flex-wrap gap-2">
              {review.cast_info.map((actor, idx) => (
                <a
                  key={idx}
                  href={`https://www.themoviedb.org/person/${actor.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 bg-[#2C3440] hover:bg-[#455568] text-[#89A1BB] hover:text-white rounded-md text-[13px] transition-colors cursor-pointer border border-[#14181C]"
                >
                  {actor.name}
                </a>
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
      </div>

      {/* Vibrant Blue Neo-brutalist Footer */}
      <div className="w-full bg-[#0000FF] text-white py-16 md:py-20 px-5">
        <div className="max-w-5xl mx-auto flex flex-col items-center justify-center space-y-12 text-center">
          {/* Decorative Section Header */}
          <div className="space-y-4">
            <div className="space-y-1">
              <h2 className="text-5xl md:text-6xl font-black font-[var(--font-bebas)] text-[#CCFF00] tracking-wider leading-none">
                <span className="md:hidden">CINE<br/>ROOMS</span>
                <span className="hidden md:inline">CINEROOMS</span>
              </h2>
              <p className="text-base md:text-2xl font-bold font-[var(--font-bebas)] text-[#CCFF00]/80 tracking-wider">
                {t('footerSubtitle')}
              </p>
            </div>
            <div className="w-16 h-1 bg-[#CCFF00] mx-auto rounded-full" />
            <p 
              className="max-w-xl mx-auto text-xs md:text-base font-medium opacity-90 leading-relaxed font-[var(--font-inter)] text-white px-2 md:px-0"
              style={{ textAlign: 'justify', textJustify: 'inter-word' }}
            >
              {t('footerDesc')}
            </p>
          </div>

          {/* Watch History */}
          {watchDates.length > 0 && (
            <div className="w-full max-w-2xl px-2">
              <h3 className="text-xl font-black font-[var(--font-bebas)] text-white tracking-widest mb-6">
                {t('watchHistoryUpper')}
              </h3>
              <div className="flex flex-wrap justify-center gap-4">
                {watchDates.map((date, i) => (
                  <motion.div
                    key={i}
                    whileHover={{ scale: 1.05 }}
                    className="flex items-center gap-3 bg-white/10 text-white px-6 py-2.5 rounded-2xl border border-white/20 shadow-sm backdrop-blur-sm"
                  >
                    <span className="text-xs font-black uppercase text-[#FF1493] font-[var(--font-jetbrains)] bg-[#FF1493]/15 px-2 py-0.5 rounded">
                      {['1st', '2nd', '3rd'][i] || `${i + 1}th`}
                    </span>
                    <span className="text-base font-bold font-[var(--font-jetbrains)]">{formatDate(date)}</span>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-4 pt-4 w-full px-4 sm:px-0">
            <button
              onClick={onEdit}
              className="group flex items-center justify-center gap-2 px-8 py-3 rounded-full bg-[#FFB6C1] hover:bg-[#D4FF00] text-black font-extrabold transition-all duration-300 cursor-pointer border-none shadow-sm w-full sm:w-auto text-xs md:text-sm active:scale-95"
            >
              <span className="inline-block font-black uppercase tracking-wider transition-all duration-300 group-hover:scale-105">
                {t('editReview')}
              </span>
            </button>

            <ShareCard 
              review={review} 
              className="group flex items-center justify-center gap-2 px-8 py-3 rounded-full bg-[#CCFF00] hover:bg-[#D4FF00] text-black font-extrabold transition-all duration-300 cursor-pointer border-none shadow-sm w-full sm:w-auto text-xs md:text-sm active:scale-95" 
            />

            <button
              onClick={handleDelete}
              className="group flex items-center justify-center gap-2 px-8 py-3 rounded-full bg-red-600 hover:bg-red-500 text-white font-extrabold transition-all duration-300 cursor-pointer border-none shadow-sm w-full sm:w-auto text-xs md:text-sm active:scale-95"
            >
              <span className="inline-block font-black uppercase tracking-wider transition-all duration-300 group-hover:scale-105">
                {t('deleteReview')}
              </span>
            </button>
          </div>

          {/* Timestamps */}
          <div className="text-[10px] md:text-xs font-bold font-[var(--font-jetbrains)] text-white/50 flex flex-wrap justify-center gap-6 pt-8 border-t border-white/10 w-full">
            {review.created_at && (
              <span>{t('created')} {formatDate(review.created_at)}</span>
            )}
            {isEdited && (
              <span>{t('updated')} {formatDate(review.updated_at)}</span>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
