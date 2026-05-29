import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { TMDB_IMG_BASE, computeEntertainment, computeCinematic, computeTotal, getScoreColor } from '../utils/constants';

export default function ReviewCard({ review, index = 0 }) {
  const navigate = useNavigate();

  const entertainment = computeEntertainment(review.emotion || 0, review.pacing || 0);
  const cinematic = computeCinematic(review.acting || 0, review.cinematography || 0, review.soundtrack || 0);
  const total = computeTotal(entertainment, cinematic);

  const backdropUrl = review.backdrop_path
    ? `${TMDB_IMG_BASE}w780${review.backdrop_path}`
    : review.poster_path
      ? `${TMDB_IMG_BASE}w500${review.poster_path}`
      : null;

  const genres = review.genres
    ? (typeof review.genres === 'string' ? JSON.parse(review.genres) : review.genres)
    : [];

  const teaser = review.review_text
    ? review.review_text.replace(/[#*_~`>]/g, '').slice(0, 120) + (review.review_text.length > 120 ? '...' : '')
    : '';

  return (
    <motion.article
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.08, ease: [0.22, 1, 0.36, 1] }}
      onClick={() => navigate(`/review/${review.id}`)}
      className="relative cursor-pointer card-hover group overflow-hidden rounded-none border-[3px] border-border-subtle hover:border-accent-red transition-colors"
      style={{ aspectRatio: '16/10' }}
    >
      {/* Background Image */}
      {backdropUrl ? (
        <img
          src={backdropUrl}
          alt={review.title}
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          loading="lazy"
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-bg-card to-bg-elevated" />
      )}

      {/* Dark Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-r from-black/40 to-transparent" />

      {/* Content */}
      <div className="absolute inset-0 flex flex-col justify-end p-5 md:p-6 pt-24">
        {/* Top: Score Badge - Absolute Positioned to top right */}
        <div className="absolute top-2 right-2 md:top-3 md:right-3">
          <div
            className="w-16 h-16 rounded-none flex items-center justify-center border-4 border-accent-red bg-black shrink-0 scale-90 md:scale-100"
            style={{
              boxShadow: `4px 4px 0px ${getScoreColor(total)}`,
            }}
          >
            <span
              className="text-3xl font-black font-[var(--font-bebas)]"
              style={{
                color: getScoreColor(total),
                textShadow: `0 0 16px ${getScoreColor(total)}60`,
              }}
            >
              {total.toFixed(1)}
            </span>
          </div>
        </div>

        {/* Bottom: Text Content */}
        <div className="flex flex-col justify-end mt-auto overflow-hidden">
          {/* Genre Pills */}
          {genres.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {genres.slice(0, 3).map((genre, i) => {
                const genreName = typeof genre === 'string' ? genre : genre.name;
                return (
                  <span
                    key={i}
                    className="text-[11px] uppercase tracking-widest font-bold text-black bg-white px-2 py-1"
                  >
                    {genreName}
                  </span>
                );
              })}
              {review.runtime && (
                <span className="text-[11px] uppercase tracking-widest font-bold text-white bg-accent-red px-2 py-1">
                  {review.runtime} MIN
                </span>
              )}
            </div>
          )}

          {/* Title */}
          <h3 className="text-3xl md:text-5xl font-black font-[var(--font-bebas)] text-white uppercase leading-none mb-2 drop-shadow-lg truncate tracking-wider">
            {review.title}
          </h3>

          {/* Release Year */}
          {review.release_date && (
            <p className="text-xs text-white/50 mb-2">
              {new Date(review.release_date).getFullYear()}
            </p>
          )}

          {/* Teaser */}
          {teaser && (
            <p className="text-sm text-white/60 line-clamp-2 mb-3 leading-relaxed">
              {teaser}
            </p>
          )}

          {/* CTA */}
          <div className="flex items-center gap-2 text-accent-red text-xs font-semibold uppercase tracking-wider group-hover:gap-3 transition-all duration-300">
            <span>閱讀影評</span>
            <span className="transition-transform duration-300 group-hover:translate-x-1">→</span>
          </div>
        </div>
      </div>
    </motion.article>
  );
}

export function ReviewCardSkeleton() {
  return (
    <div
      className="relative overflow-hidden rounded-none border-[3px] border-border-subtle bg-bg-card"
      style={{ aspectRatio: '16/10' }}
    >
      <div className="skeleton absolute inset-0 opacity-50" />
      <div className="absolute inset-0 flex flex-col justify-end p-5">
        <div className="skeleton h-4 w-24 mb-3 rounded-none opacity-80" />
        <div className="skeleton h-8 w-3/4 mb-2 rounded-none opacity-80" />
        <div className="skeleton h-3 w-full mb-1 rounded-none opacity-80" />
        <div className="skeleton h-3 w-2/3 rounded-none opacity-80" />
      </div>
    </div>
  );
}
