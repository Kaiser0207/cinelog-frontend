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
        
        <div className="absolute top-6 right-6 flex items-center gap-4 z-[60]" data-cursor="FILTER">
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="text-sm bg-[#E8E2D2] border border-border-subtle rounded-full px-5 py-2.5 font-bold uppercase tracking-wider focus:border-[#FFB6C1] outline-none text-[#1A1A1A] transition-all"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Genre Filter - Floating overlapping the title */}
      <div className="relative z-10 max-w-7xl mx-auto px-5 -mt-12 mb-16">
        <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-none items-center justify-center flex-wrap">
          {GENRE_PILLS.map((g) => {
            const isActive = (g === 'All' && genre === '') || genre === g;
            return (
              <button
                key={g}
                data-cursor={isActive ? '' : 'FILTER'}
                onClick={() => setGenre(g === 'All' ? '' : g)}
                className={`flex-shrink-0 px-6 py-2.5 text-sm font-bold font-[var(--font-jetbrains)] uppercase rounded-full transition-all duration-300 ${
                  isActive
                    ? 'bg-[#FFB6C1] text-black shadow-none border-none scale-105'
                    : 'bg-[#E8E2D2] border border-border-subtle text-[#1A1A1A]/70 hover:text-black hover:border-black/40 hover:-translate-y-0.5'
                }`}
              >
                {g}
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
        className="fixed bottom-6 right-6 z-[110] w-14 h-14 rounded-lg bg-[#CCFF00] hover:bg-[#D4FF00] text-black text-3xl font-black flex items-center justify-center transition-all shadow-lg border-none cursor-pointer"
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
