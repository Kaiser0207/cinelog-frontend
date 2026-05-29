import { useState, useRef } from 'react';
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion';
import ReviewFeed from '../components/ReviewFeed';
import ReviewEditor from '../components/ReviewEditor';
import { SORT_OPTIONS } from '../utils/constants';

export default function HomePage() {
  const [sort, setSort] = useState('newest');
  const [genre, setGenre] = useState('');
  const [showEditor, setShowEditor] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

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
      <div className="relative pt-24 pb-12 px-5 flex flex-col items-center justify-center min-h-[40vh]">
        <motion.h1
          style={{ y: titleY, skewX: titleSkew, opacity: titleOpacity }}
          className="text-8xl md:text-[12rem] lg:text-[15rem] font-black font-[var(--font-bebas)] tracking-tighter text-[#1A1A1A] uppercase leading-none z-0"
        >
          CINELOG
        </motion.h1>
        
        <div className="absolute top-6 right-6 z-[60]" data-cursor="FILTER">
          <div className="relative">
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="appearance-none text-sm bg-[#E8E2D2] border border-border-subtle rounded-full pl-5 pr-12 py-2.5 font-bold uppercase tracking-wider focus:border-[#FFB6C1] outline-none text-[#1A1A1A] transition-all cursor-pointer"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-[#1A1A1A]">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
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
                className={`group flex-shrink-0 px-6 py-2.5 rounded-full transition-all duration-300 hover:bg-[#D4FF00] hover:border-[#D4FF00] ${
                  isActive
                    ? 'bg-[#FFB6C1] shadow-none border-transparent'
                    : 'bg-[#E8E2D2] border border-border-subtle'
                }`}
              >
                <span className={`inline-block text-sm font-bold font-[var(--font-jetbrains)] uppercase transition-all duration-300 group-hover:text-black group-hover:scale-110 group-hover:font-black ${
                  isActive ? 'text-black' : 'text-[#1A1A1A]/70'
                }`}>
                  {g}
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

      {/* FAB */}
      <motion.button
        onClick={() => setShowEditor(true)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="fixed bottom-6 right-6 z-[110] w-14 h-14 rounded-lg bg-[#FE494A] hover:bg-[#ff6b6c] text-white text-3xl font-black flex items-center justify-center transition-all shadow-lg border-none cursor-pointer"
      >
        +
      </motion.button>

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
