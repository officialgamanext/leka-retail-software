import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Loader2 } from 'lucide-react';
import Login from './components/Login';
import Onboarding from './components/Onboarding';
import Dashboard from './components/Dashboard';

const API_URL = import.meta.env.VITE_API_URL;

function App() {
  const [token, setToken] = useState(localStorage.getItem('leka_token') || null);
  const [user, setUser] = useState(null);
  const [selectedBusiness, setSelectedBusiness] = useState(null);
  const [loading, setLoading] = useState(true);

  // Initialize session and fetch user profile
  useEffect(() => {
    const initSession = async () => {
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const response = await axios.get(`${API_URL}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (response.data.success) {
          setUser(response.data.user);
          
          // Check if there is a previously selected business stored in localStorage
          const savedBusinessStr = localStorage.getItem('leka_business');
          if (savedBusinessStr) {
            const savedBiz = JSON.parse(savedBusinessStr);
            
            // To ensure strict security: verify if the business is still active
            const verifyResponse = await axios.get(`${API_URL}/businesses`, {
              headers: { Authorization: `Bearer ${token}` }
            });
            
            const currentBiz = verifyResponse.data.businesses.find(b => b.id === savedBiz.id);
            
            if (currentBiz) {
              const isActive = currentBiz.isActive === true;
              let isExpired = true;
              
              if (currentBiz.subscriptionEndDate) {
                const expiry = new Date(currentBiz.subscriptionEndDate._seconds 
                  ? currentBiz.subscriptionEndDate._seconds * 1000 
                  : currentBiz.subscriptionEndDate
                );
                isExpired = expiry < new Date();
              }
              
              if (isActive && !isExpired) {
                setSelectedBusiness(currentBiz);
              } else {
                // Subscription has become inactive, clear from localStorage
                localStorage.removeItem('leka_business');
              }
            }
          }
        } else {
          handleLogout();
        }
      } catch (err) {
        console.error('Session initialization failed:', err.message);
        // Clear token if invalid or expired
        if (err.response?.status === 401) {
          handleLogout();
        }
      } finally {
        setLoading(false);
      }
    };

    initSession();
  }, [token]);

  const handleLoginSuccess = (userToken, userData) => {
    localStorage.setItem('leka_token', userToken);
    setUser(userData);
    setToken(userToken);
  };

  const handleSelectBusiness = (business) => {
    localStorage.setItem('leka_business', JSON.stringify(business));
    setSelectedBusiness(business);
  };

  const handleSwitchBusiness = () => {
    localStorage.removeItem('leka_business');
    setSelectedBusiness(null);
  };

  const handleLogout = () => {
    localStorage.removeItem('leka_token');
    localStorage.removeItem('leka_business');
    setUser(null);
    setSelectedBusiness(null);
    setToken(null);
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', gap: '16px', backgroundColor: 'var(--bg-app)' }}>
        <Loader2 className="animate-spin" size={48} style={{ color: 'var(--primary)' }} />
        <p style={{ color: 'var(--text-secondary)', fontFamily: 'Outfit' }}>Securing terminal session...</p>
      </div>
    );
  }

  // Routing Logic
  if (!token || !user) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  if (!selectedBusiness) {
    return (
      <Onboarding 
        token={token} 
        user={user} 
        onSelectBusiness={handleSelectBusiness} 
        onLogout={handleLogout} 
      />
    );
  }

  return (
    <Dashboard 
      token={token} 
      business={selectedBusiness} 
      user={user} 
      onSwitchBusiness={handleSwitchBusiness} 
      onLogout={handleLogout} 
    />
  );
}

export default App;
