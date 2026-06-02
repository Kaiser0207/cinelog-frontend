import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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

function ColorStrip({ palette }) {
  if (!palette || palette.length === 0) return null;

  return (
    <div className="w-full h-12 md:h-16 flex shadow-sm rounded-lg overflow-hidden border border-[#1A1A1A]/10">
      {palette.map((hex, i) => (
        <ColorBlock key={i} hex={hex} />
      ))}
    </div>
  );
}

function ColorBlock({ hex }) {
  const [hovered, setHovered] = useState(false);

  return (
    <motion.div
      className="relative cursor-pointer flex items-center justify-center overflow-hidden"
      style={{ backgroundColor: hex }}
      initial={{ flex: 1 }}
      whileHover={{ flex: 1.5 }}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
    >
      <AnimatePresence>
        {hovered && (
          <motion.div
            className="text-white font-black text-xs md:text-sm font-[var(--font-jetbrains)] tracking-wider drop-shadow-md whitespace-nowrap"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.15 }}
          >
            HEX {hex.toUpperCase()}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function ReviewDetail({ review, onEdit, onDeleted }) {
  const navigate = useNavigate();
  const { requireAuth, isAdmin } = useAdmin();
  const { addToast } = useToast();
  const { lang, toggleLanguage, t } = useLanguage();
  const [mobileScoreOpen, setMobileScoreOpen] = useState(false);
  const [recommendations, setRecommendations] = useState([]);

  const entertainment = computeEntertainment(review.emotion || 0, review.pacing || 0);
  const cinematic = computeCinematic(review.acting || 0, review.cinematography || 0, review.soundtrack || 0);
  const total = computeTotal(entertainment, cinematic);

  const genres = review.genres
    ? (typeof review.genres === 'string' ? JSON.parse(review.genres) : review.genres)
    : [];

  const directors = review.directors_info || [];
  const writers = review.writers_info || [];

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

  // Fetch TMDB recommendations
  useEffect(() => {
    if (!review.tmdb_id) return;
    fetch(`${API_URL}/api/movies/${review.tmdb_id}/recommendations`)
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data?.results) setRecommendations(data.results);
      })
      .catch(() => {});
  }, [review.tmdb_id]);

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

  // Score Cards Component (reused in desktop sidebar + mobile expandable)
  const ScoreCards = ({ compact = false }) => (
    <div className={compact ? "space-y-3" : "space-y-6"}>
      {/* Total Score */}
      <div className="glass p-6 flex flex-col items-center justify-center text-center rounded-lg border border-border-subtle relative">
        <p className="absolute top-6 left-6 text-sm font-bold font-[var(--font-bebas)] uppercase tracking-widest text-text-muted">{t('totalScore')}</p>
        <span className="text-6xl md:text-8xl font-black font-[var(--font-bebas)] tabular-nums text-[#9D174D] mt-6">
          {total.toFixed(1)}
        </span>
        <p className="text-sm font-bold font-[var(--font-bebas)] text-text-dim mt-2">/ 10.0</p>
      </div>

      {/* Entertainment */}
      <div className="glass p-6 space-y-4 rounded-lg border border-border-subtle">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-text-primary">🎭 {t('entertainment')}</h3>
          <span className="text-lg font-bold text-[#1A1A1A] tabular-nums">
            {entertainment.toFixed(1)}
          </span>
        </div>
        <ScoreSlider label={t('emotion')} value={review.emotion || 0} readOnly />
        <ScoreSlider label={t('pacing')} value={review.pacing || 0} readOnly />
      </div>

      {/* Cinematic */}
      <div className="glass p-6 space-y-4 rounded-lg border border-border-subtle">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-text-primary">🎬 {t('cinematic')}</h3>
          <span className="text-lg font-bold text-[#1A1A1A] tabular-nums">
            {cinematic.toFixed(1)}
          </span>
        </div>
        <ScoreSlider label={t('acting')} value={review.acting || 0} readOnly />
        <ScoreSlider label={t('cinematography')} value={review.cinematography || 0} readOnly />
        <ScoreSlider label={t('soundtrackLabel')} value={review.soundtrack || 0} readOnly />
      </div>
    </div>
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="relative"
    >
      {/* Back Button */}
      <button
        onClick={() => navigate('/')}
        className="group fixed top-6 left-6 z-[100] px-5 py-2 bg-[#9D174D] hover:bg-[#D480C0] hover:text-black text-white rounded-full shadow-lg transition-all flex items-center gap-2 border-none cursor-pointer"
      >
        <span className="inline-block font-bold font-[var(--font-jetbrains)] text-sm transition-all duration-300 group-hover:scale-110 group-hover:font-black">
          {t('back')}
        </span>
      </button>

      {/* Language Toggle Button */}
      <button
        onClick={toggleLanguage}
        className="fixed top-6 right-6 z-[100] px-4 py-2 bg-[#9D174D] hover:bg-[#D480C0] hover:text-black text-white rounded-full shadow-lg transition-all border-none font-[var(--font-jetbrains)] font-bold text-xs cursor-pointer flex items-center gap-1 active:scale-95"
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

        {/* Hero Overlay */}
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

      {/* ===== TWO-COLUMN LAYOUT (Desktop) / SINGLE COLUMN (Mobile) ===== */}
      <div className="max-w-7xl mx-auto px-5 md:px-10 pt-6 pb-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* ===== LEFT COLUMN: Content ===== */}
          <div className="flex-1 min-w-0 space-y-10">
            {/* COLOR STRIP */}
            <ColorStrip palette={review.color_palette} />
            {/* Overview */}
            {review.overview && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="glass p-6 rounded-lg border border-border-subtle"
              >
                <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-3">
                  {t('synopsis')}
                </h3>
                <p className="text-text-primary leading-relaxed text-sm">{review.overview}</p>
              </motion.div>
            )}

            {/* Directors & Writers */}
            {(directors.length > 0 || writers.length > 0) && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.55 }}
                className="space-y-4"
              >
                {directors.length > 0 && (
                  <div>
                    <h3 className="text-2xl font-bold font-[var(--font-bebas)] text-[#9D174D] uppercase tracking-wider mb-3 border-b-4 border-[#9D174D] pb-2">
                      {t('directors')}
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {directors.map((d, idx) => (
                        <a
                          key={idx}
                          href={`https://www.themoviedb.org/person/${d.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-4 py-2 bg-[#2C3440] hover:bg-[#455568] text-[#89A1BB] hover:text-white rounded-md text-sm font-semibold transition-colors cursor-pointer border border-[#14181C]"
                        >
                          🎬 {d.name}
                        </a>
                      ))}
                    </div>
                  </div>
                )}
                {writers.length > 0 && (
                  <div>
                    <h3 className="text-2xl font-bold font-[var(--font-bebas)] text-[#9D174D] uppercase tracking-wider mb-3 border-b-4 border-[#9D174D] pb-2">
                      {t('writers')}
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {writers.map((w, idx) => (
                        <a
                          key={idx}
                          href={`https://www.themoviedb.org/person/${w.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-4 py-2 bg-[#2C3440] hover:bg-[#455568] text-[#89A1BB] hover:text-white rounded-md text-sm font-semibold transition-colors cursor-pointer border border-[#14181C]"
                        >
                          ✍️ {w.name}
                        </a>
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
                transition={{ delay: 0.6 }}
              >
                <h3 className="text-2xl font-bold font-[var(--font-bebas)] text-[#9D174D] uppercase tracking-wider mb-4 border-b-4 border-[#9D174D] pb-2">
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

            {/* Review Text */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.65 }}
            >
              <h3 className="text-2xl font-bold font-[var(--font-bebas)] text-[#9D174D] uppercase tracking-wider mb-4 border-b-4 border-[#9D174D] pb-2">
                {t('review')}
              </h3>
              <div
                className="prose-cinelog"
                style={{ fontFamily }}
              >
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {(review.review_text || '').replace(/\n/g, '  \n')}
                </ReactMarkdown>
              </div>
            </motion.div>

            {/* AI Recommendation & Related Movies */}
            {(review.ai_recommendation || (review.ai_related_movies && review.ai_related_movies.length > 0)) && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
                className="border border-accent-blue/30 rounded-lg bg-[#1A1A1A] p-6"
              >
                <h3 className="text-3xl font-black font-[var(--font-bebas)] uppercase text-accent-blue mb-4">
                  🤖 {t('aiDirectorsCut')}
                </h3>
                {review.ai_recommendation && (
                  <p className="text-white text-lg font-medium leading-relaxed font-[var(--font-inter)] mb-6">
                    {review.ai_recommendation}
                  </p>
                )}
                
                {review.ai_related_movies && review.ai_related_movies.length > 0 && (
                  <div className="border-t-2 border-accent-blue/30 pt-4">
                    <h4 className="text-sm font-bold uppercase text-accent-blue/80 tracking-widest mb-3">
                      {t('alsoWatch')}
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

            {/* TMDB Recommendations */}
            {recommendations.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.75 }}
              >
                <h3 className="text-2xl font-bold font-[var(--font-bebas)] text-[#9D174D] uppercase tracking-wider mb-4 border-b-4 border-[#9D174D] pb-2">
                  ✨ {t('recommendations')}
                </h3>
                <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
                  {recommendations.map((movie) => (
                    <a
                      key={movie.tmdb_id}
                      href={`https://www.themoviedb.org/movie/${movie.tmdb_id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-shrink-0 w-32 group cursor-pointer"
                    >
                      {movie.poster_path ? (
                        <img
                          src={`${TMDB_IMG_BASE}w185${movie.poster_path}`}
                          alt={movie.title}
                          className="w-32 h-48 object-cover rounded-lg border border-white/10 group-hover:border-[#9D174D] transition-all group-hover:scale-105 shadow-lg"
                        />
                      ) : (
                        <div className="w-32 h-48 bg-bg-card rounded-lg border border-white/10 flex items-center justify-center text-text-dim text-xs">
                          No Poster
                        </div>
                      )}
                      <p className="mt-2 text-xs font-semibold text-text-primary truncate group-hover:text-[#9D174D] transition-colors">
                        {movie.title}
                      </p>
                      {movie.release_date && (
                        <p className="text-[10px] text-text-muted">
                          {new Date(movie.release_date).getFullYear()}
                        </p>
                      )}
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
                transition={{ delay: 0.8 }}
              >
                <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-3">
                  🎵 Soundtrack Pick
                </h3>
                <SpotifyEmbed trackId={review.spotify_track_id} />
              </motion.div>
            )}
          </div>

          {/* ===== RIGHT COLUMN: Sticky Scores (Desktop only) ===== */}
          <div className="hidden lg:block w-80 flex-shrink-0">
            <div className="sticky top-8">
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 }}
              >
                <ScoreCards />
              </motion.div>
            </div>
          </div>
        </div>
      </div>

      {/* ===== MOBILE FLOATING SCORE BAR ===== */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-[90]">
        {/* Backdrop overlay when expanded */}
        <AnimatePresence>
          {mobileScoreOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 z-[89]"
              onClick={() => setMobileScoreOpen(false)}
            />
          )}
        </AnimatePresence>

        {/* Expandable Score Panel */}
        <AnimatePresence>
          {mobileScoreOpen && (
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="relative z-[91] bg-bg-deep/95 backdrop-blur-2xl border-t border-white/10 rounded-t-3xl px-5 py-6 max-h-[70vh] overflow-y-auto"
            >
              <div className="w-10 h-1 bg-white/30 rounded-full mx-auto mb-4" />
              <ScoreCards compact />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Mini Score Bar */}
        {!mobileScoreOpen && (
          <motion.button
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            transition={{ delay: 0.5, type: 'spring', damping: 20 }}
            onClick={() => setMobileScoreOpen(true)}
            className="w-full flex items-center justify-around px-6 py-4 bg-bg-deep/85 backdrop-blur-2xl border-t border-white/10 cursor-pointer border-x-0 border-b-0"
            style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))' }}
          >
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-[#9D174D]" />
              <span className="text-3xl font-black font-[var(--font-bebas)] tabular-nums tracking-wide text-[#9D174D]">
                {total.toFixed(1)}
              </span>
              <span className="text-xs text-text-dim font-bold mt-1">/10</span>
            </div>
            <div className="w-px h-8 bg-white/10" />
            <div className="flex items-center gap-2">
              <span className="text-base text-text-muted">🎭</span>
              <span className="text-lg font-bold text-text-primary tabular-nums">{entertainment.toFixed(1)}</span>
            </div>
            <div className="w-px h-8 bg-white/10" />
            <div className="flex items-center gap-2">
              <span className="text-base text-text-muted">🎬</span>
              <span className="text-lg font-bold text-text-primary tabular-nums">{cinematic.toFixed(1)}</span>
            </div>
            <span className="text-text-dim text-sm ml-2 animate-bounce">▲</span>
          </motion.button>
        )}
      </div>

      {/* Vibrant Blue Neo-brutalist Footer */}
      <div data-theme="blue" className="w-full bg-[#0000FF] text-white py-16 md:py-20 px-5">
        <div className="max-w-5xl mx-auto flex flex-col items-start md:items-center justify-center space-y-12 text-left md:text-center">
          {/* Decorative Section Header */}
          <div className="space-y-4">
            <div className="space-y-1">
              <h2 className="text-5xl md:text-6xl font-black font-[var(--font-bebas)] text-[#D480C0] tracking-wider leading-none">
                <span className="md:hidden">CINE<br/>ROOMS</span>
                <span className="hidden md:inline">CINEROOMS</span>
              </h2>
              <p className="text-base md:text-2xl font-bold font-[var(--font-bebas)] text-[#D480C0]/80 tracking-wider">
                {t('footerSubtitle')}
              </p>
            </div>
            <div className="w-16 h-1 bg-[#D480C0] md:mx-auto rounded-full" />
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
                    <span className="text-xs font-black uppercase text-[#D480C0] font-[var(--font-jetbrains)] bg-[#D480C0]/15 px-2 py-0.5 rounded">
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
            {isAdmin && (
              <button
                onClick={onEdit}
                className="group flex items-center justify-center gap-2 px-8 py-3 rounded-full bg-[#9D174D] hover:bg-[#D480C0] hover:text-black text-white font-extrabold transition-all duration-300 cursor-pointer border-none shadow-sm w-full sm:w-auto text-xs md:text-sm active:scale-95"
              >
                <span className="inline-block font-black uppercase tracking-wider transition-all duration-300 group-hover:scale-105">
                  {t('editReview')}
                </span>
              </button>
            )}

            <ShareCard 
              review={review} 
              className="group flex items-center justify-center gap-2 px-8 py-3 rounded-full bg-[#9D174D] hover:bg-[#D480C0] hover:text-black text-white font-extrabold transition-all duration-300 cursor-pointer border-none shadow-sm w-full sm:w-auto text-xs md:text-sm active:scale-95" 
            />

            {isAdmin && (
              <button
                onClick={handleDelete}
                className="group flex items-center justify-center gap-2 px-8 py-3 rounded-full bg-red-600 hover:bg-red-500 text-white font-extrabold transition-all duration-300 cursor-pointer border-none shadow-sm w-full sm:w-auto text-xs md:text-sm active:scale-95"
              >
                <span className="inline-block font-black uppercase tracking-wider transition-all duration-300 group-hover:scale-105">
                  {t('deleteReview')}
                </span>
              </button>
            )}
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

      {/* Bottom padding for mobile floating bar */}
      <div className="lg:hidden h-14" />
    </motion.div>
  );
}
