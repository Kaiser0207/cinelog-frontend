import { motion } from 'framer-motion';
import { Link } from 'react-router';
import { useLanguage } from '../components/LanguageContext';

export default function NotFoundPage() {
  const { lang } = useLanguage();
  return (
    <motion.main
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-dvh flex items-center justify-center px-6 text-center"
    >
      <div>
        <p className="text-sm font-black font-jetbrains text-[#FE494A]">404</p>
        <h1 className="mt-3 text-5xl font-black font-nevis tracking-tighter">
          {lang === 'zh' ? '這一廳沒有放映' : 'Nothing is screening here'}
        </h1>
        <p className="mt-4 text-text-muted">
          {lang === 'zh' ? '網址可能有誤，或這個頁面已經移動。' : 'The address may be wrong, or this page has moved.'}
        </p>
        <Link
          to="/"
          className="inline-flex mt-7 px-6 py-3 rounded-full bg-[#FE494A] text-[#1A1A1A] font-black"
        >
          {lang === 'zh' ? '回到片庫' : 'Back to the collection'}
        </Link>
      </div>
    </motion.main>
  );
}
