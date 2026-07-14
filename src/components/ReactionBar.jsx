import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { API_URL } from '../utils/constants';
import { cachedJson } from '../utils/apiCache';
import { useToast } from './Toast';
import { useLanguage } from './LanguageContext';

// Display-only labels per emoji. The emoji itself is the stored key; which
// emoji are *allowed* now comes from the backend (GET /reactions/palette) so
// the two can't drift out of sync. This list is only the fallback set used
// until/if that fetch fails, and the source of the human labels.
const LABELS = {
  '😍': '好愛', '😂': '笑死', '🥵': '很色', '😑': '超普', '😭': '哭爛', '💩': '超糞',
};
const DEFAULT_EMOJI = ['😍', '😂', '🥵', '😑', '😭', '💩'];

// A stable anonymous id per browser so "one reaction per person per review"
// can be enforced without any login. This is deduplication, not security.
function getClientId() {
  let id = localStorage.getItem('cinelog_client_id');
  if (!id) {
    id = crypto?.randomUUID?.() || `c_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    localStorage.setItem('cinelog_client_id', id);
  }
  return id;
}

export default function ReactionBar({ reviewId }) {
  const [counts, setCounts] = useState({});
  const [mine, setMine] = useState(null);
  const [busy, setBusy] = useState(false);
  const [emojis, setEmojis] = useState(DEFAULT_EMOJI);
  const { addToast } = useToast();
  const { t } = useLanguage();

  // The accepted emoji set is owned by the backend — fetch it so the buttons
  // can never offer an emoji the API would reject. Falls back to DEFAULT_EMOJI.
  // Through the cache: this is a static config list, and it was being re-fetched from
  // scratch on every mount of every ReactionBar — i.e. every single review you open.
  useEffect(() => {
    let cancelled = false;
    cachedJson(`${API_URL}/api/reviews/reactions/palette`)
      .then((data) => {
        if (!cancelled && Array.isArray(data?.emoji) && data.emoji.length) setEmojis(data.emoji);
      })
      .catch(() => { /* keep the fallback set */ });
    return () => { cancelled = true; };
  }, []);

  const load = useCallback(async () => {
    try {
      const res = await fetch(
        `${API_URL}/api/reviews/${reviewId}/reactions?client_id=${encodeURIComponent(getClientId())}`
      );
      if (!res.ok) return;
      const data = await res.json();
      setCounts(data.counts || {});
      setMine(data.your_reaction || null);
    } catch {
      /* reactions are non-critical — fail silently */
    }
  }, [reviewId]);

  useEffect(() => {
    if (reviewId) load();
  }, [reviewId, load]);

  const react = async (emoji) => {
    if (busy) return;
    setBusy(true);

    // Optimistic update so the tap feels instant; roll back on failure.
    const prevCounts = counts;
    const prevMine = mine;
    const next = { ...counts };
    if (mine === emoji) {
      next[emoji] = Math.max(0, (next[emoji] || 1) - 1);
      setMine(null);
    } else {
      if (mine) next[mine] = Math.max(0, (next[mine] || 1) - 1);
      next[emoji] = (next[emoji] || 0) + 1;
      setMine(emoji);
    }
    setCounts(next);

    try {
      const res = await fetch(`${API_URL}/api/reviews/${reviewId}/reactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emoji, client_id: getClientId() }),
      });
      if (!res.ok) throw new Error('API error');
      const data = await res.json();
      setCounts(data.counts || {});
      setMine(data.your_reaction || null);
    } catch {
      setCounts(prevCounts);
      setMine(prevMine);
      addToast(t('reactError'), 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-4 mb-8">
      <span className="block text-xs font-bold uppercase tracking-wider text-text-muted mb-3">
        {t('reactLabel')}
      </span>
      <div className="grid grid-cols-3 gap-2.5 max-w-md">
        {emojis.map((emoji) => {
          const label = LABELS[emoji] || '';
          const active = mine === emoji;
          const n = counts[emoji] || 0;
          return (
            <motion.button
              key={emoji}
              type="button"
              onClick={() => react(emoji)}
              whileTap={{ scale: 0.88 }}
              transition={{ type: 'spring', stiffness: 700, damping: 15, mass: 0.4 }}
              className={`flex items-center justify-center gap-1.5 px-2 py-2.5 rounded-2xl border-2 cursor-pointer ${
                active
                  ? 'bg-[#FE494A]/15 border-[#FE494A] shadow-sm shadow-[#FE494A]/20'
                  : 'bg-bg-card border-border-subtle hover:border-text-dim'
              }`}
            >
              <span className={`text-sm font-bold ${active ? 'text-[#FE494A]' : 'text-text-primary'}`}>
                {label}
              </span>
              {/* Re-mounts on toggle so the emoji springs/pops when (de)selected */}
              <motion.span
                key={active ? 'on' : 'off'}
                initial={{ scale: active ? 0.4 : 1 }}
                animate={{ scale: active ? 1.2 : 1 }}
                transition={{ type: 'spring', stiffness: 500, damping: 14 }}
                className="text-xl leading-none"
              >
                {emoji}
              </motion.span>
              {n > 0 && (
                <span className={`text-xs font-bold tabular-nums ${active ? 'text-[#FE494A]' : 'text-text-dim'}`}>
                  {n}
                </span>
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
