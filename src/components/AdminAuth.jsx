import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { startRegistration, startAuthentication } from '@simplewebauthn/browser';
import { API_URL } from '../utils/constants';

const AdminContext = createContext(null);

const TOKEN_KEY = 'cinelog_admin_token';

// Read the stored admin JWT, but treat it as absent if it has expired. Persisting
// in localStorage means a token can outlive its 7-day TTL; without this check the
// UI would think it's logged in while every admin API call 403s. We only read the
// `exp` claim (no signature check — the server still verifies on every request).
function readValidToken() {
  const token = localStorage.getItem(TOKEN_KEY);
  if (!token) return '';
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    if (payload.exp && payload.exp * 1000 < Date.now()) {
      localStorage.removeItem(TOKEN_KEY);
      return '';
    }
  } catch {
    // Malformed token — drop it and force a fresh login.
    localStorage.removeItem(TOKEN_KEY);
    return '';
  }
  return token;
}

export function AdminProvider({ children }) {
  // Persist the 7-day admin JWT in localStorage so login survives app/tab
  // restarts (sessionStorage is cleared on close, forcing re-login every visit).
  // The token is short-lived and server-validated, so persisting it is bounded.
  const [password, setPassword] = useState(readValidToken);
  const [isAdmin, setIsAdmin] = useState(() => !!readValidToken());
  const [showModal, setShowModal] = useState(false);
  const [showDeviceManager, setShowDeviceManager] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);

  const requireAuth = useCallback((action) => {
    if (isAdmin && password) {
      action(password);
      return;
    }
    setPendingAction(() => action);
    setShowModal(true);
  }, [isAdmin, password]);

  const openDeviceManager = useCallback(() => {
    if (isAdmin) setShowDeviceManager(true);
  }, [isAdmin]);

  const handleVerified = useCallback((pw) => {
    setPassword(pw);
    setIsAdmin(true);
    localStorage.setItem(TOKEN_KEY, pw);
    setShowModal(false);
    if (pendingAction) {
      pendingAction(pw);
      setPendingAction(null);
    }
  }, [pendingAction]);

  const logout = useCallback(() => {
    setPassword('');
    setIsAdmin(false);
    localStorage.removeItem(TOKEN_KEY);
  }, []);

  return (
    <AdminContext.Provider value={{ isAdmin, password, requireAuth, logout, openDeviceManager }}>
      {children}
      <AnimatePresence>
        {showModal && (
          <AdminAuthModal
            onVerified={handleVerified}
            onClose={() => { setShowModal(false); setPendingAction(null); }}
          />
        )}
        {showDeviceManager && (
          <DeviceManagerModal
            password={password}
            onClose={() => setShowDeviceManager(false)}
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
  const [passkeyAttempted, setPasskeyAttempted] = useState(false);

  // Auto-trigger Passkey Login on mount
  useEffect(() => {
    const tryPasskeyLogin = async () => {
      if (!window.PublicKeyCredential || passkeyAttempted) return;
      setPasskeyAttempted(true);
      
      try {
        const res = await fetch(`${API_URL}/api/auth/passkey/login-challenge`, { method: 'POST' });
        if (!res.ok) return;
        const options = await res.json();
        
        const authResp = await startAuthentication(options);
        
        const verifyRes = await fetch(`${API_URL}/api/auth/passkey/login-verify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(authResp)
        });
        
        if (verifyRes.ok) {
          const data = await verifyRes.json();
          if (data.status === 'ok' && data.token) {
            onVerified(data.token);
          }
        }
      } catch (err) {
        console.log("Passkey login cancelled or failed, falling back to password", err);
      }
    };
    
    tryPasskeyLogin();
  }, [passkeyAttempted, onVerified]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!pw.trim()) return;

    setVerifying(true);
    setErrorMsg('');

    try {
      const res = await fetch(`${API_URL}/api/auth/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: pw })
      });

      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success && data.token) {
        onVerified(data.token);
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
          <h2 className="text-xl font-bold font-syne tracking-tightertext-text-primary">
            Admin Access
          </h2>
          <p className="text-text-muted text-sm mt-1">
            Face ID failed or cancelled. Enter password.
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
            className="w-full py-3 rounded-full bg-[#FE494A] hover:bg-[#FE494A] text-black font-bold transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed border-none shadow-sm cursor-pointer"
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

function DeviceManagerModal({ password, onClose }) {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [newDeviceName, setNewDeviceName] = useState('');

  useEffect(() => {
    fetchDevices();
  }, []);

  const fetchDevices = async () => {
    try {
      const res = await fetch(`${API_URL}/api/auth/passkey/devices`, {
        headers: { 'Authorization': `Bearer ${password}` }
      });
      if (res.ok) {
        const data = await res.json();
        setDevices(data.devices || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!newDeviceName.trim()) return alert('Please enter a device name');
    setRegistering(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/passkey/register-challenge`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${password}` }
      });
      if (!res.ok) throw new Error('Failed to get challenge');
      const options = await res.json();
      
      const attResp = await startRegistration(options);
      
      const verifyRes = await fetch(`${API_URL}/api/auth/passkey/register-verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${password}` },
        body: JSON.stringify({ response: attResp, device_name: newDeviceName })
      });
      
      if (verifyRes.ok) {
        setNewDeviceName('');
        fetchDevices();
      } else {
        const errData = await verifyRes.json();
        alert('Verification failed: ' + errData.detail);
      }
    } catch (err) {
      console.error(err);
      alert('Registration failed: ' + err.message);
    } finally {
      setRegistering(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this device?')) return;
    try {
      const res = await fetch(`${API_URL}/api/auth/passkey/devices/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${password}` }
      });
      if (res.ok) fetchDevices();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 backdrop-blur-md z-[9999] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-bg-card border border-white/10 p-6 rounded-2xl w-full max-w-md shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-6 border-b border-white/10 pb-4">
          <h2 className="text-xl font-bold text-white">📱 Device Management</h2>
          <button onClick={onClose} className="text-text-muted hover:text-white transition-colors bg-transparent border-none cursor-pointer">✕</button>
        </div>

        <div className="space-y-4 mb-6">
          <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wider">Registered Passkeys</h3>
          {loading ? (
            <p className="text-sm text-text-dim">Loading...</p>
          ) : devices.length === 0 ? (
            <p className="text-sm text-text-dim">No devices registered yet.</p>
          ) : (
            <ul className="space-y-2 m-0 p-0 list-none">
              {devices.map(d => (
                <li key={d.id} className="flex justify-between items-center bg-black/30 px-4 py-3 rounded-lg border border-white/5">
                  <div>
                    <p className="text-white font-medium text-sm">{d.device_name}</p>
                    <p className="text-xs text-text-dim">{new Date(d.created_at).toLocaleDateString()}</p>
                  </div>
                  <button onClick={() => handleDelete(d.id)} className="text-red-400 hover:text-red-300 bg-transparent border-none cursor-pointer p-2">
                    🗑️
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="border-t border-white/10 pt-6">
          <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-3">Add New Device</h3>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="e.g. Kaiser's iPhone"
              value={newDeviceName}
              onChange={(e) => setNewDeviceName(e.target.value)}
              className="flex-1 bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white text-sm"
            />
            <button
              onClick={handleRegister}
              disabled={registering || !newDeviceName.trim()}
              className="bg-[#D480C0] hover:bg-[#FE494A] hover:text-white text-black font-bold px-4 py-2 rounded-lg text-sm transition-colors disabled:opacity-50 border-none cursor-pointer"
            >
              {registering ? '...' : 'Bind'}
            </button>
          </div>
          <p className="text-xs text-text-dim mt-2">
            Clicking Bind will open your browser's Passkey (Face ID/Touch ID) prompt.
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}

