import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Calculator, Package, Users, Truck, ShoppingCart, ShoppingBag,
  Wallet, RotateCcw, BarChart3, PieChart, ShieldAlert,
  Settings as SettingsIcon, CloudLightning, Percent, HelpCircle,
  Bell, Search, User, ArrowLeft, Loader2, Calendar, Clock,
  ChevronDown, Info, RefreshCw, Gift, Store, LogOut, ShieldX,
  // Coming Soon feature icons
  UserPlus, Phone, Tag, FileText, MapPin,
  TrendingUp, TrendingDown, DollarSign, CreditCard,
  AlertTriangle, Archive, RotateCw, CheckCircle,
  LineChart, PieChart as PieChartIcon, BarChart2,
  Shield, Key, Activity, Settings2,
  Upload, Download, HardDrive, Database,
  Receipt, Percent as PercentIcon, Ticket, Star,
  BookOpen, Video, MessageCircle, Headphones, Printer,
  Package2, Filter, SortAsc, Layers
} from 'lucide-react';
import axios from 'axios';
import POS from './POS';
import Items from './Items';
import Invoices from './Invoices';
import Settings from './Settings';
import Customers from './Customers';
import ComingSoonPage from './ComingSoonPage';
import DashboardPage from './DashboardPage';
import Expenses from './Expenses';
import StaffPage from './StaffPage';
import StockAnalysis from './StockAnalysis';
import Vendors from './Vendors';

const API_URL = import.meta.env.VITE_API_URL;

// ─── Module Configurations ────────────────────────────────────────────────────
// Each coming-soon module declares its icon, color, desc, and planned features.
const MODULE_CONFIG = {
  vendors: {
    title: 'Vendors',
    desc: 'Manage vendor relationships, track purchase orders, and streamline your procurement process.',
    icon: <Truck />,
    colorClass: 'yellow',
    features: [
      { icon: <MapPin />, label: 'Supplier Directory', desc: 'Maintain a complete database of all your vendors' },
      { icon: <ShoppingBag />, label: 'Purchase Orders', desc: 'Create and track POs from request to delivery' },
      { icon: <FileText />, label: 'Invoices & Bills', desc: 'Log supplier bills and track payment due dates' },
      { icon: <TrendingDown />, label: 'Cost Analysis', desc: 'Track cost trends and negotiate better deals' },
      { icon: <Package />, label: 'Stock Receiving', desc: 'Record goods received and update inventory automatically' },
      { icon: <Star />, label: 'Supplier Ratings', desc: 'Rate and review vendor performance over time' },
    ]
  }
};

// ─── All valid page tab names ─────────────────────────────────────────────────
const ALL_TABS = [
  'home', 'dashboard-view', 'pos', 'products', 'customers', 'vendors', 'staff', 'expenses', 'stock', 'settings'
];

// ─── Path to Tab mappings ─────────────────────────────────────────────────────
const PATH_TO_TAB = {
  '/home': 'home',
  '/dashboard': 'dashboard-view',
  '/billing': 'pos',
  '/products': 'products',
  '/customer': 'customers',
  '/vendors': 'vendors',
  '/staff': 'staff',
  '/expenses': 'expenses',
  '/stock': 'stock',
  '/settings': 'settings'
};

const TAB_TO_PATH = {
  'home': '/home',
  'dashboard-view': '/dashboard',
  'pos': '/billing',
  'products': '/products',
  'customers': '/customer',
  'vendors': '/vendors',
  'staff': '/staff',
  'expenses': '/expenses',
  'stock': '/stock',
  'settings': '/settings'
};

