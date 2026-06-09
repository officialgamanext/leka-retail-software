import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Receipt, Search, Eye, AlertTriangle, Loader2 } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL;

function Invoices({ token, business }) {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Selected receipt overlay modal state
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  useEffect(() => {
    fetchInvoices();
  }, [business.id]);

  const fetchInvoices = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await axios.get(`${API_URL}/invoices`, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'X-Business-Id': business.id
        }
      });
      if (response.data.success) {
        setInvoices(response.data.invoices);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load historical sales invoices');
    } finally {
      setLoading(false);
    }
  };

  const filteredInvoices = invoices.filter(inv => 
    inv.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (inv.customerPhone && inv.customerPhone.includes(searchQuery)) ||
    inv.customerName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div>
      <div className="mb-4">
        <h2>Sales Billing History</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '4px' }}>
          Browse historical customer sales invoices, look up customer bills, and review transaction records.
        </p>
      </div>

      {error && (
        <div className="alert-banner error mb-4">
          <AlertTriangle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Filter Invoices */}
      <div style={{ position: 'relative', maxWidth: '400px', marginBottom: '20px' }}>
        <Search 
          size={18} 
          style={{ position: 'absolute', left: '12px', top: '13px', color: 'var(--text-muted)' }} 
        />
        <input
          type="text"
          placeholder="Search by Bill No., client name, or phone..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ paddingLeft: '40px' }}
        />
      </div>

      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '200px' }}>
          <Loader2 className="animate-spin" size={32} style={{ color: 'var(--primary)' }} />
        </div>
      ) : filteredInvoices.length === 0 ? (
        <div style={{ textAlign: 'center', background: 'var(--bg-card)', padding: '50px 20px', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', color: 'var(--text-secondary)' }}>
          <Receipt size={36} style={{ color: 'var(--text-muted)', marginBottom: '12px' }} />
          <p>No billing invoices found matching search terms.</p>
        </div>
      ) : (
        <div className="data-table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Bill Number</th>
                <th>Date / Time</th>
                <th>Customer Name</th>
                <th>Customer Phone</th>
                <th>Method</th>
                <th>Items Count</th>
                <th>Bill Total (₹)</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredInvoices.map(inv => {
                const dateVal = inv.createdAt?._seconds 
                  ? new Date(inv.createdAt._seconds * 1000) 
                  : new Date(inv.createdAt);
                
                const totalItems = inv.items ? inv.items.reduce((sum, item) => sum + item.quantity, 0) : 0;

                return (
                  <tr key={inv.id}>
                    <td style={{ fontWeight: 600, color: 'var(--primary)' }}>{inv.invoiceNumber}</td>
                    <td>{dateVal.toLocaleString()}</td>
                    <td>{inv.customerName}</td>
                    <td style={{ fontFamily: 'monospace' }}>{inv.customerPhone || '—'}</td>
                    <td>
                      <span style={{ fontSize: '0.8rem', padding: '2px 8px', borderRadius: '4px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)' }}>
                        {inv.paymentMethod}
                      </span>
                    </td>
                    <td>{totalItems} items</td>
                    <td style={{ fontWeight: 700 }}>₹{Number(inv.grandTotal).toFixed(2)}</td>
                    <td style={{ textAlign: 'right' }}>
                      <button 
                        className="btn btn-secondary" 
                        style={{ padding: '6px 10px', fontSize: '0.8rem' }}
                        onClick={() => setSelectedInvoice(inv)}
                      >
                        <Eye size={12} /> View Bill
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Selected Bill Receipt Modal Overlay */}
      {selectedInvoice && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '380px', background: '#f8fafc', color: '#1e293b' }}>
            <div className="modal-header" style={{ borderBottom: '1px solid rgba(0,0,0,0.08)', paddingBottom: '12px' }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#0f172a' }}>
                <Receipt size={20} style={{ color: 'var(--primary)' }} /> Sales Receipt
              </h3>
              <button className="modal-close" style={{ color: '#64748b' }} onClick={() => setSelectedInvoice(null)}>
                ✕
              </button>
            </div>

            <div className="receipt-wrapper">
              <div className="receipt-header">
                <h2 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0 }}>{business.name}</h2>
                <p style={{ fontSize: '0.75rem', color: '#475569', margin: '4px 0 0 0' }}>{business.address}</p>
              </div>

              <div className="receipt-row" style={{ marginTop: '8px' }}>
                <span>Bill No: {selectedInvoice.invoiceNumber}</span>
                <span>Date: {new Date(selectedInvoice.createdAt?._seconds ? selectedInvoice.createdAt._seconds * 1000 : selectedInvoice.createdAt).toLocaleDateString()}</span>
              </div>
              <div className="receipt-row">
                <span>Customer: {selectedInvoice.customerName}</span>
                <span>{selectedInvoice.customerPhone && `Mob: ${selectedInvoice.customerPhone}`}</span>
              </div>

              <div className="receipt-divider"></div>

              <div className="receipt-items">
                {selectedInvoice.items.map((item, idx) => (
                  <div key={idx} style={{ marginBottom: '6px' }}>
                    <div className="receipt-row" style={{ fontWeight: 'bold' }}>
                      <span>{item.name}</span>
                      <span>₹{item.total.toFixed(2)}</span>
                    </div>
                    <div className="receipt-row" style={{ color: '#475569', fontSize: '0.7rem' }}>
                      <span>₹{item.price.toFixed(2)} x {item.quantity} units</span>
                      <span>GST: {item.gstRate}%</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="receipt-divider"></div>

              <div className="receipt-row">
                <span>Subtotal:</span>
                <span>₹{selectedInvoice.subtotal.toFixed(2)}</span>
              </div>
              <div className="receipt-row">
                <span>Tax (GST):</span>
                <span>₹{selectedInvoice.taxAmount.toFixed(2)}</span>
              </div>
              {selectedInvoice.discount > 0 && (
                <div className="receipt-row" style={{ color: 'red' }}>
                  <span>Discount:</span>
                  <span>-₹{selectedInvoice.discount.toFixed(2)}</span>
                </div>
              )}
              
              <div className="receipt-divider"></div>

              <div className="receipt-row" style={{ fontSize: '1rem', fontWeight: 'bold' }}>
                <span>GRAND TOTAL:</span>
                <span>₹{selectedInvoice.grandTotal.toFixed(2)}</span>
              </div>

              <div className="receipt-divider"></div>
              <div className="receipt-row" style={{ justifyContent: 'center', fontSize: '0.75rem', color: '#475569', fontWeight: 600 }}>
                Paid via: {selectedInvoice.paymentMethod}
              </div>
              <div className="receipt-divider"></div>
              <p style={{ textAlign: 'center', fontSize: '0.7rem', margin: '4px 0 0 0', fontStyle: 'italic' }}>
                Powered by LEKA RETAIL.
              </p>
            </div>

            <div className="modal-footer" style={{ marginTop: '20px', borderTop: '1px solid rgba(0,0,0,0.08)', paddingTop: '12px' }}>
              <button 
                type="button" 
                className="btn btn-secondary" 
                style={{ background: '#e2e8f0', color: '#1e293b', border: 'none' }}
                onClick={() => window.print()}
              >
                Print Receipt
              </button>
              <button 
                type="button" 
                className="btn btn-primary" 
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

export default Invoices;
