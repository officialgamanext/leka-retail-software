import React, { useState } from 'react';
import { ShoppingCart, Package, ReceiptText, Settings as SettingsIcon, LogOut, RefreshCw, User, Store } from 'lucide-react';
import POS from './POS';
import Products from './Products';
import Invoices from './Invoices';
import Settings from './Settings';

function Dashboard({ token, business, user, onSwitchBusiness, onLogout }) {
  const [activeTab, setActiveTab] = useState('pos'); // 'pos' | 'products' | 'invoices' | 'settings'

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'pos':
        return <POS token={token} business={business} />;
      case 'products':
        return <Products token={token} business={business} />;
      case 'invoices':
        return <Invoices token={token} business={business} />;
      case 'settings':
        return (
          <Settings 
            token={token} 
            business={business} 
            user={user} 
            onSwitchBusiness={onSwitchBusiness} 
            onLogout={onLogout} 
          />
        );
      default:
        return <POS token={token} business={business} />;
    }
  };

  return (
    <div className="dashboard-layout">
      {/* Sidebar Navigation */}
      <aside className="sidebar">
        <div>
          <div className="sidebar-logo">LEKA RETAIL</div>
          <ul className="sidebar-menu">
            <li className="sidebar-item">
              <div 
                className={`sidebar-link ${activeTab === 'pos' ? 'active' : ''}`}
                onClick={() => setActiveTab('pos')}
              >
                <ShoppingCart size={18} /> POS Billing
              </div>
            </li>
            <li className="sidebar-item">
              <div 
                className={`sidebar-link ${activeTab === 'products' ? 'active' : ''}`}
                onClick={() => setActiveTab('products')}
              >
                <Package size={18} /> Products
              </div>
            </li>
            <li className="sidebar-item">
              <div 
                className={`sidebar-link ${activeTab === 'invoices' ? 'active' : ''}`}
                onClick={() => setActiveTab('invoices')}
              >
                <ReceiptText size={18} /> Sales Invoices
              </div>
            </li>
            <li className="sidebar-item">
              <div 
                className={`sidebar-link ${activeTab === 'settings' ? 'active' : ''}`}
                onClick={() => setActiveTab('settings')}
              >
                <SettingsIcon size={18} /> Settings
              </div>
            </li>
          </ul>
        </div>

        <div className="sidebar-footer">
          <button className="btn btn-secondary w-full" style={{ width: '100%', justifyContent: 'flex-start' }} onClick={onSwitchBusiness}>
            <RefreshCw size={16} /> Switch Business
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="main-content">
        {/* Top Header Bar */}
        <header className="topbar">
          <div className="topbar-title">
            <Store size={16} style={{ verticalAlign: 'middle', marginRight: '6px', color: 'var(--primary)' }} />
            Active Terminal: <span>{business.name}</span>
          </div>

          <div className="user-profile">
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontSize: '0.85rem', fontWeight: 600 }}>{user?.phone}</p>
              <span style={{ fontSize: '0.7rem', color: 'var(--success)' }}>
                Subscription Active
              </span>
            </div>
            <div className="user-avatar">
              <User size={18} />
            </div>
          </div>
        </header>

        {/* Dynamic Body Router */}
        <div className="content-body">
          {renderActiveTab()}
        </div>
      </main>
    </div>
  );
}

export default Dashboard;
