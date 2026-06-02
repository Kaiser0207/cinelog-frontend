import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TMDB_IMG_BASE } from '../utils/constants';

export default function ReviewListRow({ review, index, onHover, onLeave, onClick, isExpanded, hasAnyExpanded, onToggleExpand }) {
  const { title, release_date, runtime, poster_path, created_at, emotion, pacing, acting, cinematography, soundtrack, color_palette } = review;
  const rating = ((emotion + pacing + acting + cinematography + soundtrack) / 5).toFixed(1);

  const palette = color_palette 
    ? (typeof color_palette === 'string' ? JSON.parse(color_palette) : color_palette)
    : [];

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

  const handleRowClick = () => {
    if (window.matchMedia('(hover: hover)').matches) {
      onClick(); // Navigate on desktop
    } else {
      onToggleExpand(); // Expand on mobile touch
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ 
        opacity: hasAnyExpanded && !isExpanded ? 0.3 : 1, 
        y: 0 
      }}
      transition={{ 
        opacity: { duration: 0.4 },
        y: { duration: 0.5, delay: (index % 10) * 0.05, ease: [0.22, 1, 0.36, 1] },
        layout: { duration: 0.4, ease: [0.22, 1, 0.36, 1] }
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`group relative flex flex-col py-4 px-2 border-b border-border-subtle hover:bg-[#FE494A]/10 transition-colors w-full overflow-hidden ${hasAnyExpanded && !isExpanded ? 'grayscale-[50%]' : ''}`}
    >
      {/* Row Header (Always visible) */}
      <div 
        onClick={handleRowClick}
        className="flex items-center gap-4 cursor-pointer w-full"
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
      </div>

      {/* Expanded Accordion Content (Mobile Only) */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0, marginTop: 0 }}
            animate={{ height: 'auto', opacity: 1, marginTop: 16 }}
            exit={{ height: 0, opacity: 0, marginTop: 0 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-col gap-4 overflow-hidden md:hidden"
          >
            {/* Expanded Poster */}
            {posterUrl && (
              <img 
                src={posterUrl} 
                alt={title} 
                className="w-full h-56 object-cover rounded-xl shadow-lg border border-black/10" 
              />
            )}

            {/* Title & Palette */}
            <div className="flex flex-col gap-2">
              <h2 className="text-3xl font-black font-[var(--font-syne)] tracking-tighter text-[#1A1A1A] leading-none uppercase">
                {title}
              </h2>
              {palette.length > 0 && (
                <div className="flex w-full h-3 rounded-full overflow-hidden shadow-inner opacity-80">
                  {palette.slice(0, 5).map((hex, i) => (
                    <div key={i} className="flex-1 h-full" style={{ backgroundColor: hex }} />
                  ))}
                </div>
              )}
            </div>

            {/* CTA Button */}
            <button 
              onClick={(e) => { e.stopPropagation(); onClick(); }}
              className="w-full mt-2 py-4 bg-[#FE494A] text-[#E8E2D2] font-black font-[var(--font-syne)] tracking-widest uppercase rounded-lg shadow-[4px_4px_0px_rgba(0,0,0,1)] active:translate-y-1 active:translate-x-1 active:shadow-[0px_0px_0px_rgba(0,0,0,1)] transition-all"
            >
              閱讀影評 (Read Full Review)
            </button>
          </motion.div>
        )}
      </AnimatePresence>

    </motion.div>
  );
}
