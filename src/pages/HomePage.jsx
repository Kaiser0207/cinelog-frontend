import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ReviewFeed from '../components/ReviewFeed';
import ReviewEditor from '../components/ReviewEditor';
import { SORT_OPTIONS } from '../utils/constants';

export default function HomePage() {
  const [sort, setSort] = useState('newest');
  const [genre, setGenre] = useState('');
  const [showEditor, setShowEditor] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

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
      className="min-h-screen"
    >
      {/* Header */}
      <header className="sticky top-0 z-50 bg-bg-deep/80 backdrop-blur-xl border-b border-border-subtle">
        <div className="max-w-7xl mx-auto px-5 py-4 flex items-center justify-between">
          <motion.h1
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-2xl md:text-3xl font-black font-[var(--font-outfit)] tracking-tight"
          >
            <span className="score-gradient">Cine</span>
            <span className="text-text-primary">Log</span>
          </motion.h1>

          {/* Sort Dropdown */}
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="text-sm bg-bg-card border border-border-subtle rounded-lg px-3 py-2 text-text-primary"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </header>

      {/* Genre Filter */}
      <div className="max-w-7xl mx-auto px-5 py-4">
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
          {GENRE_PILLS.map((g) => {
            const isActive = (g === 'All' && genre === '') || genre === g;
            return (
              <button
                key={g}
                onClick={() => setGenre(g === 'All' ? '' : g)}
                className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-accent-red text-white shadow-lg'
                    : 'bg-bg-card border border-border-subtle text-text-muted hover:text-text-primary hover:border-border-active'
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
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full bg-accent-red text-white text-2xl font-bold shadow-2xl flex items-center justify-center"
        style={{
          boxShadow: '0 0 24px rgba(229, 9, 20, 0.4), 0 8px 32px rgba(0, 0, 0, 0.5)',
        }}
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
