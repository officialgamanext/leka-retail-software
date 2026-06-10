import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Wallet,
  Search,
  Plus,
  Trash2,
  AlertTriangle,
  Loader2,
  Calendar,
  IndianRupee,
  Receipt,
  X
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL;

function Expenses({ token, business }) {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Add Expense modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [forExpense, setForExpense] = useState('');
  const [amount, setAmount] = useState('');
  
  // Date prefill utility
  const getTodayDateString = () => {
    return new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD format
  };
  const [date, setDate] = useState(getTodayDateString());
  
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    fetchExpenses();
  }, [business.id]);

  const fetchExpenses = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await axios.get(`${API_URL}/expenses`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'X-Business-Id': business.id
        }
      });
      if (response.data.success) {
        setExpenses(response.data.expenses || []);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load expenses list');
    } finally {
      setLoading(false);
    }
  };

  const handleAddExpense = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!forExpense.trim()) {
      setFormError('Expense purpose ("For") is required');
      return;
    }

    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      setFormError('Please enter a valid amount greater than 0');
      return;
    }

    setSaving(true);
    try {
      const response = await axios.post(`${API_URL}/expenses`, {
        forExpense: forExpense.trim(),
        amount: Number(amount),
        date: date
      }, {
        headers: {
          Authorization: `Bearer ${token}`,
          'X-Business-Id': business.id
        }
      });

      if (response.data.success) {
        // Since API returns { success: true, expense: ... }
        // Prepend and refresh list
        setExpenses([response.data.expense, ...expenses]);
        setShowAddModal(false);
        setForExpense('');
        setAmount('');
        setDate(getTodayDateString());
      }
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to record expense');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteExpense = async (id, purpose) => {
    if (!window.confirm(`Are you sure you want to delete the expense for "${purpose}"?`)) {
      return;
    }

    try {
      const response = await axios.delete(`${API_URL}/expenses/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'X-Business-Id': business.id
        }
      });
      if (response.data.success) {
        setExpenses(expenses.filter(exp => exp.id !== id));
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete expense entry');
    }
  };

  // Filter logic
  const filteredExpenses = expenses.filter(exp =>
    exp.forExpense.toLowerCase().includes(searchQuery.toLowerCase()) ||
    exp.date.includes(searchQuery)
  );

  // Statistics
  const totalExpenseSum = expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
  
  // Current Month Expenses Calculation
  const currentMonthYear = new Date().toISOString().substring(0, 7); // "YYYY-MM"
  const currentMonthSum = expenses
    .filter(e => e.date && e.date.startsWith(currentMonthYear))
    .reduce((sum, e) => sum + Number(e.amount || 0), 0);

  return (
    <div>
      {/* Header section */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#0f172a' }}>Expense Log Book</h2>
          <p style={{ color: '#64748b', fontSize: '0.78rem', marginTop: '2px' }}>
            Record operational spending, utility bills, employee payouts, and inventory costs.
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
          <Plus size={16} /> Add Expense
        </button>
      </div>

      {error && (
        <div className="alert-banner error mb-4" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px', background: '#fef2f2', border: '1px solid #fee2e2', borderRadius: '8px', color: '#ef4444', marginBottom: '20px' }}>
          <AlertTriangle size={18} />
          <span style={{ fontSize: '0.85rem' }}>{error}</span>
        </div>
      )}

      {/* Summary KPI Widgets */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <div style={{ background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: '#fff7ed', color: '#ea580c', display: 'flex', alignItems: 'center', justifycontent: 'center', display: 'flex', justifyContent: 'center' }}>
            <Wallet size={20} />
          </div>
          <div>
            <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 500, textTransform: 'uppercase' }}>Total Expenses</span>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 600, color: '#0f172a', margin: '2px 0 0 0' }}>₹{totalExpenseSum.toFixed(2)}</h3>
          </div>
        </div>

        <div style={{ background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifycontent: 'center', display: 'flex', justifyContent: 'center' }}>
            <IndianRupee size={20} />
          </div>
          <div>
            <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 500, textTransform: 'uppercase' }}>This Month</span>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 600, color: '#0f172a', margin: '2px 0 0 0' }}>₹{currentMonthSum.toFixed(2)}</h3>
          </div>
        </div>

        <div style={{ background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: '#f5f3ff', color: '#7c3aed', display: 'flex', alignItems: 'center', justifycontent: 'center', display: 'flex', justifyContent: 'center' }}>
            <Receipt size={20} />
          </div>
          <div>
            <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 500, textTransform: 'uppercase' }}>Total Transactions</span>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 600, color: '#0f172a', margin: '2px 0 0 0' }}>{expenses.length} records</h3>
          </div>
        </div>
      </div>

      {/* Filter Options */}
      <div style={{ position: 'relative', maxWidth: '350px', marginBottom: '20px' }}>
        <Search size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: '#9ca3af' }} />
        <input
          type="text"
          placeholder="Filter by description or date (YYYY-MM-DD)..."
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

      {/* Data Table */}
      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '200px' }}>
          <Loader2 className="animate-spin" size={32} style={{ color: '#2563eb' }} />
        </div>
      ) : filteredExpenses.length === 0 ? (
        <div style={{ textAlign: 'center', background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '60px 20px', color: '#64748b' }}>
          <Wallet size={36} style={{ color: '#9ca3af', marginBottom: '12px', margin: '0 auto 12px auto' }} />
          <p style={{ fontWeight: 500 }}>No expense records found.</p>
        </div>
      ) : (
        <div className="data-table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: '150px' }}>Date</th>
                <th>Expense For / Description</th>
                <th style={{ width: '180px', textAlign: 'right' }}>Amount (₹)</th>
                <th style={{ width: '100px', textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredExpenses.map(exp => (
                <tr key={exp.id}>
                  <td style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: 500 }}>
                    <Calendar size={13} style={{ color: '#64748b' }} />
                    {exp.date}
                  </td>
                  <td style={{ fontWeight: 600, color: '#1f2937' }}>{exp.forExpense}</td>
                  <td style={{ fontWeight: 600, textAlign: 'right', color: '#ef4444' }}>
                    -₹{Number(exp.amount).toFixed(2)}
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
                      onClick={() => handleDeleteExpense(exp.id, exp.forExpense)}
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

      {/* Add Expense Modal */}
      {showAddModal && (
        <div className="modal-overlay">
          <form onSubmit={handleAddExpense} className="modal-content" style={{ maxWidth: '420px', background: '#ffffff', color: '#1e293b', padding: '24px', borderRadius: '16px', border: '1px solid #cbd5e1' }}>
            <div className="modal-header" style={{ borderBottom: '1px solid rgba(0,0,0,0.08)', paddingBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Wallet size={20} style={{ color: 'var(--primary)' }} /> Log Business Expense
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
              {/* For Expense Field */}
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 500, color: '#4b5563', marginBottom: '4px' }}>
                  Expense For / Description *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Electricity Bill, Shop Rent, Tea & Snacks"
                  value={forExpense}
                  onChange={(e) => setForExpense(e.target.value)}
                  style={{ background: '#ffffff', border: '1px solid #cbd5e1', color: '#0f172a', fontSize: '0.85rem', width: '100%', boxSizing: 'border-box', height: '40px', padding: '8px 12px', borderRadius: '8px' }}
                  required
                />
              </div>

              {/* Amount Field */}
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 500, color: '#4b5563', marginBottom: '4px' }}>
                  Amount (₹) *
                </label>
                <input
                  type="number"
                  placeholder="0.00"
                  step="0.01"
                  min="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  style={{ background: '#ffffff', border: '1px solid #cbd5e1', color: '#0f172a', fontSize: '0.85rem', width: '100%', boxSizing: 'border-box', height: '40px', padding: '8px 12px', borderRadius: '8px' }}
                  required
                />
              </div>

              {/* Date Field */}
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 500, color: '#4b5563', marginBottom: '4px' }}>
                  Date *
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  style={{ background: '#ffffff', border: '1px solid #cbd5e1', color: '#0f172a', fontSize: '0.85rem', width: '100%', boxSizing: 'border-box', height: '40px', padding: '8px 12px', borderRadius: '8px' }}
                  required
                />
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
                  'Save Expense'
                )}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

export default Expenses;
