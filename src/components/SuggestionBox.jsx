import { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { API_URL, TMDB_IMG_BASE, formatDateTime } from '../utils/constants';
import { useToast } from './Toast';
import { useLanguage } from './LanguageContext';
import { useAdmin } from './AdminAuth';
import MovieSearch from './MovieSearch';
import { pressFx } from '../utils/motion';

// Heavy editor — lazy so it stays out of the main bundle until you adopt one.
const ReviewEditor = lazy(() => import('./ReviewEditor'));

/**
 * 電影推薦箱 — a public "suggestion box". Visitors recommend a title for Kaiser
 * to watch/review; submissions land in an admin-only inbox and ping Discord.
 *
 * Light/cream theme (bg ~#F0EAD6, text #1A1A1A) — all copy uses dark text
 * tokens and inputs inherit the global cream input style.
 */

export function SuggestionModal({ mode, onClose }) {
  const { password } = useAdmin();
  return mode === 'inbox' ? (
    <Inbox password={password} onClose={onClose} />
  ) : (
    <SuggestForm onClose={onClose} />
  );
}

export default function SuggestionBox() {
  const { t } = useLanguage();
  const { isAdmin } = useAdmin();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fx-btn inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#D480C0] hover:bg-[#FE494A] hover:text-white text-black font-extrabold text-xs md:text-sm uppercase tracking-wider transition-all duration-300 border-none shadow-sm active:scale-95 cursor-pointer"
      >
        <span className="btn-ico text-lg">{isAdmin ? '📥' : '🎬'}</span>
        {isAdmin ? t('inbox') : t('suggestBox')}
      </button>

      <AnimatePresence>
        {open && <SuggestionModal mode={isAdmin ? 'inbox' : 'form'} onClose={() => setOpen(false)} />}
      </AnimatePresence>
    </>
  );
}

// --------------------------------------------------------------------------
// Public submit form
// --------------------------------------------------------------------------

function SuggestForm({ onClose }) {
  const { t } = useLanguage();
  const { addToast } = useToast();
  const [picked, setPicked] = useState(null);
  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const handlePick = (movie) => {
    setPicked(movie);
    setTitle(movie.title || '');
  };

  const submit = async () => {
    const finalTitle = title.trim();
    if (!finalTitle) {
      addToast(t('suggestEmptyTitle'), 'info');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/api/suggestions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: finalTitle,
          tmdb_id: picked?.tmdb_id ?? null,
          media_type: picked?.media_type === 'tv' ? 'tv' : 'movie',
          poster_path: picked?.poster_path ?? null,
          note: note.trim() || null,
          submitter_name: name.trim() || null,
        }),
      });
      if (!res.ok) throw new Error('API error');
      addToast(t('suggestSuccess'), 'success');
      setDone(true);
      setTimeout(onClose, 900);
    } catch {
      addToast(t('suggestError'), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Backdrop onClose={onClose}>
      <h2 className="text-xl font-bold text-text-primary mb-1 flex items-center gap-2">🎬 {t('suggestTitle')}</h2>
      <p className="text-text-muted text-sm mb-5">{t('suggestSubtitle')}</p>

      <div className="space-y-4">
        <MovieSearch onSelect={handlePick} />

        <div>
          <label className="block text-sm text-text-muted mb-1.5 font-medium">{t('suggestTitleLabel')}</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t('suggestTitlePlaceholder')}
            className="w-full"
          />
        </div>

        <div>
          <label className="block text-sm text-text-muted mb-1.5 font-medium">{t('suggestNote')}</label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            maxLength={1000}
            placeholder={t('suggestNotePlaceholder')}
            className="w-full resize-none"
          />
        </div>

        <div>
          <label className="block text-sm text-text-muted mb-1.5 font-medium">{t('suggestName')}</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={60}
            placeholder={t('suggestNamePlaceholder')}
            className="w-full"
          />
        </div>

        <motion.button
          {...pressFx}
          onClick={submit}
          disabled={submitting || done}
          className={`fx-btn w-full py-3 rounded-full font-bold transition-colors disabled:opacity-60 border-none shadow-sm cursor-pointer ${
            done ? 'bg-emerald-500 text-white' : 'bg-[#FE494A] hover:bg-[#ff5e5f] text-black'
          }`}
        >
          {done ? `✓ ${t('sentLabel')}` : submitting ? '...' : t('suggestSubmit')}
        </motion.button>
      </div>
    </Backdrop>
  );
}

// --------------------------------------------------------------------------
// Admin inbox — status tabs + "adopt = jump into writing the review"
// --------------------------------------------------------------------------

