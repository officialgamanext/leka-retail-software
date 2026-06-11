import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Users, Search, UserPlus, Trash2, AlertTriangle, Loader2, Plus, X, MapPin, Phone, User } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL;

function Customers({ token, business }) {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Add customer modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [newCustAddress, setNewCustAddress] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    fetchCustomers();
  }, [business.id]);

  const fetchCustomers = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await axios.get(`${API_URL}/customers`, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'X-Business-Id': business.id
        }
      });
      if (response.data.success) {
        setCustomers(response.data.customers);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load customers list');
    } finally {
      setLoading(false);
    }
  };

  const handleAddCustomer = async (e) => {
    e.preventDefault();
    setFormError('');
    
    if (!newCustName.trim()) {
      setFormError('Customer name is required');
      return;
    }
    if (!newCustPhone.trim()) {
      setFormError('Mobile number is required');
      return;
    }

    setSaving(true);
    try {
      const response = await axios.post(`${API_URL}/customers`, {
        name: newCustName.trim(),
        phone: newCustPhone.trim(),
        address: newCustAddress.trim()
      }, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'X-Business-Id': business.id
        }
      });

      if (response.data.success) {
        setCustomers([response.data.customer, ...customers]);
        setShowAddModal(false);
        setNewCustName('');
        setNewCustPhone('');
        setNewCustAddress('');
      }
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to save customer');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCustomer = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete customer "${name}"?`)) {
      return;
    }

    try {
      const response = await axios.delete(`${API_URL}/customers/${id}`, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'X-Business-Id': business.id
        }
      });
      if (response.data.success) {
        setCustomers(customers.filter(c => c.id !== id));
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete customer');
    }
  };

  const filteredCustomers = customers.filter(cust => 
    cust.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    cust.phone.includes(searchQuery) ||
    (cust.address && cust.address.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const getInitials = (name) => {
    if (!name) return 'C';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const getPastelColor = (name) => {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const h = Math.abs(hash % 360);
    return `hsl(${h}, 70%, 92%)`;
  };

  const getPastelTextColor = (name) => {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const h = Math.abs(hash % 360);
    return `hsl(${h}, 80%, 30%)`;
  };

  const totalCount = customers.length;
  const withAddressCount = customers.filter(c => c.address && c.address.trim()).length;
  const recentCount = customers.filter(c => {
    if (!c.createdAt) return false;
    const date = c.createdAt._seconds ? new Date(c.createdAt._seconds * 1000) : new Date(c.createdAt);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return date > thirtyDaysAgo;
  }).length;

  return (
    <div>
      <div className="page-header-container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#0f172a' }}>Customer Directory</h2>
          <p style={{ color: '#64748b', fontSize: '0.78rem', marginTop: '2px' }}>
            Manage your customer database, track contacts and view their addresses.
          </p>
        </div>
        <button 
          className="btn-blue-primary" 
          style={{ width: 'auto', padding: '10px 20px', fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}
          onClick={() => setShowAddModal(true)}
        >
          <UserPlus size={16} /> Add Customer
        </button>
      </div>

      {error && (
        <div className="alert-banner error mb-4">
          <AlertTriangle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Stats Cards */}
      <div className="stats-grid-container" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '24px' }}>
        {[
          { label: 'Total Customers', value: totalCount, desc: 'Registered in database', color: '#2563eb', bg: '#eff6ff', icon: <Users size={20} /> },
          { label: 'With Address', value: withAddressCount, desc: 'Delivery profiles', color: '#10b981', bg: '#ecfdf5', icon: <MapPin size={20} /> },
          { label: 'Added Recent (30d)', value: recentCount, desc: 'New customer growth', color: '#8b5cf6', bg: '#f5f3ff', icon: <Plus size={16} /> }
        ].map((stat, idx) => (
          <div key={idx} style={{ background: '#ffffff', borderRadius: '14px', padding: '20px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 500 }}>{stat.label}</span>
              <h3 style={{ fontSize: '1.5rem', fontWeight: 600, color: '#0f172a', margin: '4px 0' }}>{stat.value}</h3>
              <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>{stat.desc}</span>
            </div>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: stat.bg, color: stat.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {stat.icon}
            </div>
          </div>
        ))}
      </div>

      {/* Search and filter bar */}
      <div className="search-filter-container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', gap: '16px' }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: '450px' }}>
          <Search 
            size={18} 
            style={{ position: 'absolute', left: '12px', top: '12px', color: '#94a3b8' }} 
          />
          <input
            type="text"
            placeholder="Search by name, phone number, or address..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ 
              paddingLeft: '40px', 
              color: '#0f172a', 
              background: '#ffffff', 
              border: '1px solid #e2e8f0', 
              borderRadius: '10px', 
              fontSize: '0.85rem',
              width: '100%',
              boxShadow: 'none',
              height: '42px',
              boxSizing: 'border-box'
            }}
          />
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '200px' }}>
          <Loader2 className="animate-spin" size={32} style={{ color: 'var(--primary)' }} />
        </div>
      ) : filteredCustomers.length === 0 ? (
        <div style={{ textAlign: 'center', background: '#ffffff', padding: '60px 20px', border: '1px solid #e2e8f0', borderRadius: '16px', color: '#64748b', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}>
          <Users size={40} style={{ color: '#94a3b8', marginBottom: '12px' }} />
          <p style={{ fontWeight: 600, color: '#334155' }}>No customers found</p>
          <p style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '4px' }}>Try searching with a different name or add a new customer profile.</p>
        </div>
      ) : (
        <div className="data-table-container" style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 20px rgba(0,0,0,0.02)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <th style={{ padding: '14px 20px', color: '#475569', fontWeight: 600 }}>Customer Name</th>
                <th style={{ padding: '14px 20px', color: '#475569', fontWeight: 600 }}>Mobile Number</th>
                <th style={{ padding: '14px 20px', color: '#475569', fontWeight: 600 }}>Address</th>
                <th style={{ padding: '14px 20px', color: '#475569', fontWeight: 600 }}>Registered Date</th>
                <th style={{ padding: '14px 20px', color: '#475569', fontWeight: 600, textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredCustomers.map(cust => {
                const dateVal = cust.createdAt?._seconds 
                  ? new Date(cust.createdAt._seconds * 1000) 
                  : new Date(cust.createdAt);
                
                const initials = getInitials(cust.name);
                const avatarBg = getPastelColor(cust.name);
                const avatarText = getPastelTextColor(cust.name);

                return (
                  <tr key={cust.id} style={{ borderBottom: '1px solid #f1f5f9' }} className="table-row-hover">
                    <td style={{ padding: '14px 20px', fontWeight: 600, color: '#0f172a' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ 
                          display: 'flex', alignItems: 'center', justifyContent: 'center', 
                          width: '32px', height: '32px', borderRadius: '50%', 
                          background: avatarBg, color: avatarText, fontWeight: 600, fontSize: '0.8rem' 
                        }}>
                          {initials}
                        </div>
                        <span>{cust.name}</span>
                      </div>
                    </td>
                    <td style={{ padding: '14px 20px', fontFamily: 'monospace', color: '#475569', fontSize: '0.82rem' }}>{cust.phone}</td>
                    <td style={{ padding: '14px 20px', color: '#64748b' }}>{cust.address || '—'}</td>
                    <td style={{ padding: '14px 20px', color: '#64748b' }}>{cust.createdAt ? dateVal.toLocaleDateString() : '—'}</td>
                    <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                      <button 
                        className="btn" 
                        style={{ 
                          padding: '6px 12px', fontSize: '0.78rem', color: '#ef4444', 
                          border: '1px solid #fee2e2', background: '#fef2f2', 
                          borderRadius: '6px', fontWeight: 600, cursor: 'pointer',
                          transition: 'all 0.15s ease'
                        }}
                        onClick={() => handleDeleteCustomer(cust.id, cust.name)}
                      >
                        <Trash2 size={12} style={{ marginRight: '4px', verticalAlign: 'text-bottom' }} /> Delete
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Customer Modal */}
      {showAddModal && (
        <div className="modal-overlay">
          <form onSubmit={handleAddCustomer} className="modal-content" style={{ maxWidth: '420px', background: '#ffffff', color: '#1e293b', padding: '24px', borderRadius: '16px' }}>
            <div className="modal-header" style={{ borderBottom: '1px solid rgba(0,0,0,0.08)', paddingBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#0f172a', fontSize: '1rem', fontWeight: 600 }}>
                <UserPlus size={20} style={{ color: 'var(--primary)' }} /> Add New Customer
              </h3>
              <button type="button" className="modal-close" style={{ color: '#64748b', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem' }} onClick={() => setShowAddModal(false)}>
                ✕
              </button>
            </div>

            {formError && (
              <div className="alert-banner error mb-4" style={{ marginTop: '12px', marginBottom: 0 }}>
                <AlertTriangle size={16} />
                <span>{formError}</span>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', padding: '16px 0' }}>
              <div>
                <label style={{ fontSize: '0.78rem', color: '#4b5563', fontWeight: 500, display: 'block', marginBottom: '4px' }}>
                  Customer Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Siva Krishna"
                  value={newCustName}
                  onChange={(e) => setNewCustName(e.target.value)}
                  style={{ background: '#ffffff', border: '1px solid #cbd5e1', color: '#0f172a', fontSize: '0.85rem', width: '100%', boxSizing: 'border-box', height: '40px', padding: '8px 12px', borderRadius: '8px' }}
                  required
                />
              </div>

              <div>
                <label style={{ fontSize: '0.78rem', color: '#4b5563', fontWeight: 500, display: 'block', marginBottom: '4px' }}>
                  Mobile Number *
                </label>
                <input
                  type="text"
                  placeholder="e.g. 9876543210"
                  value={newCustPhone}
                  onChange={(e) => setNewCustPhone(e.target.value)}
                  style={{ background: '#ffffff', border: '1px solid #cbd5e1', color: '#0f172a', fontSize: '0.85rem', width: '100%', boxSizing: 'border-box', height: '40px', padding: '8px 12px', borderRadius: '8px' }}
                  required
                />
              </div>

              <div>
                <label style={{ fontSize: '0.78rem', color: '#4b5563', fontWeight: 500, display: 'block', marginBottom: '4px' }}>
                  Address
                </label>
                <textarea
                  placeholder="e.g. Plot 42, Hitech City, Hyderabad"
                  value={newCustAddress}
                  onChange={(e) => setNewCustAddress(e.target.value)}
                  style={{ background: '#ffffff', border: '1px solid #cbd5e1', color: '#0f172a', fontSize: '0.85rem', width: '100%', boxSizing: 'border-box', minHeight: '80px', padding: '8px 12px', borderRadius: '8px', fontFamily: 'inherit' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', borderTop: '1px solid rgba(0,0,0,0.08)', paddingTop: '16px', marginTop: '10px' }}>
              <button type="button" className="btn-secondary" style={{ padding: '8px 16px', fontSize: '0.82rem', border: '1px solid #e2e8f0', background: '#ffffff', color: '#4b5563', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }} onClick={() => setShowAddModal(false)} disabled={saving}>
                Cancel
              </button>
              <button
                type="submit"
                className="btn-blue-primary"
                style={{ width: 'auto', padding: '8px 20px', fontSize: '0.82rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}
                disabled={saving}
              >
                {saving ? <><Loader2 className="animate-spin" size={14} /> Saving...</> : 'Save Customer'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Inline styles for row hover */}
      <style>{`
        .table-row-hover:hover {
          background-color: #f8fafc;
        }
      `}</style>
    </div>
  );
}

export default Customers;
