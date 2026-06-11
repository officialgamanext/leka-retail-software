import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Package, AlertTriangle, Layers, Clock, CheckCircle, 
  Search, RefreshCw, X, ArrowDown, ArrowUp, Info, 
  HelpCircle, Eye, FileText, TrendingDown, ClipboardList
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL;

function StockAnalysis({ token, business }) {
  const [products, setProducts] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Filtering & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');

  // Modal Details State
  const [modalGroup, setModalGroup] = useState(null); // 'crossed' | 'in_buffer' | 'closer' | 'good' | null
  const [modalSearch, setModalSearch] = useState('');

  // Selected Invoice reference overlay modal (to view open invoices)
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  useEffect(() => {
    fetchData();
  }, [business.id]);

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const headers = {
        Authorization: `Bearer ${token}`,
        'X-Business-Id': business.id
      };

      const [prodRes, invRes, catRes] = await Promise.all([
        axios.get(`${API_URL}/products`, { headers }),
        axios.get(`${API_URL}/invoices`, { headers }),
        axios.get(`${API_URL}/categories`, { headers }).catch(() => ({ data: { success: true, categories: [] } }))
      ]);

      if (prodRes.data.success) {
        setProducts(prodRes.data.products || []);
      }
      if (invRes.data.success) {
        setInvoices(invRes.data.invoices || []);
      }
      if (catRes.data.success) {
        setCategories(catRes.data.categories || []);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to retrieve stock and invoice records.');
    } finally {
      setLoading(false);
    }
  };

  // Extract open/pending invoices
  const openInvoices = invoices.filter(inv => inv.status === 'Open');

  // Process and extend products with pending/projected stock calculations
  const processedProducts = products.map(prod => {
    const s = Number(prod.stock || 0);
    const b = Number(prod.bufferStock || 0);

    // Sum quantities of this product across all 'Open' (unsettled) invoices
    let pending = 0;
    openInvoices.forEach(inv => {
      const matched = inv.items?.find(item => item.productId === prod.id);
      if (matched) {
        pending += Number(matched.quantity || 0);
      }
    });

    const projected = s - pending;
    
    // Status classification
    let status = 'good';
    let statusLabel = 'Good Stock';
    if (s < b) {
      status = 'crossed';
      statusLabel = 'Below Buffer';
    } else if (s === b) {
      status = 'in_buffer';
      statusLabel = 'In Buffer Stock';
    } else if (s > b && s <= b + 5) {
      status = 'closer';
      statusLabel = 'Near Buffer';
    }

    return {
      ...prod,
      currentStock: s,
      bufferStockVal: b,
      pendingStock: pending,
      projectedStock: projected,
      status,
      statusLabel
    };
  });

  // Categorize products for top tiles
  const crossedItems = processedProducts.filter(p => p.status === 'crossed');
  const inBufferItems = processedProducts.filter(p => p.status === 'in_buffer');
  const closerItems = processedProducts.filter(p => p.status === 'closer');
  const goodItems = processedProducts.filter(p => p.status === 'good');

  // Filtered list for the main inventory table
  const filteredProducts = processedProducts.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (p.shortCode && p.shortCode.toLowerCase().includes(searchQuery.toLowerCase())) ||
                          (p.barcode && p.barcode.includes(searchQuery));
    const matchesCategory = selectedCategory === '' || p.categoryId === selectedCategory;
    const matchesStatus = selectedStatus === 'all' || p.status === selectedStatus;
    
    return matchesSearch && matchesCategory && matchesStatus;
  });

  // Get active modal items based on clicked card group
  const getModalGroupData = () => {
    switch (modalGroup) {
      case 'crossed': return { title: 'Below Buffer (Crossed)', items: crossedItems, color: '#ef4444' };
      case 'in_buffer': return { title: 'In Buffer Stock', items: inBufferItems, color: '#f59e0b' };
      case 'closer': return { title: 'Near Buffer Stock (Closer)', items: closerItems, color: '#eab308' };
      case 'good': return { title: 'Good Stock', items: goodItems, color: '#10b981' };
      default: return null;
    }
  };

  const activeGroup = getModalGroupData();
  const filteredModalItems = activeGroup 
    ? activeGroup.items.filter(item => 
        item.name.toLowerCase().includes(modalSearch.toLowerCase()) ||
        (item.shortCode && item.shortCode.toLowerCase().includes(modalSearch.toLowerCase()))
      )
    : [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Upper header action row */}
      <div className="page-header-container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>Stock Analysis</h2>
          <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '2px' }}>
            Real-time buffer stock checks, draft order commitments, and projected availability metrics.
          </p>
        </div>
        <button
          type="button"
          onClick={fetchData}
          disabled={loading}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '8px 16px', background: '#ffffff', border: '1px solid #e2e8f0',
            borderRadius: '8px', fontSize: '0.85rem', fontWeight: 600, color: '#334155',
            cursor: 'pointer', boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
            transition: 'all 0.15s ease'
          }}
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Refresh Data
        </button>
      </div>

      {error && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#fef2f2', border: '1px solid #fee2e2', borderRadius: '8px', padding: '14px', color: '#ef4444', fontSize: '0.88rem' }}>
          <AlertTriangle size={18} />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '300px', gap: '12px' }}>
          <RefreshCw size={36} className="animate-spin" style={{ color: '#2563eb' }} />
          <span style={{ fontSize: '0.9rem', color: '#64748b' }}>Calculating inventory levels...</span>
        </div>
      ) : (
        <>
          {/* Summary Metric Tiles (Interactive) */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
            
            {/* Tile 1: Crossed Buffer Stock */}
            <div 
              onClick={() => { setModalGroup('crossed'); setModalSearch(''); }}
              style={{
                background: 'rgba(239, 68, 68, 0.05)',
                border: '1px solid rgba(239, 68, 68, 0.2)',
                borderRadius: '12px', padding: '20px', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                transition: 'transform 0.2s ease, box-shadow 0.2s ease',
              }}
              className="hover-scale-card"
            >
              <div>
                <span style={{ fontSize: '0.78rem', color: '#ef4444', fontWeight: 600, textTransform: 'uppercase', tracking: '0.05em' }}>Below Buffer</span>
                <h3 style={{ fontSize: '1.8rem', fontWeight: 700, color: '#b91c1c', margin: '4px 0 0 0' }}>{crossedItems.length}</h3>
                <span style={{ fontSize: '0.7rem', color: '#7f1d1d', marginTop: '2px', display: 'block' }}>Critically low stock levels</span>
              </div>
              <div style={{ background: '#fecaca', color: '#ef4444', padding: '10px', borderRadius: '10px' }}>
                <AlertTriangle size={24} />
              </div>
            </div>

            {/* Tile 2: In Buffer Stock */}
            <div 
              onClick={() => { setModalGroup('in_buffer'); setModalSearch(''); }}
              style={{
                background: 'rgba(245, 158, 11, 0.05)',
                border: '1px solid rgba(245, 158, 11, 0.2)',
                borderRadius: '12px', padding: '20px', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                transition: 'transform 0.2s ease, box-shadow 0.2s ease',
              }}
              className="hover-scale-card"
            >
              <div>
                <span style={{ fontSize: '0.78rem', color: '#d97706', fontWeight: 600, textTransform: 'uppercase', tracking: '0.05em' }}>In Buffer Stock</span>
                <h3 style={{ fontSize: '1.8rem', fontWeight: 700, color: '#b45309', margin: '4px 0 0 0' }}>{inBufferItems.length}</h3>
                <span style={{ fontSize: '0.7rem', color: '#78350f', marginTop: '2px', display: 'block' }}>Exactly at the buffer limit</span>
              </div>
              <div style={{ background: '#fef3c7', color: '#d97706', padding: '10px', borderRadius: '10px' }}>
                <Layers size={24} />
              </div>
            </div>

            {/* Tile 3: Closer to Buffer Stock */}
            <div 
              onClick={() => { setModalGroup('closer'); setModalSearch(''); }}
              style={{
                background: 'rgba(234, 179, 8, 0.05)',
                border: '1px solid rgba(234, 179, 8, 0.2)',
                borderRadius: '12px', padding: '20px', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                transition: 'transform 0.2s ease, box-shadow 0.2s ease',
              }}
              className="hover-scale-card"
            >
              <div>
                <span style={{ fontSize: '0.78rem', color: '#ca8a04', fontWeight: 600, textTransform: 'uppercase', tracking: '0.05em' }}>Near Buffer</span>
                <h3 style={{ fontSize: '1.8rem', fontWeight: 700, color: '#854d0e', margin: '4px 0 0 0' }}>{closerItems.length}</h3>
                <span style={{ fontSize: '0.7rem', color: '#713f12', marginTop: '2px', display: 'block' }}>Within +5 units of buffer</span>
              </div>
              <div style={{ background: '#fef9c3', color: '#ca8a04', padding: '10px', borderRadius: '10px' }}>
                <Clock size={24} />
              </div>
            </div>

            {/* Tile 4: Good Stock */}
            <div 
              onClick={() => { setModalGroup('good'); setModalSearch(''); }}
              style={{
                background: 'rgba(16, 185, 129, 0.05)',
                border: '1px solid rgba(16, 185, 129, 0.2)',
                borderRadius: '12px', padding: '20px', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                transition: 'transform 0.2s ease, box-shadow 0.2s ease',
              }}
              className="hover-scale-card"
            >
              <div>
                <span style={{ fontSize: '0.78rem', color: '#059669', fontWeight: 600, textTransform: 'uppercase', tracking: '0.05em' }}>Good Stock</span>
                <h3 style={{ fontSize: '1.8rem', fontWeight: 700, color: '#047857', margin: '4px 0 0 0' }}>{goodItems.length}</h3>
                <span style={{ fontSize: '0.7rem', color: '#064e3b', marginTop: '2px', display: 'block' }}>Healthy stock quantities</span>
              </div>
              <div style={{ background: '#d1fae5', color: '#059669', padding: '10px', borderRadius: '10px' }}>
                <CheckCircle size={24} />
              </div>
            </div>

          </div>

          {/* Main Item-Wise Analysis Table Card */}
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '24px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '16px', marginBottom: '20px', flexWrap: 'wrap', gap: '16px' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#1e293b', margin: 0 }}>Item-Wise Inventory Analysis</h3>
              
              {/* Draft orders information helper banner */}
              {openInvoices.length > 0 && (
                <div style={{ fontSize: '0.78rem', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px', padding: '6px 12px', color: '#1d4ed8', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Info size={13} />
                  <span>We have <strong>{openInvoices.length} Open Bills</strong> holding pending inventory stock.</span>
                </div>
              )}
            </div>

            {/* Filters Row */}
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '20px' }}>
              
              {/* Product Search */}
              <div style={{ position: 'relative', flexGrow: 1, minWidth: '240px' }}>
                <Search size={16} style={{ position: 'absolute', left: '12px', top: '11px', color: '#94a3b8' }} />
                <input
                  type="text"
                  placeholder="Search item by name, short code or barcode..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    padding: '8px 12px 8px 36px',
                    fontSize: '0.85rem',
                    background: '#f8fafc',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    width: '100%',
                    color: '#0f172a'
                  }}
                />
              </div>

              {/* Category Dropdown */}
              <div style={{ minWidth: '160px' }}>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  style={{
                    padding: '8px 12px',
                    fontSize: '0.85rem',
                    background: '#f8fafc',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    width: '100%',
                    color: '#0f172a',
                    cursor: 'pointer'
                  }}
                >
                  <option value="">All Categories</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>

              {/* Status Filter Dropdown */}
              <div style={{ minWidth: '180px' }}>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  style={{
                    padding: '8px 12px',
                    fontSize: '0.85rem',
                    background: '#f8fafc',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    width: '100%',
                    color: '#0f172a',
                    cursor: 'pointer'
                  }}
                >
                  <option value="all">All Stock Statuses</option>
                  <option value="crossed">Below Buffer (Crossed)</option>
                  <option value="in_buffer">In Buffer Stock</option>
                  <option value="closer">Near Buffer</option>
                  <option value="good">Good Stock</option>
                </select>
              </div>

            </div>

            {/* Inventory table */}
            <div className="data-table-container" style={{ overflowX: 'auto', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                    <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569' }}>Item Detail</th>
                    <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569' }}>Category</th>
                    <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569', textAlign: 'right' }}>Current Stock</th>
                    <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569', textAlign: 'right' }}>Buffer Stock</th>
                    <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569', textAlign: 'right' }}>Pending Stock</th>
                    <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569', textAlign: 'right' }}>Projected Stock</th>
                    <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569', textAlign: 'center' }}>Stock Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.length === 0 ? (
                    <tr>
                      <td colSpan="7" style={{ padding: '48px 16px', textAlign: 'center', color: '#64748b' }}>
                        <Package size={36} style={{ color: '#cbd5e1', marginBottom: '8px' }} />
                        <p style={{ fontWeight: 500, margin: 0 }}>No items match your active search filter.</p>
                      </td>
                    </tr>
                  ) : (
                    filteredProducts.map(prod => {
                      const hasPending = prod.pendingStock > 0;
                      const isProjectedBelowBuffer = prod.projectedStock < prod.bufferStockVal;

                      return (
                        <tr key={prod.id} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.15s ease' }} className="table-row-hover">
                          
                          {/* Item Detail */}
                          <td style={{ padding: '14px 16px' }}>
                            <div style={{ fontWeight: 600, color: '#0f172a' }}>{prod.name}</div>
                            <div style={{ display: 'flex', gap: '8px', marginTop: '3px', fontSize: '0.72rem', color: '#94a3b8' }}>
                              {prod.shortCode && <span>Code: <strong>{prod.shortCode}</strong></span>}
                              {prod.shortCode && prod.barcode && <span>•</span>}
                              {prod.barcode && <span>Barcode: <strong>{prod.barcode}</strong></span>}
                            </div>
                          </td>

                          {/* Category */}
                          <td style={{ padding: '14px 16px', color: '#475569' }}>
                            <span style={{ fontSize: '0.78rem', background: '#f1f5f9', padding: '3px 8px', borderRadius: '4px', border: '1px solid #e2e8f0' }}>
                              {prod.categoryName || 'Uncategorised'}
                            </span>
                          </td>

                          {/* Current Stock */}
                          <td style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 600, color: '#1e293b' }}>
                            <span style={{ color: prod.currentStock <= prod.bufferStockVal ? '#ef4444' : 'inherit' }}>
                              {prod.currentStock}
                            </span>
                          </td>

                          {/* Buffer Stock */}
                          <td style={{ padding: '14px 16px', textAlign: 'right', color: '#475569' }}>
                            {prod.bufferStockVal}
                          </td>

                          {/* Pending Stock */}
                          <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                            {hasPending ? (
                              <span 
                                style={{
                                  background: '#fffbeb', border: '1px solid #fde68a', color: '#b45309',
                                  padding: '2px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600,
                                  cursor: 'help', display: 'inline-flex', alignItems: 'center', gap: '4px'
                                }}
                                title="Reserved in Open Bills"
                              >
                                {prod.pendingStock} pending
                              </span>
                            ) : (
                              <span style={{ color: '#94a3b8' }}>—</span>
                            )}
                          </td>

                          {/* Projected Stock */}
                          <td style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 600 }}>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                              <span style={{ color: isProjectedBelowBuffer ? '#ef4444' : '#10b981' }}>
                                {prod.projectedStock}
                              </span>
                              {hasPending && isProjectedBelowBuffer && (
                                <span style={{ fontSize: '0.62rem', color: '#b91c1c', display: 'flex', alignItems: 'center', gap: '2px', marginTop: '2px' }}>
                                  <AlertTriangle size={8} /> Risk Below Buffer
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Status Badge */}
                          <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                            {prod.status === 'crossed' && (
                              <span style={{ background: '#fef2f2', border: '1px solid #fee2e2', color: '#ef4444', padding: '4px 10px', borderRadius: '99px', fontSize: '0.72rem', fontWeight: 600, display: 'inline-block', width: '110px' }}>
                                Crossed Buffer
                              </span>
                            )}
                            {prod.status === 'in_buffer' && (
                              <span style={{ background: '#fffbeb', border: '1px solid #fef3c7', color: '#d97706', padding: '4px 10px', borderRadius: '99px', fontSize: '0.72rem', fontWeight: 600, display: 'inline-block', width: '110px' }}>
                                In Buffer
                              </span>
                            )}
                            {prod.status === 'closer' && (
                              <span style={{ background: '#fef9c3', border: '1px solid #fef08a', color: '#ca8a04', padding: '4px 10px', borderRadius: '99px', fontSize: '0.72rem', fontWeight: 600, display: 'inline-block', width: '110px' }}>
                                Near Buffer
                              </span>
                            )}
                            {prod.status === 'good' && (
                              <span style={{ background: '#ecfdf5', border: '1px solid #d1fae5', color: '#059669', padding: '4px 10px', borderRadius: '99px', fontSize: '0.72rem', fontWeight: 600, display: 'inline-block', width: '110px' }}>
                                Good Stock
                              </span>
                            )}
                          </td>

                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

          </div>
        </>
      )}

      {/* Detail Modal Overlay for Category Tiles */}
      {activeGroup && (
        <div className="modal-overlay" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="modal-content" style={{ maxWidth: '640px', width: '90%', background: '#ffffff', color: '#1e293b', borderRadius: '16px', padding: '24px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: activeGroup.color, display: 'inline-block' }}></span>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 600, color: '#0f172a', margin: 0 }}>
                  {activeGroup.title} — Products ({activeGroup.items.length})
                </h3>
              </div>
              <button 
                onClick={() => setModalGroup(null)}
                style={{ background: 'none', border: 'none', color: '#64748b', fontSize: '1.1rem', cursor: 'pointer', padding: '4px' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal search bar */}
            <div style={{ position: 'relative', marginBottom: '16px' }}>
              <Search size={14} style={{ position: 'absolute', left: '10px', top: '10px', color: '#94a3b8' }} />
              <input
                type="text"
                placeholder="Search products in this status group..."
                value={modalSearch}
                onChange={(e) => setModalSearch(e.target.value)}
                style={{
                  padding: '7px 10px 7px 32px',
                  fontSize: '0.82rem',
                  background: '#f8fafc',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  width: '100%',
                  color: '#0f172a'
                }}
              />
            </div>

            {/* Modal scroll area */}
            <div className="data-table-container" style={{ maxHeight: '360px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                    <th style={{ padding: '10px 14px', fontWeight: 600 }}>Product</th>
                    <th style={{ padding: '10px 14px', fontWeight: 600 }}>Category</th>
                    <th style={{ padding: '10px 14px', fontWeight: 600, textAlign: 'right' }}>Stock / Buffer</th>
                    <th style={{ padding: '10px 14px', fontWeight: 600, textAlign: 'right' }}>Pending</th>
                    <th style={{ padding: '10px 14px', fontWeight: 600, textAlign: 'right' }}>Projected</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredModalItems.length === 0 ? (
                    <tr>
                      <td colSpan="5" style={{ padding: '24px 14px', textAlign: 'center', color: '#64748b' }}>
                        No items matching search in this group.
                      </td>
                    </tr>
                  ) : (
                    filteredModalItems.map(item => (
                      <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '10px 14px' }}>
                          <div style={{ fontWeight: 600, color: '#0f172a' }}>{item.name}</div>
                          {item.shortCode && <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>Code: {item.shortCode}</div>}
                        </td>
                        <td style={{ padding: '10px 14px', color: '#64748b' }}>
                          {item.categoryName || 'General'}
                        </td>
                        <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 600 }}>
                          {item.currentStock} <span style={{ color: '#94a3b8', fontWeight: 400 }}>/ {item.bufferStockVal}</span>
                        </td>
                        <td style={{ padding: '10px 14px', textAlign: 'right', color: item.pendingStock > 0 ? '#b45309' : '#94a3b8' }}>
                          {item.pendingStock > 0 ? `${item.pendingStock} pcs` : '—'}
                        </td>
                        <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 600, color: item.projectedStock < item.bufferStockVal ? '#ef4444' : '#10b981' }}>
                          {item.projectedStock}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px', borderTop: '1px solid #e2e8f0', paddingTop: '14px' }}>
              <button 
                onClick={() => setModalGroup(null)}
                className="btn-blue-primary"
                style={{ padding: '8px 18px', fontSize: '0.82rem', width: 'auto' }}
              >
                Close Details
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}

export default StockAnalysis;
