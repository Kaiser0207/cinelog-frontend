import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { TMDB_IMG_BASE, computeEntertainment, computeCinematic, computeTotal } from '../utils/constants';

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

  // Calculate random slight rotation for broken grid feel
  const rotation = index % 2 === 0 ? 1 : -1;

  return (
    <motion.article
      initial={{ opacity: 0, y: 50, rotate: 0 }}
      whileInView={{ opacity: 1, y: 0, rotate: rotation }}
      viewport={{ once: true, margin: "-50px" }}
      whileHover={{ scale: 1.02, rotate: 0, y: -5 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      onClick={() => navigate(`/review/${review.id}`)}
      className="relative group overflow-hidden border-2 border-[#1A1A1A] bg-[#1A1A1A] transition-all"
      style={{ aspectRatio: '4/5', boxShadow: '8px 8px 0px #1a1a1a' }}
    >
      {/* Background Image */}
      {backdropUrl ? (
        <img
          src={backdropUrl}
          alt={review.title}
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 group-hover:opacity-60 opacity-80 mix-blend-luminosity group-hover:mix-blend-normal"
          loading="lazy"
        />
      ) : (
        <div className="absolute inset-0 bg-bg-card" />
      )}

      {/* Retro Dither/Grain Overlay (simulated with CSS) */}
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay pointer-events-none" />

      {/* Gradients */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#1A1A1A] via-[#1a1a1a]/40 to-transparent" />

      {/* Content */}
      <div className="absolute inset-0 flex flex-col justify-end p-5 md:p-6 z-10">
        
        {/* Top: Score Badge */}
        <div className="absolute top-4 right-4">
          <div className="w-16 h-16 bg-accent-amber text-[#1A1A1A] flex items-center justify-center font-black font-[var(--font-bebas)] text-3xl rotate-3 shadow-[4px_4px_0px_#1a1a1a] group-hover:bg-accent-red group-hover:text-white transition-colors duration-300">
            {total.toFixed(1)}
          </div>
        </div>

        {/* Bottom: Text Content */}
        <div className="flex flex-col justify-end mt-auto">
          {/* Genre Pills */}
          {genres.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {genres.slice(0, 3).map((genre, i) => {
                const genreName = typeof genre === 'string' ? genre : genre.name;
                return (
                  <span
                    key={i}
                    className="text-[10px] uppercase tracking-widest font-black text-[#1A1A1A] bg-accent-amber px-2 py-1 -rotate-2"
                  >
                    {genreName}
                  </span>
                );
              })}
            </div>
          )}

          {/* Title */}
          <h3 className="text-4xl md:text-5xl lg:text-6xl font-black font-[var(--font-bebas)] text-[#F0EAD6] uppercase leading-none mb-3 drop-shadow-md group-hover:text-accent-red transition-colors duration-300">
            {review.title}
          </h3>

          {/* Teaser */}
          {teaser && (
            <p className="text-sm font-[var(--font-jetbrains)] text-[#F0EAD6]/70 line-clamp-2 mb-4 leading-relaxed group-hover:text-white">
              {teaser}
            </p>
          )}
        </div>
      </div>
    </motion.article>
  );
}

export function ReviewCardSkeleton() {
  return (
    <div
      className="relative overflow-hidden border-2 border-[#1A1A1A] bg-[#1A1A1A]"
      style={{ aspectRatio: '4/5', boxShadow: '8px 8px 0px #1a1a1a' }}
    >
      <div className="absolute inset-0 bg-[#E8E2D2] opacity-10 animate-pulse" />
      <div className="absolute inset-0 flex flex-col justify-end p-5">
        <div className="h-4 w-24 bg-[#E8E2D2]/20 mb-3" />
        <div className="h-10 w-3/4 bg-[#E8E2D2]/20 mb-3" />
        <div className="h-3 w-full bg-[#E8E2D2]/20 mb-2" />
        <div className="h-3 w-2/3 bg-[#E8E2D2]/20" />
      </div>
    </div>
  );
}