// ─── Dashboard Component ──────────────────────────────────────────────────────
function Dashboard({ token, business, user, onSwitchBusiness, onLogout }) {
  const [activeTabVal, setActiveTabVal] = useState(() => {
    if (business.isStaff) return 'pos';
    return PATH_TO_TAB[window.location.pathname] || 'home';
  });

  const setActiveTab = useCallback((tabId) => {
    if (business.isStaff) return; // Disable tab switching for staff entirely
    const path = TAB_TO_PATH[tabId];
    if (path && window.location.pathname !== path) {
      window.history.pushState(null, '', path);
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
    setActiveTabVal(tabId);
  }, [business.isStaff]);

  const activeTab = business.isStaff ? 'pos' : activeTabVal;

  useEffect(() => {
    const handlePopState = () => {
      if (business.isStaff) return; // Prevent history navigation changing tabs for staff
      const tab = PATH_TO_TAB[window.location.pathname];
      if (tab) {
        setActiveTabVal(tab);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [business.isStaff]);

  const [subscriptionKicked, setSubscriptionKicked] = useState(false);
  const [showStoreDropdown, setShowStoreDropdown] = useState(false);
  const [showAdminDropdown, setShowAdminDropdown] = useState(false);
  const storeMenuRef = useRef(null);
  const adminMenuRef = useRef(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Bluetooth Printer states
  const [printerDevice, setPrinterDevice] = useState(null);
  const [printerCharacteristic, setPrinterCharacteristic] = useState(null);
  const [printerConnecting, setPrinterConnecting] = useState(false);

  const handleConnectPrinter = async () => {
    if (printerDevice && printerDevice.gatt.connected) {
      try {
        await printerDevice.gatt.disconnect();
      } catch (err) {
        console.error(err);
      }
      setPrinterDevice(null);
      setPrinterCharacteristic(null);
      return;
    }

    setPrinterConnecting(true);
    try {
      const device = await navigator.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: [
          '000018f0-0000-1000-8000-00805f9b34fb', // General Printer Service
          '0000fff0-0000-1000-8000-00805f9b34fb', // Common thermal service
          '0000e7e1-0000-1000-8000-00805f9b34fb'  // Another common service
        ]
      });

      const server = await device.gatt.connect();
      const services = await server.getPrimaryServices();
      let characteristic = null;

      for (const service of services) {
        const characteristics = await service.getCharacteristics();
        const writeChar = characteristics.find(c => c.properties.write || c.properties.writeWithoutResponse);
        if (writeChar) {
          characteristic = writeChar;
          break;
        }
      }

      if (!characteristic) {
        throw new Error("Could not find a write characteristic on the printer.");
      }

      setPrinterDevice(device);
      setPrinterCharacteristic(characteristic);

      device.addEventListener('gattserverdisconnected', () => {
        setPrinterDevice(null);
        setPrinterCharacteristic(null);
      });

      alert(`Connected to ${device.name || 'Printer'} successfully!`);
    } catch (err) {
      alert(`Connection failed: ${err.message}`);
    } finally {
      setPrinterConnecting(false);
    }
  };

  // ── Live clock ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const t = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // ── Close dropdowns on outside click ───────────────────────────────────────
  useEffect(() => {
    function handleClickOutside(e) {
      if (storeMenuRef.current && !storeMenuRef.current.contains(e.target)) setShowStoreDropdown(false);
      if (adminMenuRef.current && !adminMenuRef.current.contains(e.target)) setShowAdminDropdown(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ── Subscription heartbeat ──────────────────────────────────────────────────
  const verifySubscription = useCallback(async () => {
    try {
      const res = await axios.get(`${API_URL}/businesses`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const liveBiz = res.data.businesses?.find(b => b.id === business.id);
      if (!liveBiz) { setSubscriptionKicked(true); return; }

      const isActive = liveBiz.isActive === true;
      let isExpired = true;
      if (liveBiz.subscriptionEndDate) {
        const expiry = new Date(
          liveBiz.subscriptionEndDate._seconds
            ? liveBiz.subscriptionEndDate._seconds * 1000
            : liveBiz.subscriptionEndDate
        );
        isExpired = expiry < new Date();
      }
      if (!isActive || isExpired) setSubscriptionKicked(true);
    } catch (err) {
      if (err?.response?.status === 401) onLogout();
      else if (err?.response?.status === 403) onSwitchBusiness();
    }
  }, [token, business.id, onLogout, onSwitchBusiness]);

  useEffect(() => { verifySubscription(); }, [verifySubscription]);
  useEffect(() => {
    const id = setInterval(verifySubscription, 5 * 60 * 1000);
    return () => clearInterval(id);
  }, [verifySubscription]);

  // ── Helpers ─────────────────────────────────────────────────────────────────
  const getFormattedDate = () => currentTime.toLocaleDateString(undefined, {
    day: '2-digit', month: 'short', year: 'numeric', weekday: 'long'
  });
  const getFormattedTime = () => currentTime.toLocaleTimeString(undefined, {
    hour: '2-digit', minute: '2-digit', hour12: true
  });

  // ── Home Grid Cards ───────────────────────────────────────────────────────
  const cards = [
    { id: 'dashboard-view', title: 'Dashboard', desc: 'Real-time sales, stats and warnings summary', icon: <BarChart3 />, colorClass: 'blue' },
    { id: 'pos', title: 'Billing', desc: 'Create invoices and process sales quickly', icon: <Calculator />, colorClass: 'blue' },
    { id: 'products', title: 'Products', desc: 'Manage product stock, categories and prices', icon: <Package />, colorClass: 'green' },
    { id: 'customers', title: 'Customer', desc: 'Add and manage customer information', icon: <Users />, colorClass: 'purple' },
    { id: 'vendors', title: 'Vendors', desc: 'Manage vendor details and transactions', icon: <Truck />, colorClass: 'yellow' },
    { id: 'staff', title: 'Staff', desc: 'Manage users and set permissions', icon: <ShieldAlert />, colorClass: 'pink' },
    { id: 'expenses', title: 'Expenses', desc: 'Add and manage business expenses', icon: <Wallet />, colorClass: 'orange' },
    { id: 'stock', title: 'Stock Analysis', desc: 'Check stock availability and low stock alerts', icon: <PieChart />, colorClass: 'green' },
    { id: 'settings', title: 'Settings', desc: 'Configure store settings and preferences', icon: <SettingsIcon />, colorClass: 'blue' },
  ];

  // ── Render Home Grid ─────────────────────────────────────────────────────────
  const renderHomeGrid = () => (
    <div className="home-container">
      <div className="welcome-section">
        <div>
          <h2 className="welcome-title">Welcome, {user?.name || 'Admin'}! 🎉</h2>
          <p className="welcome-subtitle">
            Managing: <strong style={{ color: '#2563eb' }}>{business.name}</strong>
          </p>
        </div>
        <div className="date-time-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Calendar size={16} style={{ color: '#2563eb' }} />
            <span>{getFormattedDate()}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Clock size={16} style={{ color: '#2563eb' }} />
            <span>{getFormattedTime()}</span>
          </div>
        </div>
      </div>

      <div className="dashboard-grid">
        {cards.map(card => (
          <div
            key={card.id}
            id={`card-${card.id}`}
            className={`dashboard-card ${card.colorClass}`}
            onClick={() => setActiveTab(card.id)}
          >
            <div className={`card-icon-box ${card.colorClass}`}>
              {React.cloneElement(card.icon, { size: 20 })}
            </div>
            <h3 className="card-title">{card.title}</h3>
            <p className="card-desc">{card.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );

  // ── Breadcrumb wrapper for existing full pages ────────────────────────────────
  const renderPageWithBreadcrumb = (label, child) => (
    <div className="light-dashboard-content">
      <div className="dashboard-page-container" style={{ padding: '24px 32px' }}>
        <div className="breadcrumb-bar">
          <button className="breadcrumb-back-btn" onClick={() => setActiveTab('home')}>
            <ArrowLeft size={14} /> Back to Home
          </button>
          <span>/</span>
          <span style={{ fontWeight: 600, color: '#374151' }}>{label}</span>
        </div>
        {child}
      </div>
    </div>
  );

  // ── Render Active View ────────────────────────────────────────────────────────
  const renderActiveView = () => {
    switch (activeTab) {
      case 'home':
        return renderHomeGrid();

      case 'dashboard-view':
        return renderPageWithBreadcrumb('Dashboard',
          <DashboardPage token={token} business={business} />
        );

      // ── Fully implemented pages ──
      case 'pos':
        if (business.isStaff) {
          return (
            <div className="light-dashboard-content dashboard-page-container" style={{ padding: '24px 32px' }}>
              <POS
                token={token}
                business={business}
                printerCharacteristic={printerCharacteristic}
                handleConnectPrinter={handleConnectPrinter}
                printerConnecting={printerConnecting}
                printerDevice={printerDevice}
              />
            </div>
          );
        }
        return renderPageWithBreadcrumb('Billing',
          <POS
            token={token}
            business={business}
            printerCharacteristic={printerCharacteristic}
            handleConnectPrinter={handleConnectPrinter}
            printerConnecting={printerConnecting}
            printerDevice={printerDevice}
          />
        );
      case 'products':
        return renderPageWithBreadcrumb('Products',
          <Items
            token={token}
            business={business}
            printerCharacteristic={printerCharacteristic}
            printerDevice={printerDevice}
          />
        );
      case 'customers':
        return renderPageWithBreadcrumb('Customer', <Customers token={token} business={business} />);
      case 'vendors':
        return renderPageWithBreadcrumb('Vendors', <Vendors token={token} business={business} />);
      case 'expenses':
        return renderPageWithBreadcrumb('Expenses', <Expenses token={token} business={business} />);
      case 'staff':
        return renderPageWithBreadcrumb('Staff', <StaffPage token={token} business={business} />);
      case 'stock':
        return renderPageWithBreadcrumb('Stock Analysis', <StockAnalysis token={token} business={business} />);
      case 'settings':
        return renderPageWithBreadcrumb('Settings',
          <Settings
            token={token}
            business={business}
            user={user}
            onSwitchBusiness={onSwitchBusiness}
            onLogout={onLogout}
            printerDevice={printerDevice}
            printerConnecting={printerConnecting}
            handleConnectPrinter={handleConnectPrinter}
          />
        );

      // ── Coming Soon pages (each is a full secured page, business-specific) ──
      default: {
        const cfg = MODULE_CONFIG[activeTab];
        if (!cfg) return renderHomeGrid(); // fallback
        return (
          <ComingSoonPage
            title={cfg.title}
            desc={cfg.desc}
            icon={cfg.icon}
            colorClass={cfg.colorClass}
            features={cfg.features}
            business={business}
            onBack={() => setActiveTab('home')}
          />
        );
      }
    }
  };

  // ── Subscription Revoked Screen ──────────────────────────────────────────────
  if (subscriptionKicked) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{
          background: '#ffffff', borderRadius: '16px', padding: '40px',
          maxWidth: '400px', width: '100%', textAlign: 'center',
          border: '1px solid #fee2e2', boxShadow: '0 10px 40px rgba(0,0,0,0.05)'
        }}>
          <div style={{
            width: '64px', height: '64px', borderRadius: '999px',
            background: '#fef2f2', border: '1px solid #fee2e2',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 20px auto', color: '#ef4444'
          }}>
            <ShieldX size={32} />
          </div>
          <h2 style={{ color: '#ef4444', fontWeight: 600, marginBottom: '10px' }}>Access Revoked</h2>
          <p style={{ color: '#374151', fontWeight: 600, marginBottom: '8px' }}>{business.name}</p>
          <p style={{ color: '#6b7280', fontSize: '0.85rem', lineHeight: 1.6, marginBottom: '28px' }}>
            Your subscription for this business has expired or been deactivated.
            Please contact the administrator to renew access.
          </p>
          <button className="btn-blue-primary" style={{ width: 'auto', padding: '10px 28px' }} onClick={onSwitchBusiness}>
            Switch Business
          </button>
          <button
            style={{ display: 'block', margin: '10px auto 0', color: '#6b7280', fontSize: '0.82rem', background: 'none', border: 'none', cursor: 'pointer' }}
            onClick={onLogout}
          >
            Log Out
          </button>
        </div>
      </div>
    );
  }

  // ── Main Layout ───────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc', display: 'flex', flexDirection: 'column' }}>

      {/* ── Top Bar ── */}
      <header className="home-topbar">
        {/* Brand Logo */}
        <div
          className="topbar-brand"
          onClick={() => {
            if (!business.isStaff) {
              setActiveTab('home');
            }
          }}
          style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: business.isStaff ? 'default' : 'pointer' }}
        >
          <div className="brand-icon-box topbar-logo-icon" style={{ width: '40px', height: '40px', borderRadius: '10px', margin: 0 }}>
            <ShoppingCart size={20} strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="topbar-title" style={{ fontSize: '1.2rem', fontWeight: 600, color: '#0f172a', lineHeight: 1 }}>LEKA RETAIL</h1>
            <span className="topbar-subtitle" style={{ fontSize: '0.7rem', color: '#6b7280', fontWeight: 500 }}>Smart Billing, Better Business</span>
          </div>
        </div>

        {/* Universal Search */}
        <div className="topbar-search" style={{ position: 'relative', width: '380px' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: '#9ca3af' }} />
          <input
            type="text"
            placeholder="Search Products, Customers, Invoices..."
            style={{
              background: '#f3f4f6', border: 'none', borderRadius: '8px',
              padding: '10px 14px 10px 38px', fontSize: '0.85rem', color: '#1f2937', width: '100%'
            }}
            onFocus={() => { if (activeTab === 'home') setActiveTab('pos'); }}
          />
        </div>

        {/* Right Controls */}
        <div className="topbar-actions" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {/* Bell */}
          <div style={{ position: 'relative', cursor: 'pointer' }}>
            <Bell size={20} style={{ color: '#4b5563' }} />
            <span style={{
              position: 'absolute', top: '-4px', right: '-4px',
              background: '#ef4444', color: '#ffffff', borderRadius: '99px',
              fontSize: '0.62rem', fontWeight: 600, padding: '1px 4px'
            }}>3</span>
          </div>

          {/* Store Selector */}
          <div className="dots-menu-container" ref={storeMenuRef}>
            <button
              type="button"
              className="btn btn-secondary topbar-store-btn"
              style={{ background: '#ffffff', border: '1px solid #e5e7eb', color: '#374151', padding: '8px 14px', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 600 }}
              onClick={() => setShowStoreDropdown(!showStoreDropdown)}
            >
              <Store size={14} style={{ marginRight: '6px', color: '#2563eb', flexShrink: 0 }} />
              <span className="topbar-store-name">{business.name}</span>
              <ChevronDown size={14} style={{ marginLeft: '6px', color: '#9ca3af', flexShrink: 0 }} />
            </button>
            {showStoreDropdown && (
              <div className="dots-dropdown-menu" style={{ width: '180px', top: '42px' }}>
                <div style={{ padding: '8px 14px', borderBottom: '1px solid #f3f4f6' }}>
                  <p style={{ fontSize: '0.72rem', color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase' }}>Active Business</p>
                  <p style={{ fontSize: '0.82rem', fontWeight: 600, color: '#0f172a', marginTop: '2px' }}>{business.name}</p>
                </div>
                <button className="dots-menu-item" onClick={onSwitchBusiness} style={{ fontWeight: 600, color: '#2563eb' }}>
                  <RefreshCw size={12} /> Switch Business
                </button>
              </div>
            )}
          </div>

          {/* Admin Dropdown */}
          <div className="dots-menu-container" ref={adminMenuRef}>
            <div
              style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
              onClick={() => setShowAdminDropdown(!showAdminDropdown)}
            >
              <div className="user-avatar" style={{ margin: 0, backgroundColor: '#eff6ff', color: '#2563eb', border: '1px solid rgba(37,99,235,0.1)' }}>
                <User size={16} />
              </div>
              <span className="topbar-username" style={{ fontSize: '0.85rem', fontWeight: 600, color: '#374151' }}>
                {business.isStaff ? 'Staff ⌵' : 'Admin ⌵'}
              </span>
            </div>
            {showAdminDropdown && (
              <div className="dots-dropdown-menu" style={{ width: '160px', top: '42px' }}>
                <div style={{ padding: '10px 14px', borderBottom: '1px solid #f3f4f6' }}>
                  <p style={{ fontSize: '0.72rem', color: '#9ca3af' }}>Logged in as</p>
                  <p style={{ fontSize: '0.8rem', fontWeight: 600, color: '#374151', fontFamily: 'monospace', marginTop: '2px' }}>
                    {user?.phone}
                  </p>
                  {business.isStaff && (
                    <p style={{ fontSize: '0.72rem', color: '#2563eb', fontWeight: 600, marginTop: '4px' }}>
                      Staff Session
                    </p>
                  )}
                </div>
                {!business.isStaff && (
                  <button className="dots-menu-item" onClick={() => { setShowAdminDropdown(false); setActiveTab('settings'); }}>
                    Configure Profile
                  </button>
                )}
                <button className="dots-menu-item danger-action" onClick={onLogout}>
                  <LogOut size={12} /> Log Out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ── Page Content ── */}
      <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        {renderActiveView()}
      </div>

    </div>
  );
}

export default Dashboard;