function Inbox({ password, onClose }) {
  const { t } = useLanguage();
  const { addToast } = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('new');
  const [compose, setCompose] = useState(null);

  const auth = useCallback(
    (extra = {}) => ({ Authorization: `Bearer ${password}`, ...extra }),
    [password]
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/suggestions`, { headers: auth() });
      if (res.ok) setItems(await res.json());
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [auth]);

  useEffect(() => {
    load();
  }, [load]);

  const setStatus = async (id, status) => {
    try {
      const res = await fetch(`${API_URL}/api/suggestions/${id}`, {
        method: 'PATCH',
        headers: auth({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error('PATCH failed');
      const updated = await res.json();
      setItems((prev) => prev.map((it) => (it.id === id ? updated : it)));
    } catch {
      addToast(t('inboxError'), 'error');
    }
  };

  const remove = async (id) => {
    try {
      const res = await fetch(`${API_URL}/api/suggestions/${id}`, { method: 'DELETE', headers: auth() });
      if (!res.ok && res.status !== 204) throw new Error('DELETE failed');
      setItems((prev) => prev.filter((it) => it.id !== id));
    } catch {
      addToast(t('inboxError'), 'error');
    }
  };

  const movieOf = (it) => ({
    tmdb_id: it.tmdb_id,
    title: it.title,
    poster_path: it.poster_path,
    media_type: it.media_type,
  });

  // Adopt = mark adopted AND jump straight into writing the review, prefilled.
  const adopt = (it) => {
    setStatus(it.id, 'adopted');
    setCompose(movieOf(it));
  };

  // While composing, render only the editor (it's z-9000, below this z-9998
  // backdrop) — swap it in rather than stacking, then return to the list.
  if (compose) {
    return (
      <Suspense fallback={null}>
        <ReviewEditor
          initialMovie={compose.tmdb_id ? compose : null}
          onClose={() => setCompose(null)}
          onSaved={() => setCompose(null)}
        />
      </Suspense>
    );
  }

  const TABS = [
    { key: 'new', label: t('tabNew') },
    { key: 'adopted', label: t('tabAdopted') },
    { key: 'dismissed', label: t('tabDismissed') },
  ];
  const counts = { new: 0, adopted: 0, dismissed: 0 };
  items.forEach((it) => { if (counts[it.status] != null) counts[it.status] += 1; });
  const shown = items.filter((it) => it.status === filter);

  return (
    <Backdrop onClose={onClose} wide>
      <div className="flex justify-between items-center mb-4 border-b border-border-subtle pb-4">
        <h2 className="text-2xl font-bold text-text-primary">📥 {t('inbox')}</h2>
        <button onClick={onClose} className="text-text-muted hover:text-text-primary bg-transparent border-none cursor-pointer text-xl">✕</button>
      </div>

      {/* Status tabs */}
      <div className="flex gap-2 mb-4">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`flex-1 py-2 rounded-xl text-sm font-bold transition-colors cursor-pointer border ${
              filter === tab.key
                ? 'bg-[#FE494A] text-white border-[#FE494A]'
                : 'bg-bg-card text-text-muted border-border-subtle hover:text-text-primary'
            }`}
          >
            {tab.label}
            {counts[tab.key] > 0 && <span className="opacity-70"> ({counts[tab.key]})</span>}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-text-dim py-6 text-center">Loading...</p>
      ) : shown.length === 0 ? (
        <p className="text-sm text-text-dim py-8 text-center">{t('inboxEmpty')}</p>
      ) : (
        <ul className="space-y-3 m-0 p-0 list-none max-h-[55vh] overflow-y-auto">
          {shown.map((it) => (
            <li
              key={it.id}
              className={`flex gap-3 bg-bg-card px-4 py-3 rounded-xl border border-border-subtle ${
                it.status === 'dismissed' ? 'opacity-50' : ''
              }`}
            >
              {it.poster_path ? (
                <img src={`${TMDB_IMG_BASE}w92${it.poster_path}`} alt={it.title} className="w-14 h-20 object-cover rounded-md flex-shrink-0" />
              ) : (
                <div className="w-14 h-20 bg-bg-elevated rounded-md flex items-center justify-center flex-shrink-0 text-text-dim text-xs">
                  N/A
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-text-primary font-semibold text-base">{it.title}</p>
                {it.note && <p className="text-text-muted text-sm mt-1 whitespace-pre-wrap">{it.note}</p>}
                <p className="text-text-dim text-xs mt-1">
                  {it.submitter_name || '匿名'} · {formatDateTime(it.created_at)}
                </p>
                <div className="flex gap-4 mt-2 items-center">
                  {it.status === 'adopted' ? (
                    <button onClick={() => setCompose(movieOf(it))} className="text-sm font-bold text-[#FE494A] hover:opacity-70 bg-transparent border-none cursor-pointer p-0">
                      ✍️ {t('inboxWrite')}
                    </button>
                  ) : (
                    <button onClick={() => adopt(it)} className="text-sm font-bold text-emerald-600 hover:text-emerald-500 bg-transparent border-none cursor-pointer p-0">
                      ✓ {t('inboxAdopt')}
                    </button>
                  )}
                  {it.status !== 'dismissed' && (
                    <button onClick={() => setStatus(it.id, 'dismissed')} className="text-sm font-bold text-text-dim hover:text-text-muted bg-transparent border-none cursor-pointer p-0">
                      {t('inboxDismiss')}
                    </button>
                  )}
                  <button onClick={() => remove(it.id)} className="text-sm font-bold text-[#FE494A] hover:opacity-70 bg-transparent border-none cursor-pointer p-0 ml-auto">
                    🗑 {t('inboxDelete')}
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Backdrop>
  );
}

// --------------------------------------------------------------------------
// Shared modal shell (light/cream theme)
// --------------------------------------------------------------------------

function Backdrop({ children, onClose, wide = false }) {
  // Lock background scroll while the modal is open, otherwise touch-dragging
  // over the overlay scrolls the page behind it (mobile).
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9998] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 350 }}
        className={`bg-bg-surface border border-border-subtle p-6 rounded-2xl w-full shadow-2xl text-left text-text-primary ${wide ? 'max-w-xl' : 'max-w-md'}`}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </motion.div>
    </motion.div>
  );
}
