import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion';
import ReviewFeed from '../components/ReviewFeed';
import ReviewEditor from '../components/ReviewEditor';
import { SORT_OPTIONS } from '../utils/constants';
import { useLanguage } from '../components/LanguageContext';
import { useAdmin } from '../components/AdminAuth';
import { useGyroscope } from '../hooks/useGyroscope';

export default function HomePage() {
  const [sort, setSort] = useState('newest');
  const [genre, setGenre] = useState('');
  const [showEditor, setShowEditor] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  
  // Search State
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchMode, setSearchMode] = useState('standard');
  const searchTimeoutRef = useRef(null);

  const { lang, toggleLanguage, t } = useLanguage();
  const { isAdmin, requireAuth, openDeviceManager } = useAdmin();
  const [sortOpen, setSortOpen] = useState(false);
  const [viewMode, setViewMode] = useState(() => localStorage.getItem('cinelog_view_mode') || 'grid');
  const { permissionGranted, requestPermission } = useGyroscope();

  useEffect(() => {
    localStorage.setItem('cinelog_view_mode', viewMode);
  }, [viewMode]);
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

  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearchInput(val);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => {
      setSearchQuery(val);
    }, 1500); // 防抖時間拉長至 1.5 秒，避免 AI Search 頻繁發送請求
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
    '全部', '動作', '喜劇', '劇情', '恐怖', '科幻',
    '驚悚', '愛情', '動畫', '懸疑',
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
          className="text-8xl md:text-[12rem] lg:text-[15rem] font-black font-[var(--font-syne)] tracking-tighter text-[#1A1A1A] uppercase leading-none z-0"
        >
          <span className="md:hidden">CINE<br/>ROOMS</span>
          <span className="hidden md:inline">CINEROOMS</span>
        </motion.h1>
        
        <div className="absolute top-6 right-5 md:right-6 z-[60] flex flex-col md:flex-row items-end md:items-center gap-3" data-cursor="FILTER">
          {/* Mobile Top Row: Search + Language */}
          <div className="flex items-center gap-2 md:gap-3">
            {/* Dual-Mode Search Bar */}
            <div className="relative flex items-center bg-[#E8E2D2] border border-[#1A1A1A]/10 rounded-full p-1 shadow-sm h-11 md:h-12 transition-all focus-within:ring-2 focus-within:ring-[#FE494A]/20 focus-within:border-[#FE494A]/30">
              <span className="pl-3 md:pl-4 pr-2 md:pr-3 text-[#1A1A1A]/50 text-xs md:text-sm">🔍</span>
              <input
                type="text"
                value={searchInput}
                onChange={handleSearchChange}
                placeholder={searchMode === 'ai' ? '描述你想看的感覺...' : '搜尋電影...'}
                className="bg-transparent border-none outline-none focus:ring-0 focus:outline-none text-xs md:text-base font-bold text-[#1A1A1A] placeholder:text-[#1A1A1A]/40 w-28 sm:w-32 md:w-48 py-2 md:py-2.5"
              />
              <button
                onClick={() => setSearchMode(prev => prev === 'standard' ? 'ai' : 'standard')}
                className={`ml-1 md:ml-2 px-3 py-1.5 md:px-4 md:py-2 rounded-full text-[10px] md:text-sm font-black font-[var(--font-jetbrains)] uppercase transition-all shrink-0 mr-0.5 md:mr-1 ${
                  searchMode === 'ai' 
                    ? 'bg-[#FE494A] text-[#E8E2D2] hover:bg-[#FE494A] shadow-sm' 
                    : 'bg-[#E8E2D2] shadow-sm text-[#FE494A] hover:bg-[#FE494A]'
                }`}
              >
                {searchMode === 'ai' ? '✦ AI' : '一般'}
              </button>
            </div>

            {/* Language Toggle Button */}
            <button
              onClick={toggleLanguage}
              className="flex items-center justify-center h-11 md:h-12 px-3 md:px-4 md:py-2.5 bg-[#E8E2D2] border-none rounded-full font-bold text-[10px] md:text-xs uppercase tracking-wider text-[#1A1A1A] hover:bg-[#FE494A] transition-all cursor-pointer shadow-sm active:scale-95 shrink-0"
              title={lang === 'en' ? '切換成中文' : 'Switch to English'}
            >
              <span className="md:inline hidden mr-1">🌐</span>
              <span>{lang === 'en' ? '繁' : 'EN'}</span>
            </button>
          </div>


        </div>
      </div>

      {/* Genre Filter - Floating overlapping the title */}
      <div className="relative z-10 w-full px-5 -mt-12 mb-16 overflow-hidden">
        <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-none items-center justify-start md:justify-center px-4 w-full">
          {GENRE_PILLS.map((g) => {
            const isActive = genre === g || (g === '全部' && genre === '');
            return (
              <button
                key={g}
                data-cursor={isActive ? '' : 'FILTER'}
                onClick={() => setGenre(g === '全部' ? '' : g)}
                className={`group flex-shrink-0 px-6 py-2.5 rounded-full transition-all duration-300 hover:bg-[#D480C0] hover:border-[#D480C0] ${
                  isActive
                    ? 'bg-[#FE494A] shadow-none border-transparent'
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
        {/* Sort Dropdown aligned to the right */}
        <div className="flex justify-between items-center mb-6">
          {/* View Mode Toggle */}
          <div className="flex bg-[#E8E2D2] rounded-full p-1 border border-border-subtle shadow-sm">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-full transition-all duration-200 ${viewMode === 'grid' ? 'bg-[#FE494A] text-white shadow-sm' : 'text-[#1A1A1A]/40 hover:text-[#1A1A1A]'}`}
              title="Grid View"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <rect x="3" y="3" width="7" height="7"></rect>
                <rect x="14" y="3" width="7" height="7"></rect>
                <rect x="14" y="14" width="7" height="7"></rect>
                <rect x="3" y="14" width="7" height="7"></rect>
              </svg>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-full transition-all duration-200 ${viewMode === 'list' ? 'bg-[#FE494A] text-white shadow-sm' : 'text-[#1A1A1A]/40 hover:text-[#1A1A1A]'}`}
              title="List View"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" viewBox="0 0 24 24">
                <line x1="8" y1="6" x2="21" y2="6"></line>
                <line x1="8" y1="12" x2="21" y2="12"></line>
                <line x1="8" y1="18" x2="21" y2="18"></line>
                <line x1="3" y1="6" x2="3.01" y2="6"></line>
                <line x1="3" y1="12" x2="3.01" y2="12"></line>
                <line x1="3" y1="18" x2="3.01" y2="18"></line>
              </svg>
            </button>
          </div>

          {/* 3D Gyroscope Toggle (Mobile Only) */}
          <div className="md:hidden flex ml-3 bg-[#E8E2D2] rounded-full p-1 border border-border-subtle shadow-sm">
            <button
              type="button"
              onClick={requestPermission}
              className={`px-3 py-1.5 rounded-full transition-all duration-200 text-xs font-bold uppercase tracking-wider ${permissionGranted ? 'bg-[#FE494A] text-white shadow-sm' : 'text-[#1A1A1A]/40 hover:text-[#1A1A1A]'}`}
              title="3D Tilt View"
            >
              3D View
            </button>
          </div>
          
          <div className="flex-1" />

          {/* Sort Dropdown aligned to the right */}
          <div className="relative" ref={sortRef}>
            <button
              type="button"
              onClick={() => setSortOpen(!sortOpen)}
              className="appearance-none text-xs md:text-sm bg-[#E8E2D2] border border-border-subtle rounded-full pl-4 md:pl-5 pr-10 md:pr-12 py-2 md:py-2.5 h-10 md:h-11 font-bold uppercase tracking-wider focus:border-[#FE494A] outline-none text-[#1A1A1A] transition-all cursor-pointer flex items-center gap-2 shadow-sm"
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
                            className="absolute inset-0 bg-[#FE494A]/30 border-l-4 border-[#FE494A]"
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

        <ReviewFeed sort={sort} genre={genre} searchQuery={searchQuery} searchMode={searchMode} viewMode={viewMode} gyroPermission={permissionGranted} />
      </main>

      {/* Vibrant Blue Neo-brutalist Footer */}
      <div ref={footerRef} data-theme="blue" className="w-full bg-[#0000FF] text-white py-16 md:py-24 px-5 relative z-10">
        <div className="max-w-5xl mx-auto flex flex-col items-start md:items-center justify-center text-left md:text-center space-y-6 md:space-y-8">
          <div className="space-y-1">
            <h2 className="text-5xl md:text-6xl lg:text-7xl font-black font-[var(--font-bebas)] text-[#D480C0] tracking-wider leading-none">
              <span className="md:hidden">CINE<br/>ROOMS</span>
              <span className="hidden md:inline">CINEROOMS</span>
            </h2>
            <p className="text-base md:text-2xl font-bold font-[var(--font-bebas)] text-[#D480C0]/80 tracking-wider">
              {t('footerSubtitle')}
            </p>
          </div>
          <div className="w-16 h-1 bg-[#D480C0] mx-auto rounded-full" />
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
            data-cursor="INSTAGRAM"
            className="group inline-flex items-center gap-3 px-6 md:px-8 py-3 rounded-full bg-[#D480C0] hover:bg-[#FE494A] hover:text-white text-black font-extrabold transition-all duration-300 cursor-pointer mb-6 border-none shadow-sm active:scale-95 text-xs md:text-sm"
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
            <div className="absolute inset-0 flex items-center justify-center text-3xl font-black bg-[#FE494A] group-hover:bg-[#D480C0] group-hover:text-black text-white transition-all duration-300 pointer-events-none">
              +
            </div>
            {/* Top Layer: Blue background -> Neon Green (Clipped) */}
            <div 
              ref={greenBtnRef}
              style={{ clipPath: 'inset(56px 0 0 0)' }}
              className="absolute inset-0 flex items-center justify-center text-3xl font-black bg-[#D480C0] group-hover:bg-[#FE494A] group-hover:text-white text-black transition-all duration-300 pointer-events-none"
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
