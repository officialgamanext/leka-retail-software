import React from 'react';
import { Store, Calendar, ShieldCheck, RefreshCw, LogOut, Landmark } from 'lucide-react';

function Settings({ token, business, user, onSwitchBusiness, onLogout }) {
  // Parse expiration date
  let expiryStr = 'No Active Plan';
  if (business.subscriptionEndDate) {
    const expiry = new Date(business.subscriptionEndDate._seconds 
      ? business.subscriptionEndDate._seconds * 1000 
      : business.subscriptionEndDate
    );
    expiryStr = expiry.toLocaleDateString(undefined, { dateStyle: 'full' });
  }

  return (
    <div>
      <div className="mb-4">
        <h2>Terminal Settings</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '4px' }}>
          Configure shop details, monitor licensing statuses, or configure system settings.
        </p>
      </div>

      <div className="settings-grid">
        {/* Business details */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
            <div style={{ padding: '8px', background: 'var(--primary-light)', color: 'var(--primary)', borderRadius: '8px' }}>
              <Store size={20} />
            </div>
            <h3>Shop Profile</h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label>Registered Business Name</label>
              <p style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                {business.name}
              </p>
            </div>

            <div>
              <label>Billing Location / Address</label>
              <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                {business.address}
              </p>
            </div>

            <div>
              <label>Business Owner Reference</label>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                Phone Contact: <strong style={{ color: '#fff' }}>{user?.phone}</strong>
              </p>
            </div>
          </div>
        </div>

        {/* Subscription details */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
            <div style={{ padding: '8px', background: 'rgba(16,185,129,0.15)', color: 'var(--success)', borderRadius: '8px' }}>
              <ShieldCheck size={20} />
            </div>
            <h3>Subscription Status</h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label>Current Status</label>
              <span className="business-badge badge-active" style={{ position: 'static', display: 'inline-block', padding: '6px 12px', fontSize: '0.8rem' }}>
                Active (Premium License)
              </span>
            </div>

            <div>
              <label>Access Period Expiration Date</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)', fontWeight: 500 }}>
                <Calendar size={16} style={{ color: 'var(--text-secondary)' }} />
                <span>{expiryStr}</span>
              </div>
            </div>

            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '20px', marginTop: '10px', display: 'flex', gap: '12px' }}>
              <button className="btn btn-secondary" onClick={onSwitchBusiness}>
                <RefreshCw size={16} /> Switch Business
              </button>
              <button className="btn btn-danger" onClick={onLogout} style={{ border: 'none' }}>
                <LogOut size={16} /> Log Out Terminal
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Settings;
