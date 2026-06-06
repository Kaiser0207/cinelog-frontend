import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { API_URL, TMDB_IMG_BASE } from '../utils/constants';

export default function MovieSearch({ onSelect, disabled = false }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    function handleClick(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const search = useCallback(async (q) => {
    if (!q || q.length < 2) {
      setResults([]);
      setOpen(false);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/movies/search?query=${encodeURIComponent(q)}`);
      if (res.ok) {
        const data = await res.json();
        setResults(data.results || data || []);
        setOpen(true);
      }
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleInputChange = (e) => {
    const val = e.target.value;
    setQuery(val);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(val), 300);
  };

  const handleSelect = (movie) => {
    onSelect(movie);
    setQuery(movie.title);
    setOpen(false);
    setResults([]);
  };

  return (
    <div className="relative" ref={containerRef}>
      <label className="block text-sm text-text-muted mb-1.5 font-medium">搜尋電影 (TMDB)</label>
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={(e) => setTimeout(() => e.target.scrollIntoView({ block: 'center', behavior: 'smooth' }), 300)}
          placeholder="輸入電影名稱..."
          disabled={disabled}
          className={`w-full pl-10 ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        />
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted">
          {loading ? (
            <motion.span
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }}
              className="inline-block"
            >
              ⟳
            </motion.span>
          ) : (
            '🔍'
          )}
        </span>
      </div>

      <AnimatePresence>
        {open && results.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 top-full mt-1 w-full bg-bg-elevated border border-border-subtle shadow-2xl rounded-xl max-h-80 overflow-y-auto"
          >
            {results.slice(0, 8).map((movie) => (
              <button
                key={movie.tmdb_id}
                type="button"
                onClick={() => handleSelect(movie)}
                className="w-full flex items-start gap-3 p-3 hover:bg-white/5 transition-colors text-left"
              >
                {movie.poster_path ? (
                  <img
                    src={`${TMDB_IMG_BASE}w92${movie.poster_path}`}
                    alt={movie.title}
                    className="w-12 h-16 object-cover rounded-md flex-shrink-0"
                  />
                ) : (
                  <div className="w-12 h-16 bg-bg-elevated rounded-md flex items-center justify-center flex-shrink-0">
                    <span className="text-text-dim text-xs">N/A</span>
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-text-primary font-semibold text-sm truncate">
                    {movie.title}
                  </p>
                  <p className="text-text-muted text-xs mt-0.5">
                    {movie.release_date ? new Date(movie.release_date).getFullYear() : 'Unknown'}
                  </p>
                  {movie.overview && (
                    <p className="text-text-dim text-xs mt-1 line-clamp-2">
                      {movie.overview}
                    </p>
                  )}
                </div>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
