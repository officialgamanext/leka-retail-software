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
  BookOpen, Video, MessageCircle, Headphones,
  Package2, Filter, SortAsc, Layers
} from 'lucide-react';
import axios from 'axios';
import POS from './POS';
import Items from './Items';
import Invoices from './Invoices';
import Settings from './Settings';
import ComingSoonPage from './ComingSoonPage';

const API_URL = import.meta.env.VITE_API_URL;

// ─── Module Configurations ────────────────────────────────────────────────────
// Each coming-soon module declares its icon, color, desc, and planned features.
const MODULE_CONFIG = {
  customers: {
    title: 'Customers',
    desc: 'Manage your customer database, track purchase history, and build lasting relationships with your buyers.',
    icon: <Users />,
    colorClass: 'purple',
    features: [
      { icon: <UserPlus />, label: 'Customer Profiles', desc: 'Create and manage detailed customer records with contact info' },
      { icon: <Phone />, label: 'Contact Management', desc: 'Store phone numbers, emails and addresses for quick access' },
      { icon: <BarChart2 />, label: 'Purchase History', desc: 'View all past transactions linked to each customer' },
      { icon: <Tag />, label: 'Customer Tags', desc: 'Label and group customers for targeted promotions' },
      { icon: <TrendingUp />, label: 'Loyalty Tracking', desc: 'Track visits and spending to reward loyal customers' },
      { icon: <FileText />, label: 'Outstanding Dues', desc: 'Monitor pending payments and credit balances' },
    ]
  },
  suppliers: {
    title: 'Suppliers',
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
  },
  purchase: {
    title: 'Purchase',
    desc: 'Create purchase orders, track deliveries, and manage all inbound stock with ease.',
    icon: <ShoppingBag />,
    colorClass: 'teal',
    features: [
      { icon: <FileText />, label: 'Purchase Orders', desc: 'Generate POs and send them directly to suppliers' },
      { icon: <Package />, label: 'Goods Received Note', desc: 'Record received stock and reconcile with POs' },
      { icon: <CreditCard />, label: 'Payment Tracking', desc: 'Log payments made to suppliers and track dues' },
      { icon: <AlertTriangle />, label: 'Reorder Alerts', desc: 'Auto-alerts when stock falls below reorder level' },
      { icon: <BarChart2 />, label: 'Purchase Reports', desc: 'Analyse procurement costs by category and period' },
      { icon: <Archive />, label: 'Purchase History', desc: 'Full log of all purchases linked to your business' },
    ]
  },
  expenses: {
    title: 'Expenses',
    desc: 'Record, categorise, and analyse all your business expenses in one place.',
    icon: <Wallet />,
    colorClass: 'orange',
    features: [
      { icon: <DollarSign />, label: 'Expense Recording', desc: 'Quickly log daily expenses with category and notes' },
      { icon: <Tag />, label: 'Categories', desc: 'Organise expenses by Rent, Utilities, Salaries, and more' },
      { icon: <Receipt />, label: 'Receipt Upload', desc: 'Attach photo receipts to each expense entry' },
      { icon: <TrendingDown />, label: 'Monthly Overview', desc: 'Visual breakdown of spending patterns over time' },
      { icon: <CreditCard />, label: 'Payment Modes', desc: 'Track Cash, UPI, Card and Bank Transfer expenses' },
      { icon: <FileText />, label: 'Export Reports', desc: 'Download expense sheets for accounting purposes' },
    ]
  },
  returns: {
    title: 'Returns',
    desc: 'Handle product returns, process refunds, and manage exchange requests efficiently.',
    icon: <RotateCcw />,
    colorClass: 'purple',
    features: [
      { icon: <RotateCw />, label: 'Return Requests', desc: 'Log customer return requests with reason and date' },
      { icon: <CheckCircle />, label: 'Approval Workflow', desc: 'Review and approve or reject return requests' },
      { icon: <CreditCard />, label: 'Refund Processing', desc: 'Issue refunds via original payment method' },
      { icon: <Package />, label: 'Stock Restoration', desc: 'Automatically restore inventory on approved returns' },
      { icon: <BarChart2 />, label: 'Returns Analysis', desc: 'Track return rates by product and time period' },
      { icon: <FileText />, label: 'Return Receipts', desc: 'Generate return confirmation receipts for customers' },
    ]
  },
  reports: {
    title: 'Reports & Analytics',
    desc: 'Gain deep insights into your business performance with powerful reports and visualisations.',
    icon: <BarChart3 />,
    colorClass: 'blue',
    features: [
      { icon: <TrendingUp />, label: 'Sales Reports', desc: 'Daily, weekly, and monthly revenue breakdowns' },
      { icon: <PieChartIcon />, label: 'Category Analysis', desc: 'Identify best-selling categories and items' },
      { icon: <LineChart />, label: 'Trend Graphs', desc: 'Interactive charts for sales, stock, and expenses' },
      { icon: <Users />, label: 'Customer Analytics', desc: 'Top customers, frequency and spending reports' },
      { icon: <Package />, label: 'Stock Reports', desc: 'Low-stock, dead-stock and reorder analysis' },
      { icon: <Download />, label: 'Export to Excel', desc: 'Download any report as Excel or PDF' },
    ]
  },
  stock: {
    title: 'Stock Summary',
    desc: 'Get a real-time snapshot of your entire inventory, low-stock alerts, and stock valuation.',
    icon: <PieChart />,
    colorClass: 'green',
    features: [
      { icon: <Package2 />, label: 'Live Stock Levels', desc: 'Real-time count of all items in inventory' },
      { icon: <AlertTriangle />, label: 'Low Stock Alerts', desc: 'Automatic notifications when stock is critical' },
      { icon: <Layers />, label: 'Category Breakdown', desc: 'Stock grouped by product category' },
      { icon: <DollarSign />, label: 'Stock Valuation', desc: 'Total value of inventory at cost and selling price' },
      { icon: <Filter />, label: 'Smart Filters', desc: 'Filter by category, price range, or stock status' },
      { icon: <SortAsc />, label: 'Sort & Export', desc: 'Sort by quantity, value, or name and export' },
    ]
  },
  users: {
    title: 'User Management',
    desc: 'Control who has access to your business terminal and what permissions they hold.',
    icon: <ShieldAlert />,
    colorClass: 'pink',
    features: [
      { icon: <UserPlus />, label: 'Add Team Members', desc: 'Invite cashiers, managers, and accountants' },
      { icon: <Shield />, label: 'Role Management', desc: 'Assign Admin, Manager, or Cashier roles' },
      { icon: <Key />, label: 'Permissions Control', desc: 'Granular access control per module and action' },
      { icon: <Activity />, label: 'Activity Log', desc: 'Track all actions taken by each user' },
      { icon: <Settings2 />, label: 'Session Control', desc: 'Force logout and manage active sessions' },
      { icon: <Phone />, label: 'OTP Login', desc: 'All users log in securely via SMS OTP' },
    ]
  },
  backup: {
    title: 'Backup & Restore',
    desc: 'Keep your business data safe with automatic cloud backups and one-click restore.',
    icon: <CloudLightning />,
    colorClass: 'yellow',
    features: [
      { icon: <Upload />, label: 'Auto Cloud Backup', desc: 'Daily automatic backups to secure cloud storage' },
      { icon: <Download />, label: 'One-click Restore', desc: 'Restore your data to any previous backup point' },
      { icon: <HardDrive />, label: 'Local Export', desc: 'Download full data export as JSON or Excel' },
      { icon: <Database />, label: 'Data Encryption', desc: 'All backups are AES-256 encrypted at rest' },
      { icon: <Clock />, label: 'Backup History', desc: 'View and restore from the last 30 backup snapshots' },
      { icon: <CheckCircle />, label: 'Integrity Checks', desc: 'Automated verification of every backup created' },
    ]
  },
  tax: {
    title: 'Tax Management',
    desc: 'Configure GST slabs, manage tax categories, and generate GST-compliant reports.',
    icon: <Calculator />,
    colorClass: 'teal',
    features: [
      { icon: <PercentIcon />, label: 'GST Slabs', desc: 'Configure 0%, 5%, 12%, 18%, 28% GST rates' },
      { icon: <Tag />, label: 'Product Tax Mapping', desc: 'Link each product to its correct tax category' },
      { icon: <FileText />, label: 'GST Reports', desc: 'Generate GSTR-1 and GSTR-3B compatible reports' },
      { icon: <Receipt />, label: 'Tax on Invoices', desc: 'Auto-apply and display GST on every bill' },
      { icon: <TrendingUp />, label: 'Tax Liability Summary', desc: 'Monthly tax collected and input credit view' },
      { icon: <Download />, label: 'Export for CA', desc: 'Download tax data ready for your accountant' },
    ]
  },
  offers: {
    title: 'Offers & Discounts',
    desc: 'Create promotional campaigns, manage discount codes, and reward your loyal customers.',
    icon: <Gift />,
    colorClass: 'purple',
    features: [
      { icon: <Ticket />, label: 'Discount Codes', desc: 'Create coupon codes with flat or percentage discounts' },
      { icon: <PercentIcon />, label: 'Product Offers', desc: 'Apply discounts to specific products or categories' },
      { icon: <Star />, label: 'Loyalty Points', desc: 'Reward repeat customers with redeemable points' },
      { icon: <Calendar />, label: 'Scheduled Offers', desc: 'Set start and end dates for time-limited deals' },
      { icon: <Users />, label: 'Targeted Campaigns', desc: 'Send offers to specific customer segments' },
      { icon: <BarChart2 />, label: 'Offer Analytics', desc: 'Track redemption rates and revenue impact' },
    ]
  },
  help: {
    title: 'Help & Support',
    desc: 'Access user guides, video tutorials, and get in touch with our support team.',
    icon: <HelpCircle />,
    colorClass: 'green',
    features: [
      { icon: <BookOpen />, label: 'User Guide', desc: 'Step-by-step documentation for every feature' },
      { icon: <Video />, label: 'Video Tutorials', desc: 'Watch walkthroughs of billing, inventory, and reports' },
      { icon: <MessageCircle />, label: 'Live Chat', desc: 'Chat with our support agents in real-time' },
      { icon: <Headphones />, label: 'Phone Support', desc: 'Call our dedicated business support helpline' },
      { icon: <FileText />, label: 'FAQs', desc: 'Answers to the most common questions' },
      { icon: <CheckCircle />, label: 'System Status', desc: 'Live uptime and maintenance information' },
    ]
  },
};

