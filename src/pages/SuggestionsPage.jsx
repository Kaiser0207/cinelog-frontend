import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router';
import StaggeredMenu from '../components/StaggeredMenu';
import { SuggestionModal } from '../components/SuggestionBox';
import { useLanguage } from '../components/LanguageContext';
import { useAdmin } from '../components/AdminAuth';

/**
 * 推薦箱 / 收件匣 — a real page (/suggestions), not a floating modal.
 * Visitors get the submit form; the admin gets the inbox.
 */
export default function SuggestionsPage() {
  const { t } = useLanguage();
  const { isAdmin } = useAdmin();
  const navigate = useNavigate();

  useEffect(() => { window.scrollTo(0, 0); }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className="min-h-dvh relative overflow-x-clip pb-24"
    >
      <StaggeredMenu />

      <header className="px-5 pt-24 pb-8 max-w-xl mx-auto flex items-end justify-between gap-4">
        <h1 className="text-4xl md:text-6xl font-black font-nevis tracking-tighter text-[#1A1A1A] uppercase leading-none">
          {isAdmin ? t('inbox') || '收件匣' : t('navSuggest') || '推薦箱'}
        </h1>
        <button
          type="button"
          onClick={() => navigate('/')}
          className="shrink-0 h-11 px-4 rounded-full bg-[#E8E2D2] border border-[#1A1A1A]/10 text-xs font-black font-jetbrains uppercase tracking-wider text-[#1A1A1A] hover:bg-[#FE494A] hover:text-white transition-all shadow-sm active:scale-95"
        >
          ← {t('navHome') || '首頁'}
        </button>
      </header>

      <main className="px-5">
        <SuggestionModal
          mode={isAdmin ? 'inbox' : 'form'}
          page
          onClose={() => navigate('/')}
        />
      </main>
    </motion.div>
  );
}
