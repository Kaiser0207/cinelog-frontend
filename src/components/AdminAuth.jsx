import { createContext, useContext, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { API_URL } from '../utils/constants';

const AdminContext = createContext(null);

export function AdminProvider({ children }) {
  const [password, setPassword] = useState(() => sessionStorage.getItem('cinelog_admin_pw') || '');
  const [isAdmin, setIsAdmin] = useState(() => !!sessionStorage.getItem('cinelog_admin_pw'));
  const [showModal, setShowModal] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);

  const requireAuth = useCallback((action) => {
    if (isAdmin && password) {
      action(password);
      return;
    }
    setPendingAction(() => action);
    setShowModal(true);
  }, [isAdmin, password]);

  const handleVerified = useCallback((pw) => {
    setPassword(pw);
    setIsAdmin(true);
    sessionStorage.setItem('cinelog_admin_pw', pw);
    setShowModal(false);
    if (pendingAction) {
      pendingAction(pw);
      setPendingAction(null);
    }
  }, [pendingAction]);

  const logout = useCallback(() => {
    setPassword('');
    setIsAdmin(false);
    sessionStorage.removeItem('cinelog_admin_pw');
  }, []);

  return (
    <AdminContext.Provider value={{ isAdmin, password, requireAuth, logout }}>
      {children}
      <AnimatePresence>
        {showModal && (
          <AdminAuthModal
            onVerified={handleVerified}
            onClose={() => { setShowModal(false); setPendingAction(null); }}
          />
        )}
      </AnimatePresence>
    </AdminContext.Provider>
  );
}

export function useAdmin() {
  const context = useContext(AdminContext);
  if (!context) {
    throw new Error('useAdmin must be used within an AdminProvider');
  }
  return context;
}

function AdminAuthModal({ onVerified, onClose }) {
  const [pw, setPw] = useState('');
  const [show, setShow] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [shake, setShake] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!pw.trim()) return;

    setVerifying(true);
    setErrorMsg('');

    try {
      const res = await fetch(`${API_URL}/api/auth/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Password': pw,
        },
        body: JSON.stringify({ password: pw })
      });

      if (res.ok) {
        onVerified(pw);
      } else {
        setShake(true);
        setErrorMsg('Wrong password');
        setTimeout(() => setShake(false), 600);
      }
    } catch {
      setShake(true);
      setErrorMsg('Connection error');
      setTimeout(() => setShake(false), 600);
    } finally {
      setVerifying(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[9998] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.85, opacity: 0 }}
        animate={{
          scale: 1,
          opacity: 1,
          x: shake ? [0, -12, 12, -8, 8, -4, 4, 0] : 0,
        }}
        exit={{ scale: 0.85, opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 350 }}
        className="glass p-8 w-full max-w-sm"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-center mb-6">
          <div className="text-3xl mb-2">🔐</div>
          <h2 className="text-xl font-bold font-[var(--font-outfit)] text-text-primary">
            Admin Access
          </h2>
          <p className="text-text-muted text-sm mt-1">
            Enter password to continue
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <input
              type={show ? 'text' : 'password'}
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              placeholder="Password"
              autoFocus
              className="w-full pr-12"
            />
            <button
              type="button"
              onClick={() => setShow(!show)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary transition-colors text-sm"
            >
              {show ? '🙈' : '👁️'}
            </button>
          </div>

          {errorMsg && (
            <motion.p
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-red-400 text-sm text-center"
            >
              {errorMsg}
            </motion.p>
          )}

          <button
            type="submit"
            disabled={verifying || !pw.trim()}
            className="w-full py-3 rounded-xl bg-accent-red hover:bg-red-700 text-white font-semibold transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {verifying ? (
              <span className="flex items-center justify-center gap-2">
                <motion.span
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                  className="inline-block"
                >
                  ⏳
                </motion.span>
                Verifying...
              </span>
            ) : (
              'Unlock'
            )}
          </button>
        </form>
      </motion.div>
    </motion.div>
  );
}
