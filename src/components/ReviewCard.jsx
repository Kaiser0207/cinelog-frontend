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
      className="relative cursor-pointer card-hover group overflow-hidden rounded-2xl border border-border-subtle"
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
      <div className="absolute inset-0 flex flex-col justify-end p-5 md:p-6 pt-20">
        {/* Score Badge */}
        <div className="absolute top-4 right-4">
          <div
            className="w-14 h-14 rounded-xl flex items-center justify-center backdrop-blur-md border border-white/10"
            style={{
              background: `rgba(0,0,0,0.5)`,
              boxShadow: `0 0 20px ${getScoreColor(total)}30`,
            }}
          >
            <span
              className="text-2xl font-black font-[var(--font-outfit)]"
              style={{
                color: getScoreColor(total),
                textShadow: `0 0 16px ${getScoreColor(total)}60`,
              }}
            >
              {total.toFixed(1)}
            </span>
          </div>
        </div>

        {/* Genre Pills */}
        {genres.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {genres.slice(0, 3).map((genre, i) => {
              const genreName = typeof genre === 'string' ? genre : genre.name;
              return (
                <span
                  key={i}
                  className="text-[10px] uppercase tracking-wider font-semibold text-white/70 bg-white/10 backdrop-blur-sm px-2 py-0.5 rounded-md"
                >
                  {genreName}
                </span>
              );
            })}
            {review.runtime && (
              <span className="text-[10px] uppercase tracking-wider font-semibold text-accent-gold/80 bg-accent-gold/10 backdrop-blur-sm px-2 py-0.5 rounded-md">
                {review.runtime} min
              </span>
            )}
          </div>
        )}

        {/* Title */}
        <h3 className="text-xl md:text-2xl font-bold font-[var(--font-outfit)] text-white leading-tight mb-1 drop-shadow-lg">
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
    </motion.article>
  );
}

export function ReviewCardSkeleton() {
  return (
    <div
      className="relative overflow-hidden rounded-2xl border border-border-subtle"
      style={{ aspectRatio: '16/10' }}
    >
      <div className="skeleton absolute inset-0" />
      <div className="absolute inset-0 flex flex-col justify-end p-5">
        <div className="skeleton h-4 w-24 mb-3 rounded" />
        <div className="skeleton h-7 w-3/4 mb-2 rounded" />
        <div className="skeleton h-3 w-full mb-1 rounded" />
        <div className="skeleton h-3 w-2/3 rounded" />
      </div>
    </div>
  );
}
