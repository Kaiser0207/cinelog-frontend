import React from 'react';
import { motion } from 'framer-motion';
import { useLanguage } from './LanguageContext';

export default function BottomNav({ onHomeClick, onSearchClick, onAddClick, isAdmin }) {
  const { t } = useLanguage();

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-[110]">
      {/* Frosted glass background */}
      <div className="absolute inset-0 bg-[#2A333D]/90 backdrop-blur-2xl border-t border-white/[0.08]" />
      
      <div className="relative flex items-center justify-around h-[68px] px-4" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
        
        {/* Home */}
        <button 
          onClick={onHomeClick}
          className="flex flex-col items-center justify-center gap-0.5 w-16 h-full active:scale-90 transition-transform"
        >
          <svg className="w-[22px] h-[22px] text-[#E8E2D2]/70" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
          <span className="text-[9px] font-bold font-[var(--font-jetbrains)] text-[#E8E2D2]/50 uppercase tracking-widest">
            {t('navHome') || 'Home'}
          </span>
        </button>

        {/* Add Review (Center - elevated) */}
        {isAdmin && (
          <div className="relative -top-4">
            <motion.button
              whileTap={{ scale: 0.88 }}
              onClick={onAddClick}
              className="w-[52px] h-[52px] rounded-2xl bg-[#FE494A] flex items-center justify-center shadow-lg shadow-[#FE494A]/25 border-[3px] border-[#2A333D]"
            >
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" viewBox="0 0 24 24">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </motion.button>
          </div>
        )}

        {/* Search */}
        <button 
          onClick={onSearchClick}
          className="flex flex-col items-center justify-center gap-0.5 w-16 h-full active:scale-90 transition-transform"
        >
          <svg className="w-[22px] h-[22px] text-[#E8E2D2]/70" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <span className="text-[9px] font-bold font-[var(--font-jetbrains)] text-[#E8E2D2]/50 uppercase tracking-widest">
            {t('navSearch') || 'Search'}
          </span>
        </button>

      </div>
    </div>
  );
}
