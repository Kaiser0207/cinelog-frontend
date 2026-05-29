import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { API_URL } from '../utils/constants';

export default function SpotifySearch({ onSelect }) {
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
      const res = await fetch(`${API_URL}/api/spotify/search?query=${encodeURIComponent(q)}`);
      if (res.ok) {
        const data = await res.json();
        setResults(data.tracks || data.results || data || []);
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

  const handleSelect = (track) => {
    onSelect(track);
    setQuery(`${track.name} — ${track.artist || track.artists?.[0]?.name || ''}`);
    setOpen(false);
    setResults([]);
  };

  return (
    <div className="relative" ref={containerRef}>
      <label className="block text-sm text-text-muted mb-1.5 font-medium">
        🎵 搜尋配樂 (Spotify)
      </label>
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={handleInputChange}
          placeholder="搜尋歌曲..."
          className="w-full pl-10"
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
            '🎧'
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
            className="absolute z-50 top-full mt-1 w-full bg-bg-elevated border border-border-subtle shadow-2xl rounded-xl max-h-64 overflow-y-auto"
          >
            {results.slice(0, 8).map((track, i) => {
              const albumArt = track.album_art_url || track.album_art || track.album?.images?.[2]?.url || track.image;
              const trackName = track.name || track.title;
              const artistName = track.artist || track.artists?.[0]?.name || '';

              return (
                <button
                  key={track.track_id || track.id || i}
                  type="button"
                  onClick={() => handleSelect(track)}
                  className="w-full flex items-center gap-3 p-3 hover:bg-white/5 transition-colors text-left"
                >
                  {albumArt ? (
                    <img
                      src={albumArt}
                      alt={trackName}
                      className="w-10 h-10 rounded-md object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 bg-bg-elevated rounded-md flex items-center justify-center flex-shrink-0">
                      <span className="text-lg">🎵</span>
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-text-primary text-sm font-medium truncate">
                      {trackName}
                    </p>
                    <p className="text-text-muted text-xs truncate">{artistName}</p>
                  </div>
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
