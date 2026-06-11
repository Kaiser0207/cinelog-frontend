import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { API_URL } from '../utils/constants';
import { useToast } from './Toast';
import { useLanguage } from './LanguageContext';

// Must match ALLOWED_EMOJI in the backend reactions router.
const EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🔥'];

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
  const { addToast } = useToast();
  const { t } = useLanguage();

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
      <div className="flex flex-wrap items-center gap-3">
        {EMOJIS.map((e) => {
          const active = mine === e;
          const n = counts[e] || 0;
          return (
            <motion.button
              key={e}
              type="button"
              onClick={() => react(e)}
              whileHover={{ y: -3, scale: 1.06 }}
              whileTap={{ scale: 0.88 }}
              transition={{ type: 'spring', stiffness: 400, damping: 17 }}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl border-2 cursor-pointer ${
                active
                  ? 'bg-[#FE494A]/15 border-[#FE494A] shadow-sm shadow-[#FE494A]/20'
                  : 'bg-bg-card border-border-subtle hover:border-text-dim'
              }`}
            >
              {/* Re-mounts on toggle so the emoji springs/pops when (de)selected */}
              <motion.span
                key={active ? 'on' : 'off'}
                initial={{ scale: active ? 0.4 : 1 }}
                animate={{ scale: active ? 1.15 : 1 }}
                transition={{ type: 'spring', stiffness: 500, damping: 14 }}
                className="text-2xl leading-none"
              >
                {e}
              </motion.span>
              {n > 0 && (
                <span className={`font-bold tabular-nums text-sm ${active ? 'text-[#FE494A]' : 'text-text-primary'}`}>
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
