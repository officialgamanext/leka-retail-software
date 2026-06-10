import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  TrendingUp,
  Receipt,
  AlertTriangle,
  Users,
  Loader2,
  RefreshCw,
  Eye,
  Package,
  CheckCircle,
  TrendingDown
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL;

function DashboardPage({ token, business }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [invoices, setInvoices] = useState([]);
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);

  // Selected receipt overlay modal state
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  const fetchDashboardData = async () => {
    setLoading(true);
    setError('');
    const headers = {
      Authorization: `Bearer ${token}`,
      'X-Business-Id': business.id
    };

    try {
      const [invRes, prodRes, custRes] = await Promise.all([
        axios.get(`${API_URL}/invoices`, { headers }),
        axios.get(`${API_URL}/products`, { headers }),
        axios.get(`${API_URL}/customers`, { headers })
      ]);

      if (invRes.data.success) {
        setInvoices(invRes.data.invoices || []);
      }
      if (prodRes.data.success) {
        setProducts(prodRes.data.products || []);
      }
      if (custRes.data.success) {
        setCustomers(custRes.data.customers || []);
      }
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
      setError('Failed to retrieve dashboard data. Please try refreshing.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [business.id]);

  const parseInvoiceDate = (createdAt) => {
    if (!createdAt) return new Date(0);
    if (typeof createdAt === 'object' && createdAt._seconds !== undefined) {
      return new Date(createdAt._seconds * 1000);
    }
    return new Date(createdAt);
  };

  // Date constants
  const todayStr = new Date().toDateString();

  // Metrics Calculations
  const todayInvoices = invoices.filter(inv => {
    const invDate = parseInvoiceDate(inv.createdAt);
    return invDate.toDateString() === todayStr;
  });

  const todayRevenue = todayInvoices.reduce((sum, inv) => sum + Number(inv.grandTotal || 0), 0);
  const todayInvoicesCount = todayInvoices.length;

  const lowStockItems = products
    .filter(p => Number(p.stock || 0) <= Number(p.bufferStock || 0))
    .sort((a, b) => Number(a.stock || 0) - Number(b.stock || 0));

  const totalCustomersCount = customers.length;

  // Recent 5 Invoices
  const recentInvoices = [...invoices]
    .sort((a, b) => parseInvoiceDate(b.createdAt) - parseInvoiceDate(a.createdAt))
    .slice(0, 5);

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '300px', gap: '12px' }}>
        <Loader2 className="animate-spin" size={36} style={{ color: '#2563eb' }} />
        <p style={{ color: '#6b7280', fontSize: '0.85rem' }}>Loading business metrics...</p>
      </div>
    );
  }

  return (
    <div style={{ animation: 'fadeIn 0.25s ease' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 600, color: '#0f172a' }}>Business Analytics</h2>
          <p style={{ color: '#6b7280', fontSize: '0.85rem', marginTop: '4px' }}>
            Real-time performance metrics and indicators for <strong>{business.name}</strong>.
          </p>
        </div>
        <button
          className="btn btn-secondary"
          onClick={fetchDashboardData}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', padding: '8px 12px' }}
        >
          <RefreshCw size={12} /> Refresh
        </button>
      </div>

      {error && (
        <div className="alert-banner error mb-4" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px', background: '#fef2f2', border: '1px solid #fee2e2', borderRadius: '8px', color: '#ef4444', marginBottom: '20px' }}>
          <AlertTriangle size={18} />
          <span style={{ fontSize: '0.85rem' }}>{error}</span>
        </div>
      )}

      {/* Stats Indicator Grid */}
      <div className="db-stats-grid">
        {/* Metric 1: Today's Revenue */}
        <div className="db-stat-card">
          <div className="db-stat-icon-box blue">
            <TrendingUp size={22} />
          </div>
          <div className="db-stat-info">
            <span className="db-stat-label">Today's Revenue</span>
            <span className="db-stat-value">₹{todayRevenue.toFixed(2)}</span>
          </div>
        </div>

        {/* Metric 2: Today's Invoices */}
        <div className="db-stat-card">
          <div className="db-stat-icon-box green">
            <Receipt size={22} />
          </div>
          <div className="db-stat-info">
            <span className="db-stat-label">Today's Bills</span>
            <span className="db-stat-value">{todayInvoicesCount} invoices</span>
          </div>
        </div>

        {/* Metric 3: Low Stock Alerts */}
        <div className="db-stat-card">
          <div className={`db-stat-icon-box ${lowStockItems.length > 0 ? 'red' : 'green'}`}>
            <AlertTriangle size={22} />
          </div>
          <div className="db-stat-info">
            <span className="db-stat-label">Stock Alerts</span>
            <span className="db-stat-value">{lowStockItems.length} items low</span>
          </div>
        </div>

        {/* Metric 4: Total Customers */}
        <div className="db-stat-card">
          <div className="db-stat-icon-box purple">
            <Users size={22} />
          </div>
          <div className="db-stat-info">
            <span className="db-stat-label">Total Customers</span>
            <span className="db-stat-value">{totalCustomersCount} registered</span>
          </div>
        </div>
      </div>

      {/* Two-Column Grid: Recent Invoices + Low Stock Warnings */}
      <div className="db-main-layout">
        {/* Left Side: Recent Sales Activity */}
        <div className="db-panel">
          <div className="db-panel-title">
            <Receipt size={18} style={{ color: '#2563eb' }} />
            Recent Sales Transactions
          </div>
          {recentInvoices.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: '#6b7280', fontSize: '0.85rem' }}>
              <Package size={32} style={{ color: '#9ca3af', marginBottom: '8px' }} />
              <p>No transactions recorded yet.</p>
            </div>
          ) : (
            <div className="data-table-container" style={{ margin: 0, border: 'none', boxShadow: 'none' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Bill Number</th>
                    <th>Date / Time</th>
                    <th>Customer</th>
                    <th>Method</th>
                    <th style={{ textAlign: 'right' }}>Total (₹)</th>
                    <th style={{ textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {recentInvoices.map(inv => {
                    const dateVal = parseInvoiceDate(inv.createdAt);
                    return (
                      <tr key={inv.id}>
                        <td style={{ fontWeight: 600, color: '#2563eb' }}>{inv.invoiceNumber}</td>
                        <td style={{ fontSize: '0.8rem' }}>{dateVal.toLocaleString()}</td>
                        <td>{inv.customerName || 'Walk-in Customer'}</td>
                        <td>
                          <span style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: '4px', background: '#f3f4f6', border: '1px solid #e5e7eb', color: '#374151' }}>
                            {inv.paymentMethod}
                          </span>
                        </td>
                        <td style={{ fontWeight: 600, textAlign: 'right' }}>₹{Number(inv.grandTotal).toFixed(2)}</td>
                        <td style={{ textAlign: 'right' }}>
                          <button
                            className="btn btn-secondary"
                            style={{ padding: '4px 8px', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                            onClick={() => setSelectedInvoice(inv)}
                          >
                            <Eye size={12} /> View
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right Side: Low Stock Warnings */}
        <div className="db-panel">
          <div className="db-panel-title">
            <AlertTriangle size={18} style={{ color: '#ef4444' }} />
            Low Stock Alerts
          </div>

          {lowStockItems.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '36px 16px', textAlign: 'center', gap: '8px' }}>
              <CheckCircle size={32} style={{ color: '#16a34a' }} />
              <p style={{ color: '#16a34a', fontWeight: 600, fontSize: '0.85rem' }}>Healthy Inventory Levels</p>
              <p style={{ color: '#6b7280', fontSize: '0.75rem' }}>All items are currently at or above healthy stock levels.</p>
            </div>
          ) : (
            <div style={{ maxHeight: '380px', overflowY: 'auto', paddingRight: '4px' }}>
              <div className="db-warning-list">
                {lowStockItems.map(item => {
                  const stockNum = Number(item.stock || 0);
                  const isZero = stockNum === 0;
                  return (
                    <div key={item.id} className="db-warning-item">
                      <div>
                        <h4 style={{ fontSize: '0.85rem', fontWeight: 600, color: '#1f2937' }}>{item.name}</h4>
                        <span style={{ fontSize: '0.7rem', color: '#9ca3af', textTransform: 'uppercase', fontWeight: 500 }}>
                          Code: {item.shortCode || 'N/A'}
                        </span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                        <span className={isZero ? 'db-warning-badge' : 'db-warning-badge-orange'}>
                          {isZero ? 'OUT OF STOCK' : `LOW STOCK`}
                        </span>
                        <span style={{ fontSize: '0.72rem', color: '#4b5563', fontWeight: 500 }}>
                          Stock: <strong style={{ color: isZero ? '#ef4444' : '#ea580c' }}>{stockNum}</strong> / Buffer: {item.bufferStock || 0}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Selected Bill Receipt Modal Overlay */}
      {selectedInvoice && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '380px', background: '#f8fafc', color: '#1e293b' }}>
            <div className="modal-header" style={{ borderBottom: '1px solid rgba(0,0,0,0.08)', paddingBottom: '12px' }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#0f172a' }}>
                <Receipt size={20} style={{ color: '#2563eb' }} /> Sales Receipt
              </h3>
              <button className="modal-close" style={{ color: '#64748b' }} onClick={() => setSelectedInvoice(null)}>
                ✕
              </button>
            </div>

            <div className="receipt-wrapper">
              <div className="receipt-header" style={{ textAlign: 'center', marginBottom: '16px' }}>
                <h2 style={{ fontSize: '1.2rem', fontWeight: 600, margin: 0 }}>{business.name}</h2>
                <p style={{ fontSize: '0.75rem', color: '#475569', margin: '4px 0 0 0' }}>{business.address}</p>
              </div>

              <div className="receipt-row" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '4px' }}>
                <span>Bill No: {selectedInvoice.invoiceNumber}</span>
                <span>Date: {parseInvoiceDate(selectedInvoice.createdAt).toLocaleDateString()}</span>
              </div>
              <div className="receipt-row" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '12px' }}>
                <span>Customer: {selectedInvoice.customerName}</span>
                <span>{selectedInvoice.customerPhone && `Mob: ${selectedInvoice.customerPhone}`}</span>
              </div>

              <div className="receipt-divider" style={{ borderTop: '1px dashed #e2e8f0', margin: '8px 0' }}></div>

              <div className="receipt-items">
                {selectedInvoice.items?.map((item, idx) => (
                  <div key={idx} style={{ marginBottom: '6px' }}>
                    <div className="receipt-row" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 'bold' }}>
                      <span>{item.name}</span>
                      <span>₹{(item.total || 0).toFixed(2)}</span>
                    </div>
                    <div className="receipt-row" style={{ display: 'flex', justifyContent: 'space-between', color: '#475569', fontSize: '0.7rem' }}>
                      <span>₹{(item.price || 0).toFixed(2)} x {item.quantity} units</span>
                      <span>GST: {item.gstRate}%</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="receipt-divider" style={{ borderTop: '1px dashed #e2e8f0', margin: '8px 0' }}></div>

              <div className="receipt-row" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '4px' }}>
                <span>Subtotal:</span>
                <span>₹{(selectedInvoice.subtotal || 0).toFixed(2)}</span>
              </div>
              <div className="receipt-row" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '4px' }}>
                <span>Tax (GST):</span>
                <span>₹{(selectedInvoice.taxAmount || 0).toFixed(2)}</span>
              </div>
              {selectedInvoice.discount > 0 && (
                <div className="receipt-row" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '4px', color: 'red' }}>
                  <span>Discount:</span>
                  <span>-₹{(selectedInvoice.discount || 0).toFixed(2)}</span>
                </div>
              )}
              
              <div className="receipt-divider" style={{ borderTop: '1px dashed #e2e8f0', margin: '8px 0' }}></div>

              <div className="receipt-row" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1rem', fontWeight: 'bold' }}>
                <span>GRAND TOTAL:</span>
                <span>₹{(selectedInvoice.grandTotal || 0).toFixed(2)}</span>
              </div>

              <div className="receipt-divider" style={{ borderTop: '1px dashed #e2e8f0', margin: '8px 0' }}></div>
              <div className="receipt-row" style={{ display: 'flex', justifyContent: 'center', fontSize: '0.75rem', color: '#475569', fontWeight: 600 }}>
                Paid via: {selectedInvoice.paymentMethod}
              </div>
              <div className="receipt-divider" style={{ borderTop: '1px dashed #e2e8f0', margin: '8px 0' }}></div>
              <p style={{ textAlign: 'center', fontSize: '0.7rem', margin: '4px 0 0 0', fontStyle: 'italic', color: '#64748b' }}>
                Powered by LEKA RETAIL.
              </p>
            </div>

            <div className="modal-footer" style={{ marginTop: '20px', borderTop: '1px solid rgba(0,0,0,0.08)', paddingTop: '12px', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button 
                type="button" 
                className="btn btn-secondary" 
                style={{ background: '#e2e8f0', color: '#1e293b', border: 'none', padding: '6px 12px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}
                onClick={() => window.print()}
              >
                Print Receipt
              </button>
              <button 
                type="button" 
                className="btn btn-primary" 
                style={{ background: '#2563eb', color: '#ffffff', border: 'none', padding: '6px 12px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}
                onClick={() => setSelectedInvoice(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default DashboardPage;