// ─── All valid page tab names ─────────────────────────────────────────────────
const ALL_TABS = [
  'home','pos','products','invoices','settings',
  'customers','suppliers','purchase','expenses','returns',
  'reports','stock','users','backup','tax','offers','help'
];

// ─── Dashboard Component ──────────────────────────────────────────────────────
function Dashboard({ token, business, user, onSwitchBusiness, onLogout }) {
  const [activeTab, setActiveTab]               = useState('home');
  const [subscriptionKicked, setSubscriptionKicked] = useState(false);
  const [showStoreDropdown, setShowStoreDropdown]   = useState(false);
  const [showAdminDropdown, setShowAdminDropdown]   = useState(false);
  const storeMenuRef = useRef(null);
  const adminMenuRef = useRef(null);
  const [currentTime, setCurrentTime] = useState(new Date());

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

  // ── 16 Home Grid Cards ───────────────────────────────────────────────────────
  const cards = [
    { id: 'pos',       title: 'POS / Billing',      desc: 'Create invoices and process sales quickly',          icon: <Calculator />,  colorClass: 'blue'   },
    { id: 'products',  title: 'Products',            desc: 'Manage product stock, categories and prices',       icon: <Package />,     colorClass: 'green'  },
    { id: 'customers', title: 'Customers',           desc: 'Add and manage customer information',               icon: <Users />,       colorClass: 'purple' },
    { id: 'suppliers', title: 'Suppliers',           desc: 'Manage supplier details and transactions',          icon: <Truck />,       colorClass: 'yellow' },
    { id: 'invoices',  title: 'Sales',               desc: 'View and manage all sales records',                 icon: <ShoppingCart />,colorClass: 'pink'   },
    { id: 'purchase',  title: 'Purchase',            desc: 'Create purchase orders and track them',             icon: <ShoppingBag />, colorClass: 'teal'   },
    { id: 'expenses',  title: 'Expenses',            desc: 'Add and manage business expenses',                  icon: <Wallet />,      colorClass: 'orange' },
    { id: 'returns',   title: 'Returns',             desc: 'Manage product returns and refunds',                icon: <RotateCcw />,   colorClass: 'purple' },
    { id: 'reports',   title: 'Reports',             desc: 'View business reports and analytics',              icon: <BarChart3 />,   colorClass: 'blue'   },
    { id: 'stock',     title: 'Stock Summary',       desc: 'Check stock availability and low stock alerts',    icon: <PieChart />,    colorClass: 'green'  },
    { id: 'users',     title: 'User Management',     desc: 'Manage users and set permissions',                 icon: <ShieldAlert />, colorClass: 'pink'   },
    { id: 'settings',  title: 'Settings',            desc: 'Configure store settings and preferences',         icon: <SettingsIcon />,colorClass: 'blue'   },
    { id: 'backup',    title: 'Backup',              desc: 'Backup and restore your data',                     icon: <CloudLightning />,colorClass: 'yellow'},
    { id: 'tax',       title: 'Tax Management',      desc: 'Manage tax slabs and GST settings',               icon: <Calculator />,  colorClass: 'teal'   },
    { id: 'offers',    title: 'Offers & Discounts',  desc: 'Create and manage offers and discounts',           icon: <Gift />,        colorClass: 'purple' },
    { id: 'help',      title: 'Help & Support',      desc: 'Get help and view user guide',                    icon: <HelpCircle />,  colorClass: 'green'  },
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
      <div style={{ padding: '24px 32px' }}>
        <div className="breadcrumb-bar">
          <button className="breadcrumb-back-btn" onClick={() => setActiveTab('home')}>
            <ArrowLeft size={14} /> Back to Dashboard
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

      // ── Fully implemented pages ──
      case 'pos':
        return renderPageWithBreadcrumb('POS Billing', <POS token={token} business={business} />);
      case 'products':
        return <Items token={token} business={business} />;
      case 'invoices':
        return renderPageWithBreadcrumb('Sales History', <Invoices token={token} business={business} />);
      case 'settings':
        return renderPageWithBreadcrumb('Settings',
          <Settings token={token} business={business} user={user} onSwitchBusiness={onSwitchBusiness} onLogout={onLogout} />
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
          onClick={() => setActiveTab('home')}
          style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}
        >
          <div className="brand-icon-box" style={{ width: '40px', height: '40px', borderRadius: '10px', margin: 0 }}>
            <ShoppingCart size={20} strokeWidth={2.5} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.2rem', fontWeight: 600, color: '#0f172a', lineHeight: 1 }}>LEKA RETAIL</h1>
            <span style={{ fontSize: '0.7rem', color: '#6b7280', fontWeight: 500 }}>Smart Billing, Better Business</span>
          </div>
        </div>

        {/* Universal Search */}
        <div style={{ position: 'relative', width: '380px' }}>
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
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
              className="btn btn-secondary"
              style={{ background: '#ffffff', border: '1px solid #e5e7eb', color: '#374151', padding: '8px 14px', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 600 }}
              onClick={() => setShowStoreDropdown(!showStoreDropdown)}
            >
              <Store size={14} style={{ marginRight: '6px', color: '#2563eb' }} />
              {business.name}
              <ChevronDown size={14} style={{ marginLeft: '6px', color: '#9ca3af' }} />
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
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#374151' }}>Admin ⌵</span>
            </div>
            {showAdminDropdown && (
              <div className="dots-dropdown-menu" style={{ width: '160px', top: '42px' }}>
                <div style={{ padding: '10px 14px', borderBottom: '1px solid #f3f4f6' }}>
                  <p style={{ fontSize: '0.72rem', color: '#9ca3af' }}>Logged in as</p>
                  <p style={{ fontSize: '0.8rem', fontWeight: 600, color: '#374151', fontFamily: 'monospace', marginTop: '2px' }}>
                    {user?.phone}
                  </p>
                </div>
                <button className="dots-menu-item" onClick={() => { setShowAdminDropdown(false); setActiveTab('settings'); }}>
                  Configure Profile
                </button>
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
