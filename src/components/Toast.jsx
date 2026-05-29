import { createContext, useContext, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const ToastContext = createContext(null);

const TOAST_STYLES = {
  success: {
    bg: 'bg-green-900/80',
    border: 'border-green-500/40',
    icon: '✓',
    iconColor: 'text-green-400',
  },
  error: {
    bg: 'bg-red-900/80',
    border: 'border-red-500/40',
    icon: '✕',
    iconColor: 'text-red-400',
  },
  info: {
    bg: 'bg-blue-900/80',
    border: 'border-blue-500/40',
    icon: 'ℹ',
    iconColor: 'text-blue-400',
  },
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'info') => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-3 pointer-events-none">
        <AnimatePresence mode="popLayout">
          {toasts.map((toast) => {
            const style = TOAST_STYLES[toast.type] || TOAST_STYLES.info;
            return (
              <motion.div
                key={toast.id}
                initial={{ opacity: 0, x: 100, scale: 0.9 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 100, scale: 0.9 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className={`pointer-events-auto ${style.bg} backdrop-blur-xl border ${style.border} rounded-xl px-5 py-3 shadow-2xl max-w-sm cursor-pointer flex items-center gap-3`}
                onClick={() => removeToast(toast.id)}
              >
                <span className={`${style.iconColor} text-lg font-bold flex-shrink-0`}>
                  {style.icon}
                </span>
                <p className="text-text-primary text-sm font-medium">{toast.message}</p>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
