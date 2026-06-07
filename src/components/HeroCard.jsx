import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { TMDB_IMG_BASE, computeEntertainment, computeCinematic, computeTotal, formatDate } from '../utils/constants';
import { useLanguage } from './LanguageContext';

export default function HeroCard({ review }) {
  const navigate = useNavigate();
  const { t } = useLanguage();

  if (!review) return null;

  const {
    id,
    title,
    backdrop_path,
    emotion,
    pacing,
    acting,
    cinematography,
    soundtrack
  } = review;

  const genres = review.genres
    ? (typeof review.genres === 'string' ? JSON.parse(review.genres) : review.genres)
    : [];

  const watch_dates = review.watch_dates
    ? (typeof review.watch_dates === 'string' ? JSON.parse(review.watch_dates) : review.watch_dates)
    : [];

  const entertainment = computeEntertainment(emotion, pacing);
  const cinematic = computeCinematic(acting, cinematography, soundtrack, review.story);
  const score = computeTotal(entertainment, cinematic);

  const heroImage = review.custom_backdrop_url 
    ? review.custom_backdrop_url
    : backdrop_path
      ? `${TMDB_IMG_BASE}w1280${backdrop_path}`
      : review.poster_path
        ? `${TMDB_IMG_BASE}w780${review.poster_path}`
        : null;
  const latestWatchDate = watch_dates.length > 0 ? watch_dates[watch_dates.length - 1] : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      onClick={() => navigate(`/review/${id}`)}
      className="relative w-full h-[42vh] max-h-[380px] min-h-[300px] md:max-h-[440px] rounded-3xl overflow-hidden shadow-2xl cursor-pointer group"
    >
      {/* Background Image */}
      {heroImage ? (
        <img
          src={heroImage}
          alt={title}
          loading="lazy"
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-active:scale-105"
        />
      ) : (
        <div className="absolute inset-0 w-full h-full bg-[#1A1A1A]" />
      )}

      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
      <div className="absolute inset-0 bg-black/10 group-active:bg-black/20 transition-colors duration-300" />

      {/* Top Label & Score */}
      <div className="absolute top-4 left-4 right-4 flex justify-between items-start">
        <div className="bg-[#FE494A] text-white text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full shadow-md font-jetbrains">
          {t('featured')}
        </div>
        <div className="bg-[#1A1A1A]/80 backdrop-blur-md text-[#E8E2D2] px-3 py-1.5 rounded-full border border-white/10 flex items-center gap-1.5 shadow-xl">
          <span className="text-xs">✨</span>
          <span className="text-sm font-black font-bebas tracking-wider pt-0.5">{score.toFixed(1)}</span>
        </div>
      </div>

      {/* Bottom Content */}
      <div className="absolute bottom-0 left-0 right-0 p-5 flex flex-col gap-2 transform transition-transform duration-300 group-active:translate-y-1">
        {/* Genre Pills */}
        <div className="flex flex-wrap gap-2 mb-1">
          {genres.slice(0, 3).map((genre) => (
            <span
              key={genre}
              className="text-[10px] font-bold text-white/80 border border-white/20 rounded-full px-2.5 py-0.5 backdrop-blur-sm font-jetbrains"
            >
              {t(genre?.name || genre) || (genre?.name || genre)}
            </span>
          ))}
        </div>

        {/* Title */}
        <h2 className="text-3xl md:text-5xl font-black font-syne text-white uppercase tracking-tighter leading-tight drop-shadow-lg line-clamp-2">
          {title}
        </h2>

        {/* Watch Date */}
        {latestWatchDate && (
          <p className="text-xs font-bold text-white/60 font-jetbrains uppercase flex items-center gap-1.5">
            <span>👀</span> {t('recentlyWatched')}: {formatDate(latestWatchDate)}
          </p>
        )}
      </div>
    </motion.div>
  );
}
