import { useState, useRef, useEffect, lazy, Suspense } from 'react';
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion';
import { useLocation, useNavigate } from 'react-router-dom';
import ReviewFeed from '../components/ReviewFeed';
import StaggeredMenu from '../components/StaggeredMenu';
import SearchOverlay from '../components/SearchOverlay';
import { SORT_OPTIONS } from '../utils/constants';
import { invalidateApiCache } from '../utils/apiCache';
import { useLanguage } from '../components/LanguageContext';
import { useAdmin } from '../components/AdminAuth';
import SuggestionBox from '../components/SuggestionBox';
import CurvedLoop from '../components/CurvedLoop';

const ReviewEditor = lazy(() => import('../components/ReviewEditor'));

export default function HomePage() {
  const [sort, setSort] = useState('watched');
  const [genre, setGenre] = useState('');
  const [mediaFilter, setMediaFilter] = useState('movie'); // 'movie' | 'tv' | 'anime' — always one media type, defaults to 電影 (no 'all')
  const [showEditor, setShowEditor] = useState(false);
  const [showSearchOverlay, setShowSearchOverlay] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  
  // Search State
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchMode, setSearchMode] = useState('standard');
  const searchTimeoutRef = useRef(null);

  const { lang, toggleLanguage, t } = useLanguage();
  const { isAdmin, requireAuth, openDeviceManager } = useAdmin();
  const location = useLocation();
  const navigate = useNavigate();
  const [sortOpen, setSortOpen] = useState(false);
  // 書脊牆 is the feed. 疊卡 is the alternative; the old grid and list views are
  // gone, so anyone carrying either of those in localStorage lands on the shelf.
  const [viewMode, setViewMode] = useState(
    () => (localStorage.getItem('cinelog_view_mode') === 'deck' ? 'deck' : 'shelf')
  );
  
  const activeGenreRef = useRef(null);

  // Land at the top of the feed on mount. Without this, returning from a review
  // keeps the document scrolled to wherever the *detail page* was, which then
  // maps to a random middle card here. Two frames so it wins over the route
  // crossfade / browser scroll-restoration that would otherwise re-apply.
  useEffect(() => {
    window.scrollTo(0, 0);
    const raf = requestAnimationFrame(() => window.scrollTo(0, 0));
    return () => cancelAnimationFrame(raf);
  }, []);

  // The nav's 搜尋 works from any page; off the feed it routes here and asks for
  // the overlay on arrival (the overlay lives on this page). Clear the flag so a
  // later back/forward doesn't silently reopen it.
  useEffect(() => {
    if (location.state?.openSearch) {
      setShowSearchOverlay(true);
      navigate('.', { replace: true, state: null });
    }
  }, [location.state, navigate]);

  useEffect(() => {
    localStorage.setItem('cinelog_view_mode', viewMode);
  }, [viewMode]);
  const sortRef = useRef(null);
  
  const clickCount = useRef(0);
  const clickTimer = useRef(null);
  
  const footerRef = useRef(null);
  const greenBtnRef = useRef(null);

  useEffect(() => {
    let ticking = false;

    const measure = () => {
      ticking = false;
      if (!footerRef.current || !greenBtnRef.current || !greenBtnRef.current.parentElement) return;
      const footerRect = footerRef.current.getBoundingClientRect();
      const buttonRect = greenBtnRef.current.parentElement.getBoundingClientRect();
      let clip = footerRect.top - buttonRect.top;
      clip = Math.max(0, Math.min(56, clip));
      greenBtnRef.current.style.clipPath = `inset(${clip}px 0 0 0)`;
    };

    // Coalesce to one measure per frame. Running two getBoundingClientRect()s and
    // a style write inline in the scroll handler forces a synchronous layout on
    // every single scroll event — which is exactly the kind of thing that makes
    // scrolling feel sticky.
    const handleScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(measure);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleScroll);
    measure(); // Initial check

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
    // Standard search filters fast; AI search stays debounced to avoid spamming the API
    const debounceMs = searchMode === 'ai' ? 1500 : 400;
    searchTimeoutRef.current = setTimeout(() => {
      setSearchQuery(val);
    }, debounceMs);
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

  const genreToKey = {
    '全部': 'All',
    '動作': 'Action',
    '喜劇': 'Comedy',
    '劇情': 'Drama',
    '恐怖': 'Horror',
    '科幻': 'Sci-Fi',
    '驚悚': 'Thriller',
    '愛情': 'Romance',
    '動畫': 'Animation',
    '懸疑': 'Mystery',
    '紀錄片': 'Documentary'
  };

  const handleSaved = () => {
    // Remounting the subtree is only half of it — without this the remounted feed just
    // reads the same cached responses straight back and the new review never appears.
    invalidateApiCache();
    setRefreshKey((k) => k + 1);
  };

  const handleHomeClick = () => {
    setShowSearchOverlay(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className="min-h-screen relative overflow-x-clip"
    >
      {/* Massive Hero Section */}
      <div className="relative pt-24 pb-12 px-5 flex flex-col items-start md:items-center justify-center min-h-[40vh]">
        <motion.h1
          onClick={handleAdminTrigger}
          style={{ y: titleY, skewX: titleSkew, opacity: titleOpacity }}
          className="text-8xl md:text-[12rem] lg:text-[15rem] font-black font-nevis tracking-tighter text-[#1A1A1A] uppercase leading-none z-0 select-none"
        >
          <span className="md:hidden">CINE<br/>ROOMS</span>
          <span className="hidden md:inline">CINEROOMS</span>
        </motion.h1>
        
        <div className="absolute top-6 right-5 md:right-6 z-[60] flex flex-col md:flex-row items-end md:items-center gap-3" data-cursor="FILTER">
          {/* Top Row: Language */}
          <div className="flex items-center gap-2 md:gap-3">
            {/* Desktop Search Bar (Hidden on Mobile) */}
            <div className="hidden md:flex relative items-center bg-[#E8E2D2] border border-[#1A1A1A]/10 rounded-full p-1 shadow-sm h-12 transition-all focus-within:ring-2 focus-within:ring-[#FE494A]/20 focus-within:border-[#FE494A]/30">
              <span className="pl-3 md:pl-4 pr-2 md:pr-3 text-[#1A1A1A]/50 text-xs md:text-sm">🔍</span>
              <input
                type="text"
                value={searchInput}
                onChange={handleSearchChange}
                placeholder={searchMode === 'ai' ? '描述你想看的感覺...' : '搜尋電影...'}
                className="bg-transparent border-none outline-none focus:ring-0 focus:outline-none text-base font-bold text-[#1A1A1A] placeholder:text-[#1A1A1A]/40 w-28 sm:w-32 md:w-48 py-2 md:py-2.5"
              />
              <button
                onClick={() => setSearchMode(prev => prev === 'standard' ? 'ai' : 'standard')}
                className={`ml-1 md:ml-2 px-3 py-1.5 md:px-4 md:py-2 rounded-full text-[10px] md:text-sm font-black font-jetbrains uppercase transition-all shrink-0 mr-0.5 md:mr-1 ${
                  searchMode === 'ai' 
                    ? 'bg-[#FE494A] text-[#E8E2D2] hover:bg-[#FE494A] shadow-sm' 
                    : 'bg-[#E8E2D2] shadow-sm text-[#FE494A] hover:bg-[#FE494A]'
                }`}
              >
                {searchMode === 'ai' ? '✦ AI' : '一般'}
              </button>
            </div>

            {/* Language Toggle — a circle, mirroring the nav hamburger opposite it */}
            <button
              onClick={toggleLanguage}
              className="flex items-center justify-center w-11 h-11 md:w-12 md:h-12 p-0 bg-[#E8E2D2] border-none rounded-full font-bold text-[11px] md:text-xs uppercase tracking-wider text-[#1A1A1A] hover:bg-[#FE494A] transition-all cursor-pointer shadow-sm active:scale-95 shrink-0"
              title={lang === 'en' ? '切換成中文' : 'Switch to English'}
            >
              {lang === 'en' ? '繁' : 'EN'}
            </button>
          </div>


        </div>
      </div>

      {/* Genre Filter (類型) — primary filter row. Floats up tight under the title
          (original design) via the negative top margin; everything below sits in
          normal flow after it, so the whole cluster rides up with it. */}
      <div className="relative z-10 w-full px-5 -mt-12 mb-5 overflow-hidden">
        <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-none items-center justify-start md:justify-center w-full">
          {GENRE_PILLS.map((g) => {
            const isActive = genre === g || (g === '全部' && genre === '');
            return (
              <motion.button
                key={g}
                ref={isActive ? activeGenreRef : null}
                whileTap={{ scale: 0.9 }}
                data-cursor={isActive ? '' : 'FILTER'}
                onClick={() => setGenre(g === '全部' ? '' : g)}
                className={`group flex-shrink-0 px-6 py-2.5 rounded-full transition-all duration-300 hover:bg-[#D480C0] hover:border-[#D480C0] ${
                  isActive
                    ? 'bg-[#FE494A] shadow-none border-transparent'
                    : 'bg-[#E8E2D2] border border-border-subtle'
                }`}
              >
                <span className={`inline-block text-sm font-bold font-jetbrains uppercase transition-all duration-300 group-hover:text-black group-hover:scale-110 group-hover:font-black ${
                  isActive ? 'text-white' : 'text-[#1A1A1A]/70'
                }`}>
                  {t(genreToKey[g]) || g}
                </span>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Media-type filter (影視) — three exclusive tabs (電影/影集/動漫), no '全部'
          option: exactly one is always active and it defaults to 電影. Same pill
          style and flex structure as the genre row above, so both share a left
          edge and read as one consistent control group. */}
      <div className="relative z-10 w-full px-5 mb-7 overflow-hidden">
        <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-none items-center justify-start md:justify-center w-full">
          {[
            { key: 'movie', zh: '電影', en: 'Film' },
            { key: 'tv', zh: '影集', en: 'Series' },
            { key: 'anime', zh: '動漫', en: 'Anime' },
          ].map((opt) => {
            const isActive = mediaFilter === opt.key;
            return (
              <motion.button
                key={opt.key}
                type="button"
                whileTap={{ scale: 0.9 }}
                data-cursor={isActive ? '' : 'FILTER'}
                onClick={() => setMediaFilter(opt.key)}
                className={`group flex-shrink-0 px-6 py-2.5 rounded-full transition-all duration-300 hover:bg-[#D480C0] hover:border-[#D480C0] ${
                  isActive
                    ? 'bg-[#FE494A] shadow-none border-transparent'
                    : 'bg-[#E8E2D2] border border-border-subtle'
                }`}
              >
                <span className={`inline-block text-sm font-bold font-jetbrains uppercase whitespace-nowrap transition-all duration-300 group-hover:text-black group-hover:scale-110 group-hover:font-black ${
                  isActive ? 'text-white' : 'text-[#1A1A1A]/70'
                }`}>
                  {lang === 'en' ? opt.en : opt.zh}
                </span>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Feed */}
      <main className="max-w-7xl mx-auto px-5 pb-32 md:pb-24" key={refreshKey}>
        {/*
          relative z-20: both feeds are pulled UP under this row by a negative
          margin (that's what gives them a bigger peek above the fold), and a
          transparent box still hit-tests — so without a stacking context of its
          own, this row would sit *behind* the feed and every tap on these buttons
          would be swallowed. Lifting it out of the way is what makes the peek safe.
        */}
        <div className="relative z-20 flex justify-between items-center mb-6">
          {/* View Mode Toggle — 書脊牆 (default) or 疊卡 */}
          <div className="flex bg-[#E8E2D2] rounded-full p-1 border border-border-subtle shadow-sm">
            {/* 書脊牆 — the collection as a shelf of spines */}
            <button
              type="button"
              onClick={() => setViewMode('shelf')}
              className={`p-2 rounded-full transition-all duration-200 ${viewMode === 'shelf' ? 'bg-[#FE494A] text-white shadow-sm' : 'text-[#1A1A1A]/40 hover:text-[#1A1A1A]'}`}
              title="Shelf View (書脊牆)"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" viewBox="0 0 24 24">
                <rect x="3" y="4" width="4" height="16" rx="1"></rect>
                <rect x="9" y="4" width="4" height="16" rx="1"></rect>
                <rect x="15" y="4" width="4" height="16" rx="1"></rect>
              </svg>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('deck')}
              className={`p-2 rounded-full transition-all duration-200 ${viewMode === 'deck' ? 'bg-[#FE494A] text-white shadow-sm' : 'text-[#1A1A1A]/40 hover:text-[#1A1A1A]'}`}
              title="Deck View (scroll to flip)"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" viewBox="0 0 24 24">
                <rect x="3" y="6" width="11" height="13" rx="2"></rect>
                <path d="M8 3h9a2 2 0 0 1 2 2v11"></path>
              </svg>
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

        <ReviewFeed
          sort={sort}
          genre={genre}
          media={mediaFilter}
          searchQuery={showSearchOverlay ? '' : searchQuery}
          searchMode={searchMode}
          viewMode={viewMode}
        />
      </main>

      {/* Cool Grey Neo-brutalist Footer */}
      <div ref={footerRef} data-theme="grey" className="w-full bg-[#3B4856] text-white py-16 pb-28 md:py-24 md:pb-24 px-5 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="max-w-5xl mx-auto flex flex-col items-start md:items-center justify-center text-left md:text-center space-y-6 md:space-y-8">
          <div className="w-full space-y-1">
            {/* The wordmark runs on a curve, endlessly. Drag it and it follows your
                finger, then keeps going the way you threw it. */}
            {/* Full-bleed, like the shelf: the wordmark has to enter at the true
                right edge of the SCREEN and leave at the true left edge. Confined to
                the footer's max-width it just looped inside a box. */}
            {/* Pulled up: the viewBox is tall enough to hold the sag of the curve, and
                the letters sit low in it — so the box reserves a band of empty space
                above the type that reads as a gap the design never asked for. */}
            <h2
              className="relative w-screen left-1/2 -ml-[50vw] -mt-6 md:-mt-12 text-[#D480C0]"
              aria-label="CINEROOMS"
            >
              <CurvedLoop
                marqueeText="CINEROOMS ✦ "
                speed={2.2}
                curveAmount={90}
                className="curved-loop-mark"
              />
            </h2>
            <p className="text-base md:text-2xl font-bold font-bebas text-[#D480C0]/80 tracking-wider">
              {t('footerSubtitle')}
            </p>
          </div>
          <div className="w-16 h-1 bg-[#D480C0] mx-auto rounded-full" />
          <p 
            className="max-w-2xl mx-auto text-xs md:text-base font-medium opacity-90 leading-relaxed font-inter text-white px-2 md:px-0"
            style={{ textAlign: 'justify', textJustify: 'inter-word' }}
          >
            {t('footerDesc')}
          </p>

          <a
            href="https://www.instagram.com/kaiser_liao/"
            target="_blank"
            rel="noopener noreferrer"
            data-cursor="INSTAGRAM"
            className="fx-btn group inline-flex items-center gap-3 px-6 md:px-8 py-3 rounded-full bg-[#D480C0] hover:bg-[#FE494A] hover:text-white text-black font-extrabold transition-all duration-300 cursor-pointer mb-6 border-none shadow-sm active:scale-95 text-xs md:text-sm"
          >
            <span className="btn-ico text-lg md:text-xl">📸</span>
            <span className="font-black uppercase tracking-wider transition-all duration-300 group-hover:scale-105">
              {t('followIg')}
            </span>
          </a>

          {/* Mobile uses the nav menu entry; keep a footer entry for desktop. */}
          <div className="hidden md:block">
            <SuggestionBox />
          </div>

          <div className="text-[10px] md:text-xs font-bold font-jetbrains text-white/50 border-t border-white/10 pt-8 w-full space-y-1">
            <p 
              onClick={handleAdminTrigger} 
              className="select-none cursor-pointer"
            >
              © {new Date().getFullYear()} CINEROOMS. {t('curatedBy')}
            </p>
            <p className="text-white/40">{t('disclaimer')}</p>
          </div>
        </motion.div>
      </div>

      {/* FAB */}
      {isAdmin && (
          <motion.div
            onClick={() => setShowEditor(true)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="group fixed bottom-[calc(4.25rem+env(safe-area-inset-bottom,0px)+0.5rem)] md:bottom-6 right-7 md:right-6 z-[110] w-14 h-14 rounded-lg cursor-pointer shadow-lg overflow-hidden"
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
      <Suspense fallback={null}>
        <AnimatePresence>
          {showEditor && (
            <ReviewEditor
              onClose={() => setShowEditor(false)}
              onSaved={handleSaved}
            />
          )}
        </AnimatePresence>

        <SearchOverlay
          isOpen={showSearchOverlay}
          onClose={() => setShowSearchOverlay(false)}
          searchInput={searchInput}
          searchQuery={searchQuery}
          onSearchChange={handleSearchChange}
          searchMode={searchMode}
          onModeToggle={() => setSearchMode(prev => prev === 'standard' ? 'ai' : 'standard')}
        />
      </Suspense>

      <StaggeredMenu
        onHomeClick={handleHomeClick}
        onSearchClick={() => setShowSearchOverlay(true)}
        searchOpen={showSearchOverlay}
      />
    </motion.div>
  );
}
