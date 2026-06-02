import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { TMDB_IMG_BASE, computeEntertainment, computeCinematic, computeTotal, getScoreColor } from '../utils/constants';
import { useLanguage } from './LanguageContext';

export default function ReviewCard({ review, index = 0 }) {
  const navigate = useNavigate();
  const { t } = useLanguage();

  const entertainment = computeEntertainment(review.emotion || 0, review.pacing || 0);
  const cinematic = computeCinematic(review.acting || 0, review.cinematography || 0, review.soundtrack || 0);
  const total = computeTotal(entertainment, cinematic);

  const backdropUrl = review.custom_backdrop_url
    ? review.custom_backdrop_url
    : review.backdrop_path
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
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ 
        opacity: { duration: 0.5, delay: (index % 3) * 0.08, ease: [0.22, 1, 0.36, 1] },
        y: { duration: 0.5, delay: (index % 3) * 0.08, ease: [0.22, 1, 0.36, 1] }
      }}
      onClick={() => navigate(`/review/${review.id}`)}
      whileHover={{ y: -4, transition: { duration: 0.3, ease: "easeOut" } }}
      className="group relative flex flex-col glass rounded-2xl overflow-hidden cursor-pointer transition-shadow duration-300 shadow-lg hover:shadow-[#9D174D]/20 hover:shadow-2xl max-w-full"
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
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-r from-black/20 to-transparent" />

      {/* Content */}
      <div className="absolute inset-0 flex flex-col justify-between p-5 md:p-6">
        {/* Top: Score Badge - Floating with some space */}
        <div className="absolute top-3 right-3 z-20">
          <div
            className="w-12 h-12 rounded-lg flex items-center justify-center backdrop-blur-md border border-white/10 shrink-0 shadow-lg"
            style={{
              background: `rgba(0, 0, 0, 0.65)`,
            }}
          >
            <span
              className="text-xl font-black font-[var(--font-outfit)] text-[#69E147]"
            >
              {total.toFixed(1)}
            </span>
          </div>
        </div>

        {/* Bottom: Text Content */}
        <div className="flex flex-col justify-end mt-auto overflow-hidden">
          {/* Genre Pills */}
          {genres.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-2 pr-14">
              {genres.slice(0, 3).map((genre, i) => {
                const genreName = typeof genre === 'string' ? genre : genre.name;
                return (
                  <span
                    key={i}
                    className="text-[10px] uppercase tracking-wider font-bold text-white bg-white/20 backdrop-blur-sm px-2 py-0.5 rounded-md"
                  >
                    {genreName}
                  </span>
                );
              })}
            </div>
          )}

          {/* Title */}
          <h3 className="text-xl md:text-2xl font-bold font-[var(--font-outfit)] text-white leading-tight mb-1 truncate">
            {review.title}
          </h3>

          {/* Release Year + Runtime */}
          {(review.release_date || review.runtime) && (
            <p className="text-xs font-semibold text-white/90 mb-2 flex items-center gap-1.5">
              {review.release_date && (
                <span>{new Date(review.release_date).getFullYear()}</span>
              )}
              {review.release_date && review.runtime && (
                <span className="text-white/50">·</span>
              )}
              {review.runtime && (
                <span>{review.runtime} min</span>
              )}
            </p>
          )}

          {/* Teaser */}
          {teaser && (
            <p className="text-sm text-white/60 line-clamp-2 mb-3 leading-relaxed">
              {teaser}
            </p>
          )}

          {/* CTA */}
          <div className="flex items-center gap-2 text-[#9D174D] text-xs font-bold uppercase tracking-wider group-hover:gap-3 transition-all duration-300">
            <span>{t('readReview')}</span>
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
      className="relative overflow-hidden rounded-lg border border-border-subtle"
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
