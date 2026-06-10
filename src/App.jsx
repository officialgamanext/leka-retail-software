import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Loader2, ShieldAlert } from 'lucide-react';
import Login from './components/Login';
import Onboarding from './components/Onboarding';
import Dashboard from './components/Dashboard';

const API_URL = import.meta.env.VITE_API_URL;

// ─── Global Axios Instance ────────────────────────────────────────────────────
// All components must use this instead of raw axios so interceptors apply.
export const api = axios.create({ baseURL: API_URL });

function App() {
  const [token, setToken]                   = useState(null);
  const [user, setUser]                     = useState(null);
  const [selectedBusiness, setSelectedBusiness] = useState(null);
  const [loading, setLoading]               = useState(true);
  // Used when the interceptor detects a forced security kick-out mid-session
  const [securityMessage, setSecurityMessage] = useState('');

  // Custom Routing states
  const [currentPath, setCurrentPath] = useState(window.location.pathname);

  const navigate = useCallback((path) => {
    if (window.location.pathname !== path) {
      window.history.pushState(null, '', path);
    }
    setCurrentPath(path);
  }, []);

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // ─── Logout helper (used by interceptor + UI) ──────────────────────────────
  const handleLogout = useCallback((message = '') => {
    localStorage.removeItem('leka_token');
    localStorage.removeItem('leka_business');
    setToken(null);
    setUser(null);
    setSelectedBusiness(null);
    if (message) setSecurityMessage(message);
    navigate('/login');
  }, [navigate]);

  const handleSwitchBusiness = useCallback((message = '') => {
    localStorage.removeItem('leka_business');
    setSelectedBusiness(null);
    if (message) setSecurityMessage(message);
    navigate('/onboarding');
  }, [navigate]);

  // ─── Attach Axios Interceptors once ────────────────────────────────────────
  // These fire on every API response regardless of which component made the call.
  useEffect(() => {
    // Request interceptor — inject current token automatically
    const reqInterceptor = api.interceptors.request.use((config) => {
      const currentToken = localStorage.getItem('leka_token');
      if (currentToken) {
        config.headers['Authorization'] = `Bearer ${currentToken}`;
      }
      return config;
    });

    // Response interceptor — handle auth/subscription failures globally
    const resInterceptor = api.interceptors.response.use(
      (response) => response,
      (error) => {
        const status = error?.response?.status;
        if (status === 401) {
          // Token invalid or expired → full logout
          handleLogout('Your session has expired. Please log in again.');
        } else if (status === 403) {
          // Subscription expired or business access revoked → go back to onboarding
          handleSwitchBusiness('Access denied. Your business subscription may have expired.');
        }
        return Promise.reject(error);
      }
    );

    return () => {
      api.interceptors.request.eject(reqInterceptor);
      api.interceptors.response.eject(resInterceptor);
    };
  }, [handleLogout, handleSwitchBusiness]);

  // ─── Session Initialization on mount ───────────────────────────────────────
  useEffect(() => {
    const initSession = async () => {
      const storedToken = localStorage.getItem('leka_token');
      if (!storedToken) {
        setLoading(false);
        return;
      }

      try {
        // Step 1 — Verify token is still valid with the API
        const meRes = await api.get('/auth/me', {
          headers: { Authorization: `Bearer ${storedToken}` }
        });

        if (!meRes.data.success) {
          handleLogout('Session invalid. Please log in again.');
          return;
        }

        setToken(storedToken);
        setUser(meRes.data.user);

        // Step 2 — If a business was previously selected, re-validate it against live API data
        const savedBusinessStr = localStorage.getItem('leka_business');
        if (savedBusinessStr) {
          let savedBiz;
          try { savedBiz = JSON.parse(savedBusinessStr); } catch { 
            localStorage.removeItem('leka_business');
            return;
          }

          const bizRes = await api.get('/businesses', {
            headers: { Authorization: `Bearer ${storedToken}` }
          });

          const liveBiz = bizRes.data.businesses?.find(b => b.id === savedBiz.id);

          if (!liveBiz) {
            // Business no longer exists
            localStorage.removeItem('leka_business');
            return;
          }

          // Step 3 — Check both isActive AND subscriptionEndDate strictly
          const isActive = liveBiz.isActive === true;
          let isExpired  = true;

          if (liveBiz.subscriptionEndDate) {
            const expiry = new Date(
              liveBiz.subscriptionEndDate._seconds
                ? liveBiz.subscriptionEndDate._seconds * 1000
                : liveBiz.subscriptionEndDate
            );
            isExpired = expiry < new Date();
          }

          if (isActive && !isExpired) {
            setSelectedBusiness(liveBiz);
          } else {
            // Subscription lapsed between sessions — clear silently
            localStorage.removeItem('leka_business');
          }
        }
      } catch (err) {
        console.error('Session init failed:', err.message);
        // Interceptor handles 401/403; catch anything else here
        if (!err?.response?.status) {
          // Network error — don't wipe session, just show onboarding
          const storedToken2 = localStorage.getItem('leka_token');
          setToken(storedToken2);
        }
      } finally {
        setLoading(false);
      }
    };

    initSession();
  }, []); // Only on mount — interceptors handle mid-session events

  // ─── Handlers passed down to children ─────────────────────────────────────
  const handleLoginSuccess = (userToken, userData) => {
    setSecurityMessage('');
    localStorage.setItem('leka_token', userToken);
    setUser(userData);
    setToken(userToken);
    navigate('/onboarding');
  };

  const handleSelectBusiness = (business) => {
    setSecurityMessage('');
    localStorage.setItem('leka_business', JSON.stringify(business));
    setSelectedBusiness(business);
    navigate('/dashboard');
  };

  // ─── Routing Guards and Redirects Effect ──────────────────────────────────
  useEffect(() => {
    if (loading) return;

    if (!token || !user) {
      if (currentPath !== '/login') {
        navigate('/login');
      }
    } else if (!selectedBusiness) {
      if (currentPath !== '/onboarding') {
        navigate('/onboarding');
      }
    } else {
      // Authenticated with business selected
      const allowedPaths = [
        '/dashboard', '/billing', '/products', '/customer',
        '/vendors', '/staff', '/expenses', '/stock', '/settings', '/home'
      ];
      if (!allowedPaths.includes(currentPath)) {
        navigate('/home');
      }
    }
  }, [loading, token, user, selectedBusiness, currentPath, navigate]);

  // ─── Loading Splash ────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', minHeight: '100vh', gap: '16px',
        backgroundColor: '#f1f5f9'
      }}>
        <Loader2 className="animate-spin" size={44} style={{ color: '#2563eb' }} />
        <p style={{ color: '#6b7280', fontFamily: 'Outfit', fontSize: '0.9rem' }}>
          Verifying your session...
        </p>
      </div>
    );
  }

  // ─── Route Guard: Must be logged in ───────────────────────────────────────
  if (!token || !user) {
    return (
      <Login
        onLoginSuccess={handleLoginSuccess}
        securityMessage={securityMessage}
      />
    );
  }

  // ─── Route Guard: Must have an active business selected ───────────────────
  if (!selectedBusiness) {
    return (
      <Onboarding
        token={token}
        user={user}
        onSelectBusiness={handleSelectBusiness}
        onLogout={() => handleLogout()}
        securityMessage={securityMessage}
        onClearMessage={() => setSecurityMessage('')}
      />
    );
  }

  // ─── Main Dashboard — only reached if token + user + active business ───────
  return (
    <Dashboard
      token={token}
      business={selectedBusiness}
      user={user}
      onSwitchBusiness={() => handleSwitchBusiness()}
      onLogout={() => handleLogout()}
    />
  );
}

export default App;
