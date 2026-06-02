import React from 'react';
import { motion } from 'framer-motion';
import { TMDB_IMG_BASE } from '../utils/constants';

export default function ReviewListRow({ review, index, onHover, onLeave, onClick }) {
  const { title, release_date, runtime, poster_path, created_at, emotion, pacing, acting, cinematography, soundtrack } = review;
  const rating = ((emotion + pacing + acting + cinematography + soundtrack) / 5).toFixed(1);

  const posterUrl = poster_path
    ? `${TMDB_IMG_BASE}w500${poster_path}`
    : null;

  const handleMouseEnter = () => {
    // Only trigger hover on devices that support hover (not touch devices)
    if (window.matchMedia('(hover: hover)').matches && posterUrl) {
      onHover(posterUrl);
    }
  };

  const handleMouseLeave = () => {
    if (window.matchMedia('(hover: hover)').matches) {
      onLeave();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ 
        opacity: { duration: 0.5, delay: (index % 10) * 0.05, ease: [0.22, 1, 0.36, 1] },
        y: { duration: 0.5, delay: (index % 10) * 0.05, ease: [0.22, 1, 0.36, 1] }
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
      className="group relative flex items-center gap-4 py-4 px-2 border-b border-border-subtle hover:bg-[#FE494A]/10 cursor-pointer transition-colors w-full overflow-hidden"
    >
      {/* Static Thumbnail */}
      <div className="w-12 h-16 rounded-md bg-neutral-800 overflow-hidden flex-shrink-0 relative block">
        {posterUrl ? (
          <img src={posterUrl} alt={title} className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-xs text-neutral-500">N/A</div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 flex flex-col md:flex-row md:items-center justify-between gap-2 md:gap-6">
        
        {/* Title & Year */}
        <div className="flex-1 min-w-0">
          <h3 className="text-base md:text-xl font-bold font-[var(--font-syne)] tracking-tighter text-[#1A1A1A] truncate group-hover:text-[#FE494A] transition-colors">
            {title}
          </h3>
          <p className="text-xs md:text-sm text-text-dim mt-0.5 font-[var(--font-jetbrains)] uppercase tracking-wide">
            {release_date ? new Date(release_date).getFullYear() : 'YYYY'} • {runtime || '--'} MIN
          </p>
        </div>

        {/* Rating & Date */}
        <div className="flex items-center gap-4 md:gap-8 flex-shrink-0">
          <div className="flex items-center gap-1.5 bg-[#E8E2D2] px-2 py-1 rounded-md text-black">
            <span className="text-xs">✨</span>
            <span className="text-sm font-black font-[var(--font-bebas)] text-[#FE494A] tracking-wider pt-0.5">{rating}</span>
          </div>
          
          <div className="text-xs text-text-dim font-[var(--font-jetbrains)] hidden sm:block">
            {new Date(created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </div>
        </div>
        
      </div>
    </motion.div>
  );
}
