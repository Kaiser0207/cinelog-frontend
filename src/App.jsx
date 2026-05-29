import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { ToastProvider } from './components/Toast';
import { AdminProvider } from './components/AdminAuth';
import HomePage from './pages/HomePage';
import ReviewPage from './pages/ReviewPage';

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AdminProvider>
          <AnimatePresence mode="wait">
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/review/:id" element={<ReviewPage />} />
            </Routes>
          </AnimatePresence>
        </AdminProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}
