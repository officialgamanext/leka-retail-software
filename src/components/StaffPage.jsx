import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Users,
  Search,
  Plus,
  Trash2,
  AlertTriangle,
  Loader2,
  X,
  Phone,
  ShieldCheck
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL;

function StaffPage({ token, business }) {
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Add Staff Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    fetchStaff();
  }, [business.id]);

  const fetchStaff = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await axios.get(`${API_URL}/staff`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'X-Business-Id': business.id
        }
      });
      if (response.data.success) {
        setStaffList(response.data.staff || []);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load staff list');
    } finally {
      setLoading(false);
    }
  };

  const handleAddStaff = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!name.trim()) {
      setFormError('Staff name is required');
      return;
    }

    if (!phone.trim()) {
      setFormError('Mobile number is required');
      return;
    }

    setSaving(true);
    try {
      const response = await axios.post(`${API_URL}/staff`, {
        name: name.trim(),
        phone: phone.trim()
      }, {
        headers: {
          Authorization: `Bearer ${token}`,
          'X-Business-Id': business.id
        }
      });

      if (response.data.success) {
        setStaffList([response.data.staff, ...staffList]);
        setShowAddModal(false);
        setName('');
        setPhone('');
      }
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to register staff');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteStaff = async (id, staffName) => {
    if (!window.confirm(`Are you sure you want to remove staff member "${staffName}"?`)) {
      return;
    }

    try {
      const response = await axios.delete(`${API_URL}/staff/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'X-Business-Id': business.id
        }
      });
      if (response.data.success) {
        setStaffList(staffList.filter(s => s.id !== id));
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to remove staff member');
    }
  };

  // Filter
  const filteredStaff = staffList.filter(s =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.phone.includes(searchQuery)
  );

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#0f172a' }}>Staff Directory</h2>
          <p style={{ color: '#64748b', fontSize: '0.78rem', marginTop: '2px' }}>
            Control user permissions, register cashier access, and view your active staff roster.
          </p>
        </div>
        <button
          className="btn-blue-primary"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', width: 'auto', padding: '8px 16px', fontSize: '0.85rem' }}
          onClick={() => {
            setFormError('');
            setShowAddModal(true);
          }}
        >
          <Plus size={16} /> Add Staff
        </button>
      </div>

      {error && (
        <div className="alert-banner error mb-4" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px', background: '#fef2f2', border: '1px solid #fee2e2', borderRadius: '8px', color: '#ef4444', marginBottom: '20px' }}>
          <AlertTriangle size={18} />
          <span style={{ fontSize: '0.85rem' }}>{error}</span>
        </div>
      )}

      {/* KPI stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', marginBottom: '24px', maxWidth: '600px' }}>
        <div style={{ background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Users size={20} />
          </div>
          <div>
            <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 500, textTransform: 'uppercase' }}>Active Staff</span>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 600, color: '#0f172a', margin: '2px 0 0 0' }}>{staffList.length} members</h3>
          </div>
        </div>

        <div style={{ background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: '#f0fdf4', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ShieldCheck size={20} />
          </div>
          <div>
            <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 500, textTransform: 'uppercase' }}>Scope Restrictions</span>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 600, color: '#0f172a', margin: '2px 0 0 0' }}>Billing-Only</h3>
          </div>
        </div>
      </div>

      {/* Search Filter */}
      <div style={{ position: 'relative', maxWidth: '350px', marginBottom: '20px' }}>
        <Search size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: '#9ca3af' }} />
        <input
          type="text"
          placeholder="Search staff by name or mobile number..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            paddingLeft: '38px',
            fontSize: '0.85rem',
            background: '#ffffff',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            paddingTop: '8px',
            paddingBottom: '8px',
            width: '100%'
          }}
        />
      </div>

      {/* Roster Table */}
      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '200px' }}>
          <Loader2 className="animate-spin" size={32} style={{ color: '#2563eb' }} />
        </div>
      ) : filteredStaff.length === 0 ? (
        <div style={{ textAlign: 'center', background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '60px 20px', color: '#64748b' }}>
          <Users size={36} style={{ color: '#9ca3af', marginBottom: '12px', margin: '0 auto 12px auto' }} />
          <p style={{ fontWeight: 500 }}>No staff members registered.</p>
        </div>
      ) : (
        <div className="data-table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Staff Name</th>
                <th>Mobile Number</th>
                <th style={{ width: '120px', textAlign: 'center' }}>Role</th>
                <th style={{ width: '100px', textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredStaff.map(s => (
                <tr key={s.id}>
                  <td style={{ fontWeight: 600, color: '#1f2937' }}>{s.name}</td>
                  <td style={{ fontFamily: 'monospace', color: '#4b5563' }}>{s.phone}</td>
                  <td style={{ textAlign: 'center' }}>
                    <span style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: '4px', background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0', fontWeight: 600 }}>
                      Cashier / Staff
                    </span>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <button
                      className="btn-action-delete"
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#ef4444',
                        cursor: 'pointer',
                        padding: '4px',
                        display: 'inline-flex',
                        alignItems: 'center'
                      }}
                      onClick={() => handleDeleteStaff(s.id, s.name)}
                    >
                      <Trash2 size={15} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Staff Modal */}
      {showAddModal && (
        <div className="modal-overlay">
          <form onSubmit={handleAddStaff} className="modal-content" style={{ maxWidth: '420px', background: '#ffffff', color: '#1e293b', padding: '24px', borderRadius: '16px', border: '1px solid #cbd5e1' }}>
            <div className="modal-header" style={{ borderBottom: '1px solid rgba(0,0,0,0.08)', paddingBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Users size={20} style={{ color: 'var(--primary)' }} /> Register Staff Member
              </h3>
              <button
                type="button"
                className="modal-close"
                style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '1.2rem' }}
                onClick={() => setShowAddModal(false)}
              >
                ✕
              </button>
            </div>

            {formError && (
              <div style={{ fontSize: '0.8rem', color: '#ef4444', background: '#fef2f2', border: '1px solid #fee2e2', borderRadius: '6px', padding: '10px', marginTop: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <AlertTriangle size={14} />
                <span>{formError}</span>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', padding: '16px 0' }}>
              {/* Staff Name Field */}
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 500, color: '#4b5563', marginBottom: '4px' }}>
                  Staff Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Ramesh Kumar"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  style={{ background: '#ffffff', border: '1px solid #cbd5e1', color: '#0f172a', fontSize: '0.85rem', width: '100%', boxSizing: 'border-box', height: '40px', padding: '8px 12px', borderRadius: '8px' }}
                  required
                />
              </div>

              {/* Mobile Number Field */}
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 500, color: '#4b5563', marginBottom: '4px' }}>
                  Mobile Number *
                </label>
                <input
                  type="tel"
                  placeholder="e.g. 9876543210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  style={{ background: '#ffffff', border: '1px solid #cbd5e1', color: '#0f172a', fontSize: '0.85rem', width: '100%', boxSizing: 'border-box', height: '40px', padding: '8px 12px', borderRadius: '8px' }}
                  required
                />
                <span style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '4px', display: 'block' }}>
                  Staff will log in securely using SMS OTP to this number.
                </span>
              </div>
            </div>

            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', borderTop: '1px solid rgba(0,0,0,0.08)', paddingTop: '16px', marginTop: '10px' }}>
              <button
                type="button"
                className="btn-secondary"
                style={{ padding: '8px 16px', fontSize: '0.82rem', border: '1px solid #e2e8f0', background: '#ffffff', color: '#4b5563', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}
                onClick={() => setShowAddModal(false)}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn-blue-primary"
                style={{ width: 'auto', padding: '8px 20px', fontSize: '0.82rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}
                disabled={saving}
              >
                {saving ? (
                  <><Loader2 className="animate-spin" size={14} /> Saving...</>
                ) : (
                  'Save Staff'
                )}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

export default StaffPage;
