import React from 'react';
import { motion } from 'framer-motion';
import { useLanguage } from './LanguageContext';

export default function BottomNav({ onHomeClick, onSearchClick, onAddClick, onStatsClick, isAdmin }) {
  const { t } = useLanguage();

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-[110] bg-[#3B4856]/95 backdrop-blur-lg border-t border-white/10 pb-safe">
      <div className="flex items-center justify-around h-16 px-2">
        
        {/* Home */}
        <button 
          onClick={onHomeClick}
          className="flex flex-col items-center justify-center w-16 h-full gap-1 active:scale-95 transition-transform"
        >
          <span className="text-xl">🏠</span>
          <span className="text-[10px] font-bold font-[var(--font-jetbrains)] text-[#E8E2D2]/80 uppercase tracking-wider">
            {t('navHome') || 'Home'}
          </span>
        </button>

        {/* Add (Admin Only) */}
        {isAdmin && (
          <div className="relative -top-5">
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={onAddClick}
              className="w-14 h-14 rounded-full bg-[#FE494A] flex items-center justify-center shadow-lg shadow-[#FE494A]/30 border-4 border-[#3B4856]"
            >
              <span className="text-white text-2xl font-black">+</span>
            </motion.button>
          </div>
        )}

        {/* Search */}
        <button 
          onClick={onSearchClick}
          className="flex flex-col items-center justify-center w-16 h-full gap-1 active:scale-95 transition-transform"
        >
          <span className="text-xl">🔍</span>
          <span className="text-[10px] font-bold font-[var(--font-jetbrains)] text-[#E8E2D2]/80 uppercase tracking-wider">
            {t('navSearch') || 'Search'}
          </span>
        </button>

      </div>
    </div>
  );
}
