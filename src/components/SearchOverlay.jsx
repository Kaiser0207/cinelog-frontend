import React, { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from './LanguageContext';
import ReviewFeed from './ReviewFeed';

export default function SearchOverlay({ isOpen, onClose, searchInput, searchQuery, onSearchChange, searchMode, onModeToggle }) {
  const { t } = useLanguage();
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current.focus(), 100);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-[120] bg-[#E8E2D2]/95 backdrop-blur-md flex flex-col md:hidden"
      >
        <div className="flex items-center p-4 border-b border-[#1A1A1A]/10">
          <button 
            onClick={onClose}
            className="p-3 mr-2 text-[#1A1A1A]/50 hover:text-[#1A1A1A]"
          >
            ←
          </button>
          
          <div className="relative flex-1 flex items-center bg-white border border-[#1A1A1A]/10 rounded-full p-1 shadow-sm h-12 focus-within:ring-2 focus-within:ring-[#FE494A]/20 focus-within:border-[#FE494A]/30">
            <span className="pl-4 pr-3 text-[#1A1A1A]/50 text-sm">🔍</span>
            <input
              ref={inputRef}
              type="text"
              value={searchInput}
              onChange={onSearchChange}
              placeholder={searchMode === 'ai' ? (t('searchAiPlaceholder') || 'Describe the feeling...') : (t('searchPlaceholder') || 'Search movies...')}
              className="bg-transparent border-none outline-none focus:ring-0 focus:outline-none text-base font-bold text-[#1A1A1A] placeholder:text-[#1A1A1A]/40 w-full py-2.5"
            />
            <button
              onClick={onModeToggle}
              className={`ml-2 px-4 py-2 rounded-full text-[10px] font-black font-jetbrains uppercase transition-all shrink-0 mr-1 ${
                searchMode === 'ai' 
                  ? 'bg-[#FE494A] text-[#E8E2D2] shadow-sm' 
                  : 'bg-[#E8E2D2] text-[#FE494A] shadow-sm'
              }`}
            >
              {searchMode === 'ai' ? '✦ AI' : (t('standard') || 'STD')}
            </button>
          </div>
        </div>
        
        <div className="flex-1 px-4 pb-4 overflow-y-auto">
          {searchInput ? (
            // Live results right inside the overlay — no need to close the screen
            <div className="pt-2">
              {searchQuery ? (
                <ReviewFeed
                  searchQuery={searchQuery}
                  searchMode={searchMode}
                  viewMode="list"
                />
              ) : (
                <p className="text-center text-sm font-bold text-[#1A1A1A]/40 mt-10">
                  {t('searchingFor') || 'Searching for'} "{searchInput}"…
                </p>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-6 mt-4">
              <h3 className="text-xs font-bold font-syne uppercase tracking-wider text-[#1A1A1A]/40">
                {t('searchTips') || 'Search Tips'}
              </h3>
              <div className="flex flex-col gap-3">
                <div className="bg-white/50 p-4 rounded-2xl border border-white/60">
                  <h4 className="font-bold text-sm text-[#1A1A1A] mb-1">{t('standardSearch') || 'Standard Search'}</h4>
                  <p className="text-xs text-[#1A1A1A]/60">{t('standardDesc') || 'Search by movie title, director, or cast members.'}</p>
                </div>
                <div className="bg-white/50 p-4 rounded-2xl border border-white/60">
                  <h4 className="font-bold text-sm text-[#FE494A] mb-1 flex items-center gap-1">✦ {t('aiSearch') || 'AI Semantic Search'}</h4>
                  <p className="text-xs text-[#1A1A1A]/60">{t('aiDesc') || 'Search by vibe, mood, or concepts. Example: "a movie about space travel and love"'}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
