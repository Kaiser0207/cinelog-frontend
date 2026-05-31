import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion';
import ReviewFeed from '../components/ReviewFeed';
import ReviewEditor from '../components/ReviewEditor';
import { SORT_OPTIONS } from '../utils/constants';
import { useLanguage } from '../components/LanguageContext';
import { useAdmin } from '../components/AdminAuth';

export default function HomePage() {
  const [sort, setSort] = useState('newest');
  const [genre, setGenre] = useState('');
  const [showEditor, setShowEditor] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const { lang, toggleLanguage, t } = useLanguage();
  const { isAdmin, requireAuth, openDeviceManager } = useAdmin();
  const [sortOpen, setSortOpen] = useState(false);
  const sortRef = useRef(null);
  
  const clickCount = useRef(0);
  const clickTimer = useRef(null);
  
  const footerRef = useRef(null);
  const greenBtnRef = useRef(null);

  useEffect(() => {
    const handleScroll = () => {
      if (!footerRef.current || !greenBtnRef.current) return;
      const footerRect = footerRef.current.getBoundingClientRect();
      const buttonTop = window.innerHeight - 24 - 56; // bottom-6 (24px) + h-14 (56px)
      let clip = footerRect.top - buttonTop;
      clip = Math.max(0, Math.min(56, clip));
      greenBtnRef.current.style.clipPath = `inset(${clip}px 0 0 0)`;
    };
    
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleScroll);
    handleScroll(); // Initial check
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
    };
  }, []);

  const handleAdminTrigger = () => {
    clickCount.current += 1;
    
    if (clickTimer.current) clearTimeout(clickTimer.current);
    
    if (clickCount.current >= 5) {
      clickCount.current = 0;
      if (isAdmin) {
        openDeviceManager();
      } else {
        requireAuth(() => {});
      }
    } else {
      clickTimer.current = setTimeout(() => {
        clickCount.current = 0;
      }, 2000);
    }
  };

  // Close sort dropdown on outside click
  useEffect(() => {
    function handleClick(e) {
      if (sortRef.current && !sortRef.current.contains(e.target)) {
        setSortOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const { scrollY } = useScroll();
  const titleY = useTransform(scrollY, [0, 500], [0, 150]);
  const titleSkew = useTransform(scrollY, [0, 300], [0, -5]);
  const titleOpacity = useTransform(scrollY, [0, 300], [1, 0.2]);

  const GENRE_PILLS = [
    'All', 'Action', 'Comedy', 'Drama', 'Horror', 'Sci-Fi',
    'Thriller', 'Romance', 'Animation', 'Documentary',
  ];

  const handleSaved = () => {
    setRefreshKey((k) => k + 1);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen relative overflow-hidden"
    >
      {/* Massive Hero Section */}
      <div className="relative pt-24 pb-12 px-5 flex flex-col items-start md:items-center justify-center min-h-[40vh]">
        <motion.h1
          style={{ y: titleY, skewX: titleSkew, opacity: titleOpacity }}
          className="text-8xl md:text-[12rem] lg:text-[15rem] font-black font-[var(--font-bebas)] tracking-tighter text-[#1A1A1A] uppercase leading-none z-0"
        >
          <span className="md:hidden">CINE<br/>ROOMS</span>
          <span className="hidden md:inline">CINEROOMS</span>
        </motion.h1>
        
        <div className="absolute top-6 right-6 z-[60] flex items-center gap-3" data-cursor="FILTER">
          {/* Language Toggle Button */}
          <button
            onClick={toggleLanguage}
            className="flex items-center justify-center w-10 h-10 md:w-auto md:px-4 md:py-2.5 bg-[#E8E2D2] border border-border-subtle rounded-full font-bold text-xs uppercase tracking-wider text-[#1A1A1A] hover:bg-[#FFB6C1] transition-all cursor-pointer shadow-sm active:scale-95 border-none"
            title={lang === 'en' ? '切換成中文' : 'Switch to English'}
          >
            <span className="md:inline hidden mr-1">🌐</span>
            <span>{lang === 'en' ? '繁' : 'EN'}</span>
          </button>

            {/* Sort Dropdown - Custom Animated */}
            <div className="relative" ref={sortRef}>
              <button
                type="button"
                onClick={() => setSortOpen(!sortOpen)}
                className="appearance-none text-xs md:text-sm bg-[#E8E2D2] border border-border-subtle rounded-full pl-4 md:pl-5 pr-10 md:pr-12 py-2.5 font-bold uppercase tracking-wider focus:border-[#FFB6C1] outline-none text-[#1A1A1A] transition-all cursor-pointer flex items-center gap-2"
              >
                <span>{t(sort)}</span>
                <svg className={`w-4 h-4 absolute right-3 md:right-4 top-1/2 -translate-y-1/2 transition-transform duration-200 ${sortOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              <AnimatePresence>
                {sortOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -8, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8, scale: 0.96 }}
                    transition={{ duration: 0.15 }}
                    className="absolute z-50 top-full mt-1 right-0 min-w-[180px] glass overflow-hidden py-1 rounded-xl shadow-lg"
                  >
                    {SORT_OPTIONS.map((opt) => {
                      const isActive = sort === opt.value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => { setSort(opt.value); setSortOpen(false); }}
                          className="relative w-full flex items-center px-4 py-3 text-left transition-colors"
                        >
                          {isActive && (
                            <motion.div
                              layoutId="sort-selector-highlight"
                              className="absolute inset-0 bg-[#FFB6C1]/30 border-l-4 border-[#FFB6C1]"
                              initial={false}
                              transition={{ type: "spring", stiffness: 400, damping: 30 }}
                            />
                          )}
                          <span className={`relative z-10 text-sm font-bold uppercase tracking-wider ${
                            isActive ? 'text-[#1A1A1A]' : 'text-[#1A1A1A]/60'
                          }`}>
                            {t(opt.value)}
                          </span>
                        </button>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
        </div>
      </div>

      {/* Genre Filter - Floating overlapping the title */}
      <div className="relative z-10 w-full px-5 -mt-12 mb-16 overflow-hidden">
        <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-none items-center justify-start md:justify-center px-4 w-full">
          {GENRE_PILLS.map((g) => {
            const isActive = (g === 'All' && genre === '') || genre === g;
            return (
              <button
                key={g}
                data-cursor={isActive ? '' : 'FILTER'}
                onClick={() => setGenre(g === 'All' ? '' : g)}
                className={`group flex-shrink-0 px-6 py-2.5 rounded-full transition-all duration-300 hover:bg-[#69E147] hover:border-[#69E147] ${
                  isActive
                    ? 'bg-[#9D174D] shadow-none border-transparent'
                    : 'bg-[#E8E2D2] border border-border-subtle'
                }`}
              >
                <span className={`inline-block text-sm font-bold font-[var(--font-jetbrains)] uppercase transition-all duration-300 group-hover:text-black group-hover:scale-110 group-hover:font-black ${
                  isActive ? 'text-white' : 'text-[#1A1A1A]/70'
                }`}>
                  {t(g)}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Feed */}
      <main className="max-w-7xl mx-auto px-5 pb-24" key={refreshKey}>
        <ReviewFeed sort={sort} genre={genre} />
      </main>

      {/* Vibrant Blue Neo-brutalist Footer */}
      <div ref={footerRef} data-theme="blue" className="w-full bg-[#0000FF] text-white py-16 md:py-24 px-5 relative z-10">
        <div className="max-w-5xl mx-auto flex flex-col items-start md:items-center justify-center text-left md:text-center space-y-6 md:space-y-8">
          <div className="space-y-1">
            <h2 className="text-5xl md:text-6xl lg:text-7xl font-black font-[var(--font-bebas)] text-[#69E147] tracking-wider leading-none">
              <span className="md:hidden">CINE<br/>ROOMS</span>
              <span className="hidden md:inline">CINEROOMS</span>
            </h2>
            <p className="text-base md:text-2xl font-bold font-[var(--font-bebas)] text-[#69E147]/80 tracking-wider">
              {t('footerSubtitle')}
            </p>
          </div>
          <div className="w-16 h-1 bg-[#69E147] mx-auto rounded-full" />
          <p 
            className="max-w-2xl mx-auto text-xs md:text-base font-medium opacity-90 leading-relaxed font-[var(--font-inter)] text-white px-2 md:px-0"
            style={{ textAlign: 'justify', textJustify: 'inter-word' }}
          >
            {t('footerDesc')}
          </p>

          <a
            href="https://www.instagram.com/kaiser_liao/"
            target="_blank"
            rel="noopener noreferrer"
            className="group inline-flex items-center gap-3 px-6 md:px-8 py-3 rounded-full bg-[#69E147] hover:bg-[#9D174D] hover:text-white text-black font-extrabold transition-all duration-300 cursor-pointer mb-6 border-none shadow-sm active:scale-95 text-xs md:text-sm"
          >
            <span className="text-lg md:text-xl">📸</span>
            <span className="font-black uppercase tracking-wider transition-all duration-300 group-hover:scale-105">
              {t('followIg')}
            </span>
          </a>

          <div className="text-[10px] md:text-xs font-bold font-[var(--font-jetbrains)] text-white/50 border-t border-white/10 pt-8 w-full space-y-1">
            <p 
              onClick={handleAdminTrigger} 
              className="select-none cursor-pointer"
            >
              © {new Date().getFullYear()} CINEROOMS. {t('curatedBy')}
            </p>
            <p className="text-white/40">{t('disclaimer')}</p>
          </div>
        </div>
      </div>

      {/* FAB */}
      {isAdmin && (
          <motion.div
            onClick={() => setShowEditor(true)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="group fixed bottom-6 right-6 z-[110] w-14 h-14 rounded-lg cursor-pointer shadow-lg overflow-hidden"
          >
            {/* Bottom Layer: Beige background -> Dark Pink */}
            <div className="absolute inset-0 flex items-center justify-center text-3xl font-black bg-[#9D174D] group-hover:bg-[#69E147] group-hover:text-black text-white transition-all duration-300 pointer-events-none">
              +
            </div>
            {/* Top Layer: Blue background -> Neon Green (Clipped) */}
            <div 
              ref={greenBtnRef}
              style={{ clipPath: 'inset(56px 0 0 0)' }}
              className="absolute inset-0 flex items-center justify-center text-3xl font-black bg-[#69E147] group-hover:bg-[#9D174D] group-hover:text-white text-black transition-all duration-300 pointer-events-none"
            >
              +
            </div>
          </motion.div>
      )}

      {/* Editor Modal */}
      <AnimatePresence>
        {showEditor && (
          <ReviewEditor
            onClose={() => setShowEditor(false)}
            onSaved={handleSaved}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
