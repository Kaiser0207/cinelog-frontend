import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { API_URL } from '../utils/constants';
import { useToast } from './Toast';
import { useLanguage } from './LanguageContext';
import { pressFx } from '../utils/motion';

export default function TLDRButton({ reviewText, movieTitle }) {
  const [tldr, setTldr] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const { addToast } = useToast();
  const { t } = useLanguage();

  if (!reviewText || reviewText.trim().length < 50) return null;

  const fetchTldr = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/ai/tldr`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ review_text: reviewText, movie_title: movieTitle }),
      });
      if (!res.ok) throw new Error('API error');
      const data = await res.json();
      setTldr(data.tldr);
      setIsOpen(true);
      addToast(t('aiTldrSuccess'), 'success');
    } catch {
      addToast(t('aiTldrError'), 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-3 mb-6">
      <motion.button
        onClick={fetchTldr}
        disabled={loading}
        {...pressFx}
        className="fx-btn inline-flex items-center gap-2 px-5 py-2 rounded-full bg-[#FE494A] text-black text-sm font-bold shadow-sm hover:bg-[#ff5e5f] transition-colors disabled:opacity-50 cursor-pointer border-none"
      >
        {loading ? (
          <motion.span
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
            className="inline-block"
          >
            ✦
          </motion.span>
        ) : (
          <span className="btn-ico">✦</span>
        )}
        {loading ? t('aiTldrLoading') : tldr ? t('aiTldrRetry') : t('aiTldr')}
      </motion.button>

      <AnimatePresence>
        {isOpen && tldr && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="overflow-hidden mt-3"
          >
            <div className="p-4 bg-[#1A1A1A] rounded-xl border-l-4 border-[#FE494A]">
              <p className="text-sm text-white/90 font-[var(--font-syne)] leading-relaxed">
                {tldr}
              </p>
              <button
                onClick={() => setIsOpen(false)}
                className="mt-2 text-[10px] text-white/30 hover:text-white/60 transition-colors cursor-pointer"
              >
                收起 (Collapse)
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
