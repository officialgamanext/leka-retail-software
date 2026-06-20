import React, { useState } from 'react';
import axios from 'axios';
import { 
  Store, Calendar, ShieldCheck, RefreshCw, LogOut, 
  Percent, Save, Loader2, AlertTriangle, CheckCircle, Printer 
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL;

function Settings({ token, business, user, onSwitchBusiness, onLogout, printerDevice, printerConnecting, handleConnectPrinter }) {
  const [name, setName] = useState(business.name || '');
  const [address, setAddress] = useState(business.address || '');
  const [gstEnabled, setGstEnabled] = useState(business.gstEnabled || false);
  const [gstPercentage, setGstPercentage] = useState(business.gstPercentage !== undefined ? business.gstPercentage : 18);
  const [enableOutOfStockBilling, setEnableOutOfStockBilling] = useState(business.enableOutOfStockBilling || false);
  
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Parse expiration date
  let expiryStr = 'No Active Plan';
  let isExpired = true;
  if (business.subscriptionEndDate) {
    const expiry = new Date(business.subscriptionEndDate._seconds 
      ? business.subscriptionEndDate._seconds * 1000 
      : business.subscriptionEndDate
    );
    expiryStr = expiry.toLocaleDateString(undefined, { dateStyle: 'full' });
    isExpired = expiry < new Date();
  }

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg('');
    setErrorMsg('');
    try {
      const response = await axios.put(`${API_URL}/businesses/${business.id}`, {
        name,
        address,
        gstEnabled,
        gstPercentage: Number(gstPercentage),
        enableOutOfStockBilling
      }, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (response.data.success) {
        setSuccessMsg('Business configurations updated successfully!');
        
        // Update local storage so session maintains consistency
        const updatedBiz = {
          ...business,
          name: response.data.business.name,
          address: response.data.business.address,
          gstEnabled: response.data.business.gstEnabled,
          gstPercentage: response.data.business.gstPercentage,
          enableOutOfStockBilling: response.data.business.enableOutOfStockBilling
        };
        localStorage.setItem('leka_business', JSON.stringify(updatedBiz));
        
        // Reload after 1 second to sync state everywhere
        setTimeout(() => {
          window.location.reload();
        }, 1200);
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to update business settings.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Page Header */}
      <div>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>Terminal Settings</h2>
        <p style={{ color: '#64748b', fontSize: '0.85rem', marginTop: '4px' }}>
          Configure shop details, monitor licensing statuses, or configure system settings.
        </p>
      </div>

      {successMsg && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#ecfdf5', border: '1px solid #d1fae5', borderRadius: '8px', padding: '14px', color: '#059669', fontSize: '0.88rem' }}>
          <CheckCircle size={18} />
          <span>{successMsg} — Reloading terminal...</span>
        </div>
      )}

      {errorMsg && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#fef2f2', border: '1px solid #fee2e2', borderRadius: '8px', padding: '14px', color: '#ef4444', fontSize: '0.88rem' }}>
          <AlertTriangle size={18} />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSave} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
        
        {/* Card 1: Shop Profile Details */}
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '24px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', borderBottom: '1px solid #f1f5f9', paddingBottom: '14px' }}>
            <div style={{ padding: '8px', background: '#eff6ff', color: '#2563eb', borderRadius: '8px', display: 'flex' }}>
              <Store size={20} />
            </div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: '#1e293b', margin: 0 }}>Shop Profile</h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '6px' }}>Registered Business Name *</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                disabled={saving}
                required
                style={{
                  width: '100%', padding: '10px 12px', fontSize: '0.88rem',
                  border: '1px solid #cbd5e1', borderRadius: '8px', background: '#f8fafc',
                  color: '#0f172a'
                }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '6px' }}>Billing Location / Address *</label>
              <textarea
                value={address}
                onChange={e => setAddress(e.target.value)}
                disabled={saving}
                required
                rows={3}
                style={{
                  width: '100%', padding: '10px 12px', fontSize: '0.88rem',
                  border: '1px solid #cbd5e1', borderRadius: '8px', background: '#f8fafc',
                  color: '#0f172a', resize: 'none', lineHeight: '1.4'
                }}
              />
            </div>

            <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
              <span style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'block', textTransform: 'uppercase', fontWeight: 600 }}>Owner Reference Contact</span>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#334155', display: 'block', marginTop: '2px' }}>{user?.phone || '—'}</span>
            </div>
          </div>
        </div>

        {/* Card 2: GST Configuration Toggle & Percent */}
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '24px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', borderBottom: '1px solid #f1f5f9', paddingBottom: '14px' }}>
            <div style={{ padding: '8px', background: '#fef3c7', color: '#d97706', borderRadius: '8px', display: 'flex' }}>
              <Percent size={20} />
            </div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: '#1e293b', margin: 0 }}>Billing & Tax Settings</h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            
            {/* Toggle Container */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #f1f5f9' }}>
              <div>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#1e293b', display: 'block' }}>Apply GST Tax</span>
                <span style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px', display: 'block' }}>Enable or disable tax on invoices.</span>
              </div>
              
              {/* Custom Switch checkbox */}
              <label style={{ position: 'relative', display: 'inline-block', width: '46px', height: '24px', cursor: 'pointer' }}>
                <input 
                  type="checkbox" 
                  checked={gstEnabled} 
                  onChange={e => setGstEnabled(e.target.checked)}
                  disabled={saving}
                  style={{ opacity: 0, width: 0, height: 0 }} 
                />
                <span style={{
                  position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0,
                  backgroundColor: gstEnabled ? '#2563eb' : '#cbd5e1',
                  transition: '.3s', borderRadius: '24px'
                }}>
                  <span style={{
                    position: 'absolute', content: '""', height: '18px', width: '18px', left: gstEnabled ? '24px' : '4px', bottom: '3px',
                    backgroundColor: 'white', transition: '.3s', borderRadius: '50%',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                  }}></span>
                </span>
              </label>
            </div>

            {/* GST Rate input (Visible only when GST is enabled) */}
            {gstEnabled && (
              <div style={{ animation: 'fadeIn 0.2s ease', background: '#eff6ff', border: '1px solid #dbeafe', borderRadius: '12px', padding: '16px' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#1e40af', display: 'block', marginBottom: '8px' }}>
                  Default GST Percentage (%) *
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={gstPercentage}
                    onChange={e => setGstPercentage(e.target.value)}
                    disabled={saving}
                    required
                    placeholder="e.g. 18"
                    style={{
                      width: '100%', padding: '10px 38px 10px 12px', fontSize: '0.88rem',
                      border: '1px solid #bfdbfe', borderRadius: '8px', background: '#ffffff',
                      color: '#0f172a', fontWeight: 600
                    }}
                  />
                  <Percent size={14} style={{ position: 'absolute', right: '12px', top: '13px', color: '#1d4ed8' }} />
                </div>
                <span style={{ fontSize: '0.7rem', color: '#1d4ed8', marginTop: '6px', display: 'block' }}>
                  This rate will apply globally to all cart items on checkout.
                </span>
              </div>
            )}

            {/* Out of Stock Billing Toggle */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #f1f5f9' }}>
              <div>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#1e293b', display: 'block' }}>Out of Stock Billing</span>
                <span style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px', display: 'block' }}>Enable billing for out of stock items.</span>
              </div>
              
              <label style={{ position: 'relative', display: 'inline-block', width: '46px', height: '24px', cursor: 'pointer' }}>
                <input 
                  type="checkbox" 
                  checked={enableOutOfStockBilling} 
                  onChange={e => setEnableOutOfStockBilling(e.target.checked)}
                  disabled={saving}
                  style={{ opacity: 0, width: 0, height: 0 }} 
                />
                <span style={{
                  position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0,
                  backgroundColor: enableOutOfStockBilling ? '#2563eb' : '#cbd5e1',
                  transition: '.3s', borderRadius: '24px'
                }}>
                  <span style={{
                    position: 'absolute', content: '""', height: '18px', width: '18px', left: enableOutOfStockBilling ? '24px' : '4px', bottom: '3px',
                    backgroundColor: 'white', transition: '.3s', borderRadius: '50%',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                  }}></span>
                </span>
              </label>
            </div>

            <button
              type="submit"
              className="btn-blue-primary"
              disabled={saving}
              style={{ marginTop: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
            >
              {saving ? (
                <><Loader2 className="animate-spin" size={16} /> Saving Configurations...</>
              ) : (
                <><Save size={16} /> Save Configurations</>
              )}
            </button>
          </div>
        </div>

        {/* Card 3: Subscription details & Actions */}
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '24px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', borderBottom: '1px solid #f1f5f9', paddingBottom: '14px' }}>
            <div style={{ padding: '8px', background: isExpired ? '#fef2f2' : '#ecfdf5', color: isExpired ? '#ef4444' : '#10b981', borderRadius: '8px', display: 'flex' }}>
              <ShieldCheck size={20} />
            </div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: '#1e293b', margin: 0 }}>Subscription & Access</h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '6px' }}>License Status</label>
              <span style={{
                display: 'inline-block', padding: '6px 12px', fontSize: '0.78rem', fontWeight: 600, borderRadius: '6px',
                background: isExpired ? '#fef2f2' : '#ecfdf5',
                color: isExpired ? '#ef4444' : '#059669',
                border: isExpired ? '1px solid #fee2e2' : '1px solid #d1fae5'
              }}>
                {isExpired ? 'Expired / Inactive' : 'Active (Premium License)'}
              </span>
            </div>

            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '6px' }}>Access Period Expiration Date</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#1e293b', fontWeight: 500, fontSize: '0.88rem' }}>
                <Calendar size={16} style={{ color: '#94a3b8' }} />
                <span>{expiryStr}</span>
              </div>
            </div>

            <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '20px', marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button type="button" className="btn btn-secondary" onClick={onSwitchBusiness} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '10px', fontSize: '0.85rem' }}>
                <RefreshCw size={14} /> Switch Active Business
              </button>
              <button type="button" className="btn btn-danger" onClick={onLogout} style={{ border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '10px', fontSize: '0.85rem' }}>
                <LogOut size={14} /> Log Out Terminal
              </button>
            </div>
          </div>
        </div>

        {/* Card 4: Hardware & Printer Settings */}
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '24px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', borderBottom: '1px solid #f1f5f9', paddingBottom: '14px' }}>
            <div style={{ padding: '8px', background: '#f5f3ff', color: '#7c3aed', borderRadius: '8px', display: 'flex' }}>
              <Printer size={20} />
            </div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: '#1e293b', margin: 0 }}>Printer Settings</h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '6px' }}>Receipt Printer</label>
              <p style={{ fontSize: '0.74rem', color: '#64748b', margin: '0 0 12px 0' }}>
                Connect a Bluetooth thermal printer to print worksheets and checkout receipts.
              </p>
              
              <button
                type="button"
                onClick={handleConnectPrinter}
                disabled={printerConnecting}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  background: printerDevice ? '#ecfdf5' : '#eff6ff',
                  color: printerDevice ? '#059669' : '#2563eb',
                  border: printerDevice ? '1px solid #a7f3d0' : '1px solid #bfdbfe',
                  borderRadius: '8px',
                  padding: '12px 20px',
                  fontSize: '0.88rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  width: '100%',
                  transition: 'all 0.2s ease'
                }}
              >
                {printerConnecting ? (
                  <><Loader2 className="animate-spin" size={16} /> Connecting...</>
                ) : printerDevice ? (
                  <><CheckCircle size={16} /> Printer Connected ({printerDevice.name || 'BT Printer'})</>
                ) : (
                  <><Printer size={16} /> Connect Bluetooth Printer</>
                )}
              </button>
            </div>

            {printerDevice && (
              <div style={{ animation: 'fadeIn 0.2s ease', background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '12px', padding: '16px', display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                <CheckCircle size={16} style={{ color: '#059669', flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <span style={{ fontSize: '0.82rem', color: '#047857', fontWeight: 600, display: 'block' }}>Printer Active</span>
                  <span style={{ fontSize: '0.72rem', color: '#065f46', marginTop: '2px', display: 'block' }}>
                    Your terminal is connected and ready to print checkout bills.
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

      </form>
    </div>
  );
}

export default Settings;
