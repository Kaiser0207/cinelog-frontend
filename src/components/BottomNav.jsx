import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from './LanguageContext';
import { useAdmin } from './AdminAuth';
import { SuggestionModal } from './SuggestionBox';

export default function BottomNav({ onHomeClick, onSearchClick, onStatsClick }) {
  const { t } = useLanguage();
  const { isAdmin } = useAdmin();
  const [suggestOpen, setSuggestOpen] = useState(false);

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-[110]">
      {/* Liquid-glass background — translucent so the scrolling content blurs
          through it, with a specular gloss edge (see .glass-dark in index.css) */}
      <div className="glass-dark absolute inset-0" />
      
      <div
        className="relative flex items-center justify-around px-4"
        style={{
          height: 'calc(4.25rem + env(safe-area-inset-bottom, 0px))',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }}
      >
        
        {/* Home */}
        <button 
          onClick={onHomeClick}
          className="flex flex-col items-center justify-center gap-0.5 w-16 h-full active:scale-90 transition-transform"
        >
          <svg className="w-7 h-7 text-[#E8E2D2]/70" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
          <span className="text-[10px] font-bold font-jetbrains text-[#E8E2D2]/50 uppercase tracking-widest">
            {t('navHome') || 'Home'}
          </span>
        </button>



        {/* Search */}
        <button 
          onClick={onSearchClick}
          className="flex flex-col items-center justify-center gap-0.5 w-16 h-full active:scale-90 transition-transform cursor-pointer"
        >
          <svg className="w-7 h-7 text-[#E8E2D2]/70" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <span className="text-[10px] font-bold font-[var(--font-jetbrains)] text-[#E8E2D2]/50 uppercase tracking-widest">
            {t('navSearch') || 'Search'}
          </span>
        </button>

        {/* Stats */}
        <button 
          onClick={onStatsClick}
          className="flex flex-col items-center justify-center gap-0.5 w-16 h-full active:scale-90 transition-transform cursor-pointer"
        >
          <svg className="w-7 h-7 text-[#E8E2D2]/70" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
            <path d="M18 20V10" />
            <path d="M12 20V4" />
            <path d="M6 20V14" />
          </svg>
          <span className="text-[10px] font-bold font-[var(--font-jetbrains)] text-[#E8E2D2]/50 uppercase tracking-widest">
            {t('statistics') || 'Stats'}
          </span>
        </button>

        {/* Suggestion box (visitor) / Inbox (admin) */}
        <button
          onClick={() => setSuggestOpen(true)}
          className="flex flex-col items-center justify-center gap-0.5 w-16 h-full active:scale-90 transition-transform cursor-pointer"
        >
          <svg className="w-7 h-7 text-[#E8E2D2]/70" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
            <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
            <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
          </svg>
          <span className="text-[10px] font-bold font-[var(--font-jetbrains)] text-[#E8E2D2]/50 uppercase tracking-widest">
            {isAdmin ? t('navInbox') : t('navSuggest')}
          </span>
        </button>

      </div>

      <AnimatePresence>
        {suggestOpen && (
          <SuggestionModal mode={isAdmin ? 'inbox' : 'form'} onClose={() => setSuggestOpen(false)} />
        )}
      </AnimatePresence>
    </div>
  );
}
