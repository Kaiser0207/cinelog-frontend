import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { API_URL, TMDB_IMG_BASE } from '../utils/constants';
import { useToast } from './Toast';
import { useLanguage } from './LanguageContext';
import { useAdmin } from './AdminAuth';
import MovieSearch from './MovieSearch';

/**
 * 電影推薦箱 — a public "suggestion box". Any visitor can recommend a title
 * for Kaiser to watch/review; submissions land in an admin-only inbox and
 * ping Discord. Self-contained: renders its own trigger button(s) + modals,
 * so the host page only needs to drop in <SuggestionBox />.
 */
export default function SuggestionBox() {
  const { t } = useLanguage();
  const { isAdmin, password } = useAdmin();
  const [showForm, setShowForm] = useState(false);
  const [showInbox, setShowInbox] = useState(false);

  return (
    <>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <button
          onClick={() => setShowForm(true)}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#D480C0] hover:bg-[#FE494A] hover:text-white text-black font-extrabold text-xs md:text-sm uppercase tracking-wider transition-all duration-300 border-none shadow-sm active:scale-95 cursor-pointer"
        >
          <span className="text-lg">🎬</span>
          {t('suggestBox')}
        </button>

        {isAdmin && (
          <button
            onClick={() => setShowInbox(true)}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-white/10 hover:bg-white/20 text-white font-bold text-xs md:text-sm uppercase tracking-wider transition-all border border-white/15 cursor-pointer"
          >
            <span className="text-base">📥</span>
            {t('inbox')}
          </button>
        )}
      </div>

      <AnimatePresence>
        {showForm && <SuggestForm key="form" onClose={() => setShowForm(false)} />}
        {showInbox && <Inbox key="inbox" password={password} onClose={() => setShowInbox(false)} />}
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
      onClose();
    } catch {
      addToast(t('suggestError'), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Backdrop onClose={onClose}>
      <h2 className="text-xl font-bold text-white mb-1 flex items-center gap-2">🎬 {t('suggestTitle')}</h2>
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
            className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white text-sm"
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
            className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white text-sm resize-none"
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
            className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white text-sm"
          />
        </div>

        <button
          onClick={submit}
          disabled={submitting}
          className="w-full py-3 rounded-full bg-[#FE494A] hover:bg-[#ff5e5f] text-black font-bold transition-all disabled:opacity-50 border-none shadow-sm cursor-pointer"
        >
          {submitting ? '...' : t('suggestSubmit')}
        </button>
      </div>
    </Backdrop>
  );
}

// --------------------------------------------------------------------------
// Admin inbox
// --------------------------------------------------------------------------

function Inbox({ password, onClose }) {
  const { t } = useLanguage();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

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
      if (res.ok) {
        const updated = await res.json();
        setItems((prev) => prev.map((it) => (it.id === id ? updated : it)));
      }
    } catch {
      /* ignore */
    }
  };

  const remove = async (id) => {
    try {
      const res = await fetch(`${API_URL}/api/suggestions/${id}`, { method: 'DELETE', headers: auth() });
      if (res.ok || res.status === 204) setItems((prev) => prev.filter((it) => it.id !== id));
    } catch {
      /* ignore */
    }
  };

  const STATUS_STYLE = {
    new: 'bg-[#FE494A]/15 text-[#FE494A]',
    adopted: 'bg-emerald-500/15 text-emerald-400',
    dismissed: 'bg-white/10 text-white/40',
  };

  return (
    <Backdrop onClose={onClose} wide>
      <div className="flex justify-between items-center mb-5 border-b border-white/10 pb-4">
        <h2 className="text-xl font-bold text-white">📥 {t('inbox')}</h2>
        <button onClick={onClose} className="text-text-muted hover:text-white bg-transparent border-none cursor-pointer">✕</button>
      </div>

      {loading ? (
        <p className="text-sm text-text-dim">Loading...</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-text-dim py-6 text-center">{t('inboxEmpty')}</p>
      ) : (
        <ul className="space-y-3 m-0 p-0 list-none max-h-[60vh] overflow-y-auto">
          {items.map((it) => (
            <li
              key={it.id}
              className={`flex gap-3 bg-black/30 px-4 py-3 rounded-xl border border-white/5 ${
                it.status === 'dismissed' ? 'opacity-50' : ''
              }`}
            >
              {it.poster_path ? (
                <img
                  src={`${TMDB_IMG_BASE}w92${it.poster_path}`}
                  alt={it.title}
                  className="w-12 h-16 object-cover rounded-md flex-shrink-0"
                />
              ) : (
                <div className="w-12 h-16 bg-bg-elevated rounded-md flex items-center justify-center flex-shrink-0 text-text-dim text-xs">
                  N/A
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-white font-semibold text-sm">{it.title}</p>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${STATUS_STYLE[it.status] || ''}`}>
                    {it.status}
                  </span>
                </div>
                {it.note && <p className="text-text-muted text-xs mt-1 whitespace-pre-wrap">{it.note}</p>}
                <p className="text-text-dim text-[11px] mt-1">
                  {it.submitter_name || '匿名'} · {it.created_at ? new Date(it.created_at).toLocaleString() : ''}
                </p>
                <div className="flex gap-2 mt-2">
                  <button onClick={() => setStatus(it.id, 'adopted')} className="text-[11px] font-bold text-emerald-400 hover:text-emerald-300 bg-transparent border-none cursor-pointer p-0">
                    ✓ {t('inboxAdopt')}
                  </button>
                  <button onClick={() => setStatus(it.id, 'dismissed')} className="text-[11px] font-bold text-white/40 hover:text-white/70 bg-transparent border-none cursor-pointer p-0">
                    {t('inboxDismiss')}
                  </button>
                  <button onClick={() => remove(it.id)} className="text-[11px] font-bold text-red-400 hover:text-red-300 bg-transparent border-none cursor-pointer p-0 ml-auto">
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
// Shared modal shell
// --------------------------------------------------------------------------

function Backdrop({ children, onClose, wide = false }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[9998] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 350 }}
        className={`bg-bg-card border border-white/10 p-6 rounded-2xl w-full shadow-2xl text-left ${wide ? 'max-w-lg' : 'max-w-md'}`}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </motion.div>
    </motion.div>
  );
}
