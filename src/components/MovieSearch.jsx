import { useState, useEffect, useRef, useCallback, useId } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { API_URL, TMDB_IMG_BASE, mediaCategory, MEDIA_BADGES } from '../utils/constants';
import { useLanguage } from './LanguageContext';

export default function MovieSearch({ onSelect, disabled = false }) {
  const { lang, t } = useLanguage();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const debounceRef = useRef(null);
  const requestRef = useRef(null);
  const containerRef = useRef(null);
  const listboxId = useId();
  const visibleResults = results.slice(0, 8);

  useEffect(() => {
    function handleClick(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
        setActiveIndex(-1);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  useEffect(() => () => {
    window.clearTimeout(debounceRef.current);
    requestRef.current?.abort();
  }, []);

  const search = useCallback(async (q) => {
    requestRef.current?.abort();
    if (!q || q.length < 2) {
      requestRef.current = null;
      setResults([]);
      setOpen(false);
      setActiveIndex(-1);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    requestRef.current = controller;
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/movies/search?query=${encodeURIComponent(q)}`, {
        signal: controller.signal,
      });
      if (!res.ok) throw new Error(`Movie search failed (${res.status})`);
      const data = await res.json();
      if (requestRef.current !== controller || controller.signal.aborted) return;
      const nextResults = data.results || data || [];
      setResults(nextResults);
      setOpen(nextResults.length > 0);
      setActiveIndex(-1);
    } catch (error) {
      if (requestRef.current !== controller || error.name === 'AbortError') return;
      setResults([]);
      setOpen(false);
      setActiveIndex(-1);
    } finally {
      if (requestRef.current === controller) {
        requestRef.current = null;
        setLoading(false);
      }
    }
  }, []);

  const handleInputChange = (e) => {
    const val = e.target.value;
    setQuery(val);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    requestRef.current?.abort();
    requestRef.current = null;
    setLoading(false);
    setOpen(false);
    setActiveIndex(-1);
    debounceRef.current = setTimeout(() => search(val), 300);
  };

  const handleSelect = (movie) => {
    window.clearTimeout(debounceRef.current);
    requestRef.current?.abort();
    requestRef.current = null;
    onSelect(movie);
    setQuery(movie.title);
    setOpen(false);
    setActiveIndex(-1);
    setResults([]);
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Escape') {
      setOpen(false);
      setActiveIndex(-1);
      return;
    }
    if (!open || visibleResults.length === 0) {
      if (event.key === 'ArrowDown' && results.length > 0) {
        event.preventDefault();
        setOpen(true);
        setActiveIndex(0);
      }
      return;
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((index) => (index + 1) % visibleResults.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((index) => (index <= 0 ? visibleResults.length - 1 : index - 1));
    } else if (event.key === 'Enter' && activeIndex >= 0) {
      event.preventDefault();
      handleSelect(visibleResults[activeIndex]);
    }
  };

  return (
    <div className="relative" ref={containerRef}>
      <label htmlFor={`${listboxId}-input`} className="block text-sm text-text-muted mb-1.5 font-medium">
        {t('movieSearchLabel')}
      </label>
      <div className="relative">
        <input
          type="text"
          id={`${listboxId}-input`}
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={open && visibleResults.length > 0}
          aria-controls={listboxId}
          aria-activedescendant={activeIndex >= 0 ? `${listboxId}-option-${activeIndex}` : undefined}
          aria-busy={loading}
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={(e) => {
            if (visibleResults.length > 0) setOpen(true);
            const input = e.target;
            setTimeout(() => input.scrollIntoView({ block: 'center', behavior: 'smooth' }), 300);
          }}
          placeholder={t('movieSearchPlaceholder')}
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
        <span className="sr-only" aria-live="polite">
          {loading
            ? t('movieSearchLoading')
            : open
              ? `${visibleResults.length} ${t('movieSearchResults')}`
              : ''}
        </span>
      </div>

      <AnimatePresence>
        {open && results.length > 0 && (
          <motion.div
            id={listboxId}
            role="listbox"
            aria-label={t('movieSearchResults')}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 top-full mt-1 w-full bg-bg-elevated border border-border-subtle shadow-2xl rounded-xl max-h-80 overflow-y-auto"
          >
            {visibleResults.map((movie, index) => (
              <button
                key={`${movie.media_type || 'movie'}-${movie.tmdb_id}`}
                id={`${listboxId}-option-${index}`}
                type="button"
                role="option"
                aria-selected={activeIndex === index}
                tabIndex={-1}
                onClick={() => handleSelect(movie)}
                onMouseEnter={() => setActiveIndex(index)}
                className={`w-full flex items-start gap-3 p-3 transition-colors text-left ${activeIndex === index ? 'bg-[#FE494A]/15' : 'hover:bg-black/5'}`}
              >
                {movie.poster_path ? (
                  <img
                    src={`${TMDB_IMG_BASE}w92${movie.poster_path}`}
                    alt=""
                    className="w-12 h-16 object-cover rounded-md flex-shrink-0"
                  />
                ) : (
                  <div className="w-12 h-16 bg-bg-elevated rounded-md flex items-center justify-center flex-shrink-0">
                    <span className="text-text-dim text-xs">{t('notAvailable')}</span>
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-text-primary font-semibold text-sm truncate">
                    {movie.title}
                  </p>
                  <p className="text-text-muted text-xs mt-0.5 flex items-center gap-1.5">
                    {(() => {
                      const badge = MEDIA_BADGES[mediaCategory(movie)];
                      return (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-[#1A1A1A]/8 text-[#1A1A1A] text-xs font-bold">
                          {badge.icon} {badge[lang]}
                        </span>
                      );
                    })()}
                    <span>{movie.release_date ? new Date(movie.release_date).getFullYear() : t('unknownYear')}</span>
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
