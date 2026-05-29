import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { ToastProvider } from './components/Toast';
import { AdminProvider } from './components/AdminAuth';
import { LanguageProvider } from './components/LanguageContext';
import CustomCursor from './components/CustomCursor';
import HomePage from './pages/HomePage';
import ReviewPage from './pages/ReviewPage';

export default function App() {
  return (
    <LanguageProvider>
      <AdminProvider>
        <ToastProvider>
          <CustomCursor />
          <BrowserRouter>
            <AnimatePresence mode="wait">
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/review/:id" element={<ReviewPage />} />
              </Routes>
            </AnimatePresence>
          </BrowserRouter>
        </ToastProvider>
      </AdminProvider>
    </LanguageProvider>
  );
}
