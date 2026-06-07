import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { ToastProvider } from './components/Toast';
import { AdminProvider } from './components/AdminAuth';
import { LanguageProvider } from './components/LanguageContext';
import SmoothScroll from './components/SmoothScroll';
import CustomCursor from './components/CustomCursor';
import InstallPrompt from './components/InstallPrompt';
import LaunchScreen from './components/LaunchScreen';
import HomePage from './pages/HomePage';

// The review page pulls in heavy, review-only deps (recharts radar chart,
// react-markdown, html2canvas share card). Lazy-load it so the homepage's
// initial bundle stays small and loads fast; the chunk fetches on navigation.
const ReviewPage = lazy(() => import('./pages/ReviewPage'));

// Keyed by pathname so <AnimatePresence mode="wait"> actually runs each page's
// exit animation before the next mounts — a smooth crossfade between the feed
// and a review, instead of an abrupt swap. (Without the location key the exit
// never fires.)
function AnimatedRoutes() {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<HomePage />} />
        <Route path="/review/:id" element={<ReviewPage />} />
      </Routes>
    </AnimatePresence>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <LaunchScreen />
      <InstallPrompt />
      <AdminProvider>
        <ToastProvider>
          <SmoothScroll />
          <CustomCursor />
          <BrowserRouter>
            <Suspense fallback={<div className="min-h-dvh bg-bg-deep" />}>
              <AnimatedRoutes />
            </Suspense>
          </BrowserRouter>
        </ToastProvider>
      </AdminProvider>
    </LanguageProvider>
  );
}
