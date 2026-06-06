import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { ToastProvider } from './components/Toast';
import { AdminProvider } from './components/AdminAuth';
import { LanguageProvider } from './components/LanguageContext';
import SmoothScroll from './components/SmoothScroll';
import CustomCursor from './components/CustomCursor';
import HomePage from './pages/HomePage';

// The review page pulls in heavy, review-only deps (recharts radar chart,
// react-markdown, html2canvas share card). Lazy-load it so the homepage's
// initial bundle stays small and loads fast; the chunk fetches on navigation.
const ReviewPage = lazy(() => import('./pages/ReviewPage'));

export default function App() {
  return (
    <LanguageProvider>
      <AdminProvider>
        <ToastProvider>
          <SmoothScroll />
          <CustomCursor />
          <BrowserRouter>
            <Suspense fallback={<div className="min-h-dvh bg-bg-deep" />}>
              <AnimatePresence mode="wait">
                <Routes>
                  <Route path="/" element={<HomePage />} />
                  <Route path="/review/:id" element={<ReviewPage />} />
                </Routes>
              </AnimatePresence>
            </Suspense>
          </BrowserRouter>
        </ToastProvider>
      </AdminProvider>
    </LanguageProvider>
  );
}
