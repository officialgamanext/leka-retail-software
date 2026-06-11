import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  TrendingUp,
  TrendingDown,
  Receipt,
  AlertTriangle,
  Users,
  Loader2,
  RefreshCw,
  Eye,
  Package,
  CheckCircle,
  Calendar,
  CreditCard,
  Wallet,
  DollarSign,
  Percent,
  ShoppingCart
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL;

function DashboardPage({ token, business }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [invoices, setInvoices] = useState([]);
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [expenses, setExpenses] = useState([]);

  // Selected receipt overlay modal state
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  // Date Filter states
  const [dateFilter, setDateFilter] = useState('today'); // default: today
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  const fetchDashboardData = async () => {
    setLoading(true);
    setError('');
    const headers = {
      Authorization: `Bearer ${token}`,
      'X-Business-Id': business.id
    };

    try {
      const [invRes, prodRes, custRes, expRes] = await Promise.all([
        axios.get(`${API_URL}/invoices`, { headers }),
        axios.get(`${API_URL}/products`, { headers }),
        axios.get(`${API_URL}/customers`, { headers }),
        axios.get(`${API_URL}/expenses`, { headers })
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
      if (expRes.data.success) {
        setExpenses(expRes.data.expenses || []);
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

  // Date range filtering logic
  const getFilteredData = () => {
    const now = new Date();
    let start = new Date(0);
    let end = new Date();

    const startOfDay = (d) => {
      const copy = new Date(d);
      copy.setHours(0, 0, 0, 0);
      return copy;
    };
    const endOfDay = (d) => {
      const copy = new Date(d);
      copy.setHours(23, 59, 59, 999);
      return copy;
    };

    if (dateFilter === 'today') {
      start = startOfDay(now);
      end = endOfDay(now);
    } else if (dateFilter === 'yesterday') {
      const yesterday = new Date(now);
      yesterday.setDate(now.getDate() - 1);
      start = startOfDay(yesterday);
      end = endOfDay(yesterday);
    } else if (dateFilter === 'this-week') {
      const day = now.getDay();
      const diff = now.getDate() - day; // Sunday start of week
      const sunday = new Date(now);
      sunday.setDate(diff);
      start = startOfDay(sunday);
      end = endOfDay(now);
    } else if (dateFilter === 'last-week') {
      const day = now.getDay();
      const diff = now.getDate() - day - 7;
      const lastSunday = new Date(now);
      lastSunday.setDate(diff);
      const lastSaturday = new Date(lastSunday);
      lastSaturday.setDate(lastSunday.getDate() + 6);
      start = startOfDay(lastSunday);
      end = endOfDay(lastSaturday);
    } else if (dateFilter === 'this-month') {
      start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      end = endOfDay(now);
    } else if (dateFilter === 'last-month') {
      start = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
      end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
    } else if (dateFilter === 'this-year') {
      start = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
      end = endOfDay(now);
    } else if (dateFilter === 'custom') {
      start = customStartDate ? startOfDay(new Date(customStartDate)) : new Date(0);
      end = customEndDate ? endOfDay(new Date(customEndDate)) : endOfDay(now);
    }

    const filteredInvoices = invoices.filter(inv => {
      const d = parseInvoiceDate(inv.createdAt);
      return d >= start && d <= end;
    });

    const filteredExpenses = expenses.filter(exp => {
      const d = exp.date ? new Date(exp.date + 'T00:00:00') : parseInvoiceDate(exp.createdAt);
      return d >= start && d <= end;
    });

    return { filteredInvoices, filteredExpenses };
  };

  const { filteredInvoices, filteredExpenses } = getFilteredData();

  // Metrics Calculations
  const totalSales = filteredInvoices.reduce((sum, inv) => sum + Number(inv.grandTotal || 0), 0);
  const gstCollected = filteredInvoices.reduce((sum, inv) => sum + Number(inv.taxAmount || 0), 0);
  const investments = filteredExpenses.reduce((sum, exp) => sum + Number(exp.amount || 0), 0);

  // Profit or Loss
  const profitLossAmount = totalSales - investments;
  const isProfit = profitLossAmount >= 0;
  const profitLossPercent = investments > 0 
    ? (Math.abs(profitLossAmount) / investments) * 100 
    : (totalSales > 0 ? 100 : 0);

  // Payment Breakdown
  const paymentDetails = filteredInvoices.reduce((acc, inv) => {
    const method = (inv.paymentMethod || '').trim().toLowerCase();
    const total = Number(inv.grandTotal || 0);
    if (method === 'cash') acc.cash += total;
    else if (method === 'upi') acc.upi += total;
    else if (method === 'card') acc.card += total;
    else acc.other += total;
    return acc;
  }, { cash: 0, upi: 0, card: 0, other: 0 });

  const totalCollected = paymentDetails.cash + paymentDetails.upi + paymentDetails.card + paymentDetails.other;
  const cashPct = totalCollected > 0 ? (paymentDetails.cash / totalCollected) * 100 : 0;
  const upiPct = totalCollected > 0 ? (paymentDetails.upi / totalCollected) * 100 : 0;
  const cardPct = totalCollected > 0 ? (paymentDetails.card / totalCollected) * 100 : 0;
  const otherPct = totalCollected > 0 ? (paymentDetails.other / totalCollected) * 100 : 0;

  // Recent 25 Invoices
  const recent25Invoices = [...filteredInvoices]
    .sort((a, b) => parseInvoiceDate(b.createdAt) - parseInvoiceDate(a.createdAt))
    .slice(0, 25);

  // Missing values (AOV and top products sold)
  const aov = filteredInvoices.length > 0 ? totalSales / filteredInvoices.length : 0;
  
  const getTopProductsSold = () => {
    const counts = {};
    filteredInvoices.forEach(inv => {
      (inv.items || []).forEach(item => {
        const key = item.productId || item.name;
        if (!counts[key]) {
          counts[key] = { name: item.name, quantity: 0 };
        }
        counts[key].quantity += Number(item.quantity || 0);
      });
    });
    return Object.values(counts)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);
  };
  const topProducts = getTopProductsSold();

  const lowStockItems = products
    .filter(p => Number(p.stock || 0) <= Number(p.bufferStock || 0))
    .sort((a, b) => Number(a.stock || 0) - Number(b.stock || 0));

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '350px', gap: '12px' }}>
        <Loader2 className="animate-spin" size={36} style={{ color: '#2563eb' }} />
        <p style={{ color: '#6b7280', fontSize: '0.85rem' }}>Loading business metrics...</p>
      </div>
    );
  }

  return (
    <div style={{ animation: 'fadeIn 0.25s ease', paddingBottom: '32px' }}>
      
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 600, color: '#0f172a', margin: 0 }}>Business Analytics</h2>
          <p style={{ color: '#6b7280', fontSize: '0.78rem', marginTop: '2px' }}>
            Real-time performance metrics and indicators for <strong>{business.name}</strong>.
          </p>
        </div>
        <button
          className="btn btn-secondary"
          onClick={fetchDashboardData}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', padding: '8px 14px', height: '38px', boxSizing: 'border-box' }}
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

      {/* Date Filter Toolbar */}
      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', marginBottom: '24px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.01)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div className="horizontal-swipe-list" style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {[
              { id: 'today', label: 'Today' },
              { id: 'yesterday', label: 'Yesterday' },
              { id: 'this-week', label: 'This Week' },
              { id: 'last-week', label: 'Last Week' },
              { id: 'this-month', label: 'This Month' },
              { id: 'last-month', label: 'Last Month' },
              { id: 'this-year', label: 'This Year' },
              { id: 'custom', label: 'Custom Range' }
            ].map(pill => (
              <button
                key={pill.id}
                onClick={() => setDateFilter(pill.id)}
                style={{
                  padding: '8px 14px',
                  borderRadius: '8px',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: '1px solid',
                  transition: 'all 0.15s ease',
                  background: dateFilter === pill.id ? '#2563eb' : '#ffffff',
                  color: dateFilter === pill.id ? '#ffffff' : '#475569',
                  borderColor: dateFilter === pill.id ? '#2563eb' : '#cbd5e1'
                }}
              >
                {pill.label}
              </button>
            ))}
          </div>

          {/* Custom Date Pickers */}
          {dateFilter === 'custom' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', animation: 'fadeIn 0.2s ease' }}>
              <div style={{ position: 'relative' }}>
                <span style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 600, display: 'block', marginBottom: '2px' }}>From Date</span>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  style={{
                    padding: '6px 10px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.8rem',
                    color: '#1e293b',
                    background: '#ffffff',
                    height: '32px',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
              <div style={{ position: 'relative' }}>
                <span style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 600, display: 'block', marginBottom: '2px' }}>To Date</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  style={{
                    padding: '6px 10px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.8rem',
                    color: '#1e293b',
                    background: '#ffffff',
                    height: '32px',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Stats Indicator Grid */}
      <div className="db-stats-grid" style={{ marginBottom: '24px' }}>
        {/* Metric 1: Total Sales */}
        <div className="db-stat-card">
          <div className="db-stat-icon-box blue">
            <TrendingUp size={22} />
          </div>
          <div className="db-stat-info">
            <span className="db-stat-label">Total Sales</span>
            <span className="db-stat-value">₹{totalSales.toFixed(2)}</span>
            <span style={{ fontSize: '0.68rem', color: '#94a3b8', marginTop: '2px' }}>
              {filteredInvoices.length} invoices generated
            </span>
          </div>
        </div>

        {/* Metric 2: GST Collected */}
        <div className="db-stat-card">
          <div className="db-stat-icon-box purple">
            <Percent size={20} />
          </div>
          <div className="db-stat-info">
            <span className="db-stat-label">GST Tax Collected</span>
            <span className="db-stat-value">₹{gstCollected.toFixed(2)}</span>
            <span style={{ fontSize: '0.68rem', color: '#94a3b8', marginTop: '2px' }}>
              Tax liability accumulated
            </span>
          </div>
        </div>

        {/* Metric 3: Investments / Expenses */}
        <div className="db-stat-card">
          <div className="db-stat-icon-box orange">
            <Wallet size={20} />
          </div>
          <div className="db-stat-info">
            <span className="db-stat-label">Investments (Expenses)</span>
            <span className="db-stat-value">₹{investments.toFixed(2)}</span>
            <span style={{ fontSize: '0.68rem', color: '#94a3b8', marginTop: '2px' }}>
              Total period business outflow
            </span>
          </div>
        </div>

        {/* Metric 4: Profit & Loss */}
        <div className="db-stat-card" style={{ borderLeft: isProfit ? '4px solid #10b981' : '4px solid #ef4444' }}>
          <div className={`db-stat-icon-box ${isProfit ? 'green' : 'red'}`}>
            {isProfit ? <TrendingUp size={22} /> : <TrendingDown size={22} />}
          </div>
          <div className="db-stat-info">
            <span className="db-stat-label">{isProfit ? 'Net Profit' : 'Net Loss'}</span>
            <span className="db-stat-value" style={{ color: isProfit ? '#059669' : '#ef4444' }}>
              ₹{Math.abs(profitLossAmount).toFixed(2)}
            </span>
            <span style={{ 
              fontSize: '0.75rem', 
              fontWeight: 700, 
              color: isProfit ? '#059669' : '#ef4444', 
              background: isProfit ? '#ecfdf5' : '#fef2f2',
              padding: '2px 6px',
              borderRadius: '4px',
              marginTop: '4px',
              alignSelf: 'flex-start',
              display: 'inline-block'
            }}>
              {isProfit ? '+' : '-'}{profitLossPercent.toFixed(1)}% ROI
            </span>
          </div>
        </div>
      </div>

      {/* Payment Modes & Secondary Metrics Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px', marginBottom: '24px' }} className="responsive-row">
        {/* Payment Modes Card */}
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '20px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.01)' }}>
          <h3 style={{ fontSize: '0.88rem', fontWeight: 700, color: '#0f172a', margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <CreditCard size={16} style={{ color: '#2563eb' }} /> Payment Collections Breakdown
          </h3>
          
          {/* Segmented Progress Bar */}
          {totalCollected === 0 ? (
            <div style={{ textAlign: 'center', padding: '20px 0', color: '#6b7280', fontSize: '0.82rem' }}>
              No payments collected during this period.
            </div>
          ) : (
            <div>
              <div style={{ display: 'flex', height: '10px', borderRadius: '5px', overflow: 'hidden', background: '#f1f5f9', marginBottom: '20px' }}>
                <div style={{ width: `${cashPct}%`, background: '#3b82f6' }} title={`Cash: ${cashPct.toFixed(1)}%`}></div>
                <div style={{ width: `${upiPct}%`, background: '#10b981' }} title={`UPI: ${upiPct.toFixed(1)}%`}></div>
                <div style={{ width: `${cardPct}%`, background: '#f59e0b' }} title={`Card: ${cardPct.toFixed(1)}%`}></div>
                <div style={{ width: `${otherPct}%`, background: '#94a3b8' }} title={`Other: ${otherPct.toFixed(1)}%`}></div>
              </div>

              {/* Legend Grid */}
              <div className="payment-legend-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
                {[
                  { label: 'Cash', value: paymentDetails.cash, pct: cashPct, color: '#3b82f6' },
                  { label: 'UPI / Digital', value: paymentDetails.upi, pct: upiPct, color: '#10b981' },
                  { label: 'Card Swipe', value: paymentDetails.card, pct: cardPct, color: '#f59e0b' },
                  { label: 'Other Methods', value: paymentDetails.other, pct: otherPct, color: '#94a3b8' }
                ].map((pMode, idx) => (
                  <div key={idx} style={{ borderLeft: `3px solid ${pMode.color}`, paddingLeft: '10px' }}>
                    <span style={{ fontSize: '0.72rem', color: '#64748b', display: 'block', fontWeight: 500 }}>{pMode.label}</span>
                    <strong style={{ fontSize: '0.9rem', color: '#1f2937', display: 'block', marginTop: '2px' }}>₹{pMode.value.toFixed(2)}</strong>
                    <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>{pMode.pct.toFixed(1)}% share</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Secondary Metrics Card */}
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '20px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.01)', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div>
            <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>AVERAGE ORDER VALUE (AOV)</span>
            <h3 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0f172a', margin: '4px 0 2px 0' }}>₹{aov.toFixed(2)}</h3>
            <p style={{ fontSize: '0.68rem', color: '#94a3b8', margin: 0 }}>Average sales billing ticket size</p>
          </div>
          <div style={{ borderTop: '1px dashed #e2e8f0', marginTop: '16px', paddingTop: '16px' }}>
            <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>REGISTERED CUSTOMERS</span>
            <h3 style={{ fontSize: '1.3rem', fontWeight: 700, color: '#0f172a', margin: '4px 0 2px 0' }}>{customers.length}</h3>
            <p style={{ fontSize: '0.68rem', color: '#94a3b8', margin: 0 }}>Total client base directory</p>
          </div>
        </div>
      </div>

      {/* Main Layout panels: Invoices + Side Analytics */}
      <div className="db-main-layout">
        {/* Left Panel: Recent 25 Sales Transactions */}
        <div className="db-panel" style={{ flex: 2 }}>
          <div className="db-panel-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Receipt size={18} style={{ color: '#2563eb' }} />
              <span>Recent Sales Transactions (Up to 25 Bills)</span>
            </div>
            <span style={{ fontSize: '0.72rem', background: '#eff6ff', color: '#2563eb', fontWeight: 600, padding: '2px 8px', borderRadius: '4px' }}>
              Showing {recent25Invoices.length} entries
            </span>
          </div>

          {recent25Invoices.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: '#6b7280', fontSize: '0.85rem' }}>
              <Package size={36} style={{ color: '#9ca3af', marginBottom: '8px' }} />
              <p style={{ fontWeight: 600, color: '#374151' }}>No transactions recorded</p>
              <p style={{ fontSize: '0.78rem', color: '#9ca3af', marginTop: '4px' }}>Try switching date filters or run invoices in POS billing.</p>
            </div>
          ) : (
            /* Scrollable wrapper to prevent page stretching */
            <div style={{ maxHeight: '480px', overflowY: 'auto', border: '1px solid #f1f5f9', borderRadius: '10px' }}>
              <div className="data-table-container" style={{ margin: 0, border: 'none', boxShadow: 'none' }}>
                <table className="data-table" style={{ fontSize: '0.8rem' }}>
                  <thead>
                    <tr style={{ position: 'sticky', top: 0, background: '#f8fafc', zIndex: 10 }}>
                      <th style={{ padding: '10px 14px' }}>Bill Number</th>
                      <th style={{ padding: '10px 14px' }}>Date / Time</th>
                      <th style={{ padding: '10px 14px' }}>Customer</th>
                      <th style={{ padding: '10px 14px' }}>Method</th>
                      <th style={{ padding: '10px 14px', textAlign: 'right' }}>Total (₹)</th>
                      <th style={{ padding: '10px 14px', textAlign: 'right' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recent25Invoices.map(inv => {
                      const dateVal = parseInvoiceDate(inv.createdAt);
                      return (
                        <tr key={inv.id} className="table-row-hover">
                          <td style={{ fontWeight: 600, color: '#2563eb', fontFamily: 'monospace' }}>{inv.invoiceNumber}</td>
                          <td>{dateVal.toLocaleString()}</td>
                          <td style={{ fontWeight: 600, color: '#374151' }}>{inv.customerName || 'Walk-in Customer'}</td>
                          <td>
                            <span style={{ fontSize: '0.7rem', padding: '2px 6px', borderRadius: '4px', background: '#f8fafc', border: '1px solid #e2e8f0', color: '#475569', fontWeight: 600 }}>
                              {inv.paymentMethod}
                            </span>
                          </td>
                          <td style={{ fontWeight: 700, textAlign: 'right', color: '#0f172a' }}>₹{Number(inv.grandTotal).toFixed(2)}</td>
                          <td style={{ textAlign: 'right' }}>
                            <button
                              className="btn btn-secondary"
                              style={{ padding: '4px 8px', fontSize: '0.72rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
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
            </div>
          )}
        </div>

        {/* Right Panel: Top Products + Low Stock */}
        <div className="db-panel" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '20px', background: 'transparent', border: 'none', boxShadow: 'none', padding: 0 }}>
          
          {/* Top Selling Products Card */}
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '20px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.01)' }}>
            <div className="db-panel-title" style={{ padding: 0, marginBottom: '14px', border: 'none', fontSize: '0.85rem' }}>
              <ShoppingCart size={16} style={{ color: '#059669' }} />
              <span>Top Selling Products</span>
            </div>
            
            {topProducts.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '20px 0', color: '#9ca3af', fontSize: '0.78rem' }}>
                No items sold yet.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {topProducts.map((prod, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#ecfdf5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.72rem' }}>
                        {idx + 1}
                      </span>
                      <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#1f2937' }}>{prod.name}</span>
                    </div>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#059669', background: '#e6fcf5', padding: '2px 8px', borderRadius: '4px' }}>
                      {prod.quantity} sold
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Low Stock Warnings Card */}
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '20px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.01)' }}>
            <div className="db-panel-title" style={{ padding: 0, marginBottom: '14px', border: 'none', fontSize: '0.85rem' }}>
              <AlertTriangle size={16} style={{ color: '#ef4444' }} />
              <span>Low Stock Alerts</span>
            </div>

            {lowStockItems.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px 0', textAlign: 'center', gap: '6px' }}>
                <CheckCircle size={28} style={{ color: '#16a34a' }} />
                <p style={{ color: '#16a34a', fontWeight: 600, fontSize: '0.8rem', margin: 0 }}>Healthy Stock Levels</p>
                <p style={{ color: '#9ca3af', fontSize: '0.68rem', margin: 0 }}>All inventory items are in healthy levels.</p>
              </div>
            ) : (
              <div style={{ maxHeight: '280px', overflowY: 'auto', paddingRight: '4px' }}>
                <div className="db-warning-list" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {lowStockItems.map(item => {
                    const stockNum = Number(item.stock || 0);
                    const isZero = stockNum === 0;
                    return (
                      <div key={item.id} className="db-warning-item" style={{ padding: '8px 12px', border: '1px solid #fee2e2', borderRadius: '10px', background: isZero ? '#fff5f5' : '#fff9f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <h4 style={{ fontSize: '0.8rem', fontWeight: 600, color: '#1f2937', margin: 0 }}>{item.name}</h4>
                          <span style={{ fontSize: '0.68rem', color: '#9ca3af', textTransform: 'uppercase', fontFamily: 'monospace' }}>
                            Code: {item.shortCode || 'N/A'}
                          </span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
                          <span className={isZero ? 'db-warning-badge' : 'db-warning-badge-orange'} style={{ fontSize: '0.62rem', padding: '2px 4px' }}>
                            {isZero ? 'OUT OF STOCK' : `LOW STOCK`}
                          </span>
                          <span style={{ fontSize: '0.68rem', color: '#4b5563' }}>
                            Stock: <strong style={{ color: isZero ? '#ef4444' : '#ea580c' }}>{stockNum}</strong> / Buf: {item.bufferStock || 0}
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
      </div>

      {/* Selected Bill Receipt Modal Overlay */}
      {selectedInvoice && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '380px', background: '#f8fafc', color: '#1e293b', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="modal-header" style={{ borderBottom: '1px solid rgba(0,0,0,0.08)', paddingBottom: '12px' }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#0f172a', fontSize: '1rem' }}>
                <Receipt size={20} style={{ color: '#2563eb' }} /> Sales Receipt
              </h3>
              <button className="modal-close" style={{ color: '#64748b', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.1rem' }} onClick={() => setSelectedInvoice(null)}>
                ✕
              </button>
            </div>

            <div className="receipt-wrapper" style={{ padding: '12px 0' }}>
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
                style={{ background: '#e2e8f0', color: '#1e293b', border: 'none', padding: '8px 14px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}
                onClick={() => window.print()}
              >
                Print Receipt
              </button>
              <button 
                type="button" 
                className="btn btn-primary" 
                style={{ background: '#2563eb', color: '#ffffff', border: 'none', padding: '8px 14px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}
                onClick={() => setSelectedInvoice(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Scoped responsive rules */}
      <style>{`
        .table-row-hover:hover {
          background-color: #f8fafc;
        }
        @media (max-width: 768px) {
          .responsive-row {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}

export default DashboardPage;
