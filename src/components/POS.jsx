import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Search, ShoppingBag, Trash2, Tag, CreditCard, Banknote, Landmark, Loader2, Sparkles, ReceiptText } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL;

function POS({ token, business }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Cart state
  const [cart, setCart] = useState([]);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [discount, setDiscount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('Cash');

  // Checkout response state
  const [checkoutInvoice, setCheckoutInvoice] = useState(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  useEffect(() => {
    fetchProducts();
  }, [business.id]);

  const fetchProducts = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await axios.get(`${API_URL}/products`, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'X-Business-Id': business.id
        }
      });
      if (response.data.success) {
        setProducts(response.data.products);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = (product) => {
    if (product.stock <= 0) return;

    const existingItem = cart.find(item => item.productId === product.id);
    
    // Check if adding exceeds stock
    const currentQtyInCart = existingItem ? existingItem.quantity : 0;
    if (currentQtyInCart >= product.stock) {
      alert(`Cannot add more. Only ${product.stock} units available in stock.`);
      return;
    }

    if (existingItem) {
      setCart(cart.map(item => 
        item.productId === product.id 
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      setCart([...cart, {
        productId: product.id,
        name: product.name,
        price: product.price,
        gstRate: product.gstRate,
        quantity: 1,
        stock: product.stock
      }]);
    }
  };

  const handleUpdateQty = (productId, newQty) => {
    if (newQty <= 0) {
      handleRemoveFromCart(productId);
      return;
    }

    const item = cart.find(i => i.productId === productId);
    if (newQty > item.stock) {
      alert(`Cannot exceed available stock of ${item.stock} units.`);
      return;
    }

    setCart(cart.map(item => 
      item.productId === productId 
        ? { ...item, quantity: newQty }
        : item
    ));
  };

  const handleRemoveFromCart = (productId) => {
    setCart(cart.filter(item => item.productId !== productId));
  };

  const handleClearCart = () => {
    setCart([]);
    setCustomerName('');
    setCustomerPhone('');
    setDiscount(0);
    setPaymentMethod('Cash');
  };

  // Calculations
  const calculateCartSubtotal = () => {
    return cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  };

  const calculateCartGst = () => {
    return cart.reduce((sum, item) => {
      const itemSubtotal = item.price * item.quantity;
      return sum + ((itemSubtotal * item.gstRate) / 100);
    }, 0);
  };

  const subtotal = calculateCartSubtotal();
  const gstAmount = calculateCartGst();
  const grandTotal = Math.max(0, subtotal + gstAmount - Number(discount || 0));

  const handleCheckout = async () => {
    if (cart.length === 0) {
      alert('Cart is empty. Please select products to sell.');
      return;
    }

    setCheckoutLoading(true);
    try {
      const response = await axios.post(`${API_URL}/invoices`, {
        customerName,
        customerPhone,
        items: cart.map(item => ({
          productId: item.productId,
          quantity: item.quantity
        })),
        discount: Number(discount),
        paymentMethod
      }, {
        headers: {
          Authorization: `Bearer ${token}`,
          'X-Business-Id': business.id
        }
      });

      if (response.data.success) {
        setCheckoutInvoice(response.data.invoice);
        handleClearCart();
        // Refresh catalog to reflect new stock levels
        fetchProducts();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Checkout failed');
    } finally {
      setCheckoutLoading(false);
    }
  };

  // Filter products by search query
  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    p.sku.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="pos-container">
      {/* Catalog Section */}
      <div className="pos-catalog">
        <div className="pos-search-bar">
          <div style={{ position: 'relative', flexGrow: 1 }}>
            <Search 
              size={18} 
              style={{ position: 'absolute', left: '12px', top: '13px', color: 'var(--text-muted)' }} 
            />
            <input
              type="text"
              placeholder="Search products by name or SKU barcode..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ paddingLeft: '40px' }}
            />
          </div>
        </div>

        {error && (
          <div className="alert-banner error">
            <span>{error}</span>
          </div>
        )}

        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexGrow: 1 }}>
            <Loader2 className="animate-spin" size={36} style={{ color: 'var(--primary)' }} />
          </div>
        ) : filteredProducts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-secondary)' }}>
            <p>No products found in catalog. Create products in the "Products" tab.</p>
          </div>
        ) : (
          <div className="pos-grid">
            {filteredProducts.map(prod => {
              const outOfStock = prod.stock <= 0;
              return (
                <div 
                  key={prod.id} 
                  className={`pos-product-card ${outOfStock ? 'disabled' : ''}`}
                  onClick={() => handleAddToCart(prod)}
                  style={{ opacity: outOfStock ? 0.5 : 1, cursor: outOfStock ? 'not-allowed' : 'pointer' }}
                >
                  <div className="pos-product-name">{prod.name}</div>
                  <div className="pos-product-sku">SKU: {prod.sku || 'N/A'}</div>
                  
                  <div className="pos-product-price">₹{Number(prod.price).toFixed(2)}</div>
                  <div className={`pos-product-stock ${prod.stock <= 5 ? 'stock-warning' : ''}`}>
                    {outOfStock ? 'Out of Stock' : `Stock: ${prod.stock}`}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                    GST: {prod.gstRate}%
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Cart Sidebar Section */}
      <div className="pos-cart">
        <div className="cart-header">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShoppingBag size={18} style={{ color: 'var(--primary)' }} /> Billing Cart ({cart.length})
          </h3>
          {cart.length > 0 && (
            <button className="btn-secondary" style={{ padding: '6px 12px', fontSize: '0.8rem', borderRadius: 'var(--radius-sm)', cursor: 'pointer', border: 'none' }} onClick={handleClearCart}>
              Clear
            </button>
          )}
        </div>

        <div className="cart-items">
          {cart.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 10px', color: 'var(--text-secondary)' }}>
              Cart is empty.<br />Click catalog products to add.
            </div>
          ) : (
            cart.map(item => (
              <div key={item.productId} className="cart-item">
                <div className="cart-item-details">
                  <div className="cart-item-name">{item.name}</div>
                  <div className="cart-item-price">
                    ₹{item.price.toFixed(2)} + {item.gstRate}% GST
                  </div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--primary)' }}>
                    Total: ₹{( (item.price * item.quantity) * (1 + item.gstRate/100) ).toFixed(2)}
                  </div>
                </div>

                <div className="cart-item-actions">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <button className="cart-qty-btn" onClick={() => handleUpdateQty(item.productId, item.quantity - 1)}>
                      -
                    </button>
                    <span className="cart-qty">{item.quantity}</span>
                    <button className="cart-qty-btn" onClick={() => handleUpdateQty(item.productId, item.quantity + 1)}>
                      +
                    </button>
                  </div>
                  <button className="cart-item-remove" onClick={() => handleRemoveFromCart(item.productId)}>
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Customer Details Form */}
        <div style={{ padding: '16px 20px', borderTop: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div>
            <label htmlFor="custPhone" style={{ marginBottom: '4px' }}>Customer Phone</label>
            <input
              id="custPhone"
              type="text"
              placeholder="e.g. +91 9999999999"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              style={{ padding: '6px 10px', fontSize: '0.85rem' }}
            />
          </div>
          <div>
            <label htmlFor="custName" style={{ marginBottom: '4px' }}>Customer Name</label>
            <input
              id="custName"
              type="text"
              placeholder="Walk-in Customer"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              style={{ padding: '6px 10px', fontSize: '0.85rem' }}
            />
          </div>
        </div>

        {/* Pricing Summary */}
        <div className="cart-summary">
          <div className="summary-row">
            <span>Subtotal</span>
            <span>₹{subtotal.toFixed(2)}</span>
          </div>
          <div className="summary-row">
            <span>GST Amount</span>
            <span>₹{gstAmount.toFixed(2)}</span>
          </div>
          
          <div className="summary-row" style={{ alignItems: 'center' }}>
            <span>Discount (₹)</span>
            <input
              type="number"
              value={discount}
              onChange={(e) => setDiscount(Math.max(0, Number(e.target.value)))}
              style={{ width: '80px', padding: '4px 6px', fontSize: '0.8rem', textAlign: 'right' }}
            />
          </div>

          <div className="summary-row" style={{ marginTop: '10px', marginBottom: '10px' }}>
            <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Payment Mode</span>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button 
                type="button"
                className={`btn btn-secondary ${paymentMethod === 'Cash' ? 'active' : ''}`}
                style={{ padding: '4px 8px', fontSize: '0.75rem', border: paymentMethod === 'Cash' ? '1px solid var(--primary)' : '1px solid var(--border-color)' }}
                onClick={() => setPaymentMethod('Cash')}
              >
                <Banknote size={12} /> Cash
              </button>
              <button 
                type="button"
                className={`btn btn-secondary ${paymentMethod === 'UPI' ? 'active' : ''}`}
                style={{ padding: '4px 8px', fontSize: '0.75rem', border: paymentMethod === 'UPI' ? '1px solid var(--primary)' : '1px solid var(--border-color)' }}
                onClick={() => setPaymentMethod('UPI')}
              >
                <Sparkles size={12} /> UPI
              </button>
              <button 
                type="button"
                className={`btn btn-secondary ${paymentMethod === 'Card' ? 'active' : ''}`}
                style={{ padding: '4px 8px', fontSize: '0.75rem', border: paymentMethod === 'Card' ? '1px solid var(--primary)' : '1px solid var(--border-color)' }}
                onClick={() => setPaymentMethod('Card')}
              >
                <CreditCard size={12} /> Card
              </button>
            </div>
          </div>

          <div className="summary-row total">
            <span>Grand Total</span>
            <span>₹{grandTotal.toFixed(2)}</span>
          </div>

          <button 
            className="btn btn-primary" 
            style={{ width: '100%', marginTop: '14px', borderRadius: 'var(--radius-md)', padding: '12px' }}
            onClick={handleCheckout}
            disabled={cart.length === 0 || checkoutLoading}
          >
            {checkoutLoading ? (
              <>
                <Loader2 className="animate-spin" size={18} /> Processing...
              </>
            ) : (
              'Complete Bill & Print'
            )}
          </button>
        </div>
      </div>

      {/* Bill Receipt Dialog Overlay */}
      {checkoutInvoice && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '380px', background: '#f8fafc', color: '#1e293b' }}>
            <div className="modal-header" style={{ borderBottom: '1px solid rgba(0,0,0,0.08)', paddingBottom: '12px' }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#0f172a' }}>
                <ReceiptText size={20} style={{ color: 'var(--success)' }} /> Checkout Receipt
              </h3>
              <button className="modal-close" style={{ color: '#64748b' }} onClick={() => setCheckoutInvoice(null)}>
                ✕
              </button>
            </div>

            {/* Print Friendly Format */}
            <div className="receipt-wrapper">
              <div className="receipt-header">
                <h2 style={{ fontSize: '1.2rem', fontWeight: 600, margin: 0 }}>{business.name}</h2>
                <p style={{ fontSize: '0.75rem', color: '#475569', margin: '4px 0 0 0' }}>{business.address}</p>
              </div>

              <div className="receipt-row" style={{ marginTop: '8px' }}>
                <span>Bill No: {checkoutInvoice.invoiceNumber}</span>
                <span>Date: {new Date(checkoutInvoice.createdAt).toLocaleDateString()}</span>
              </div>
              <div className="receipt-row">
                <span>Customer: {checkoutInvoice.customerName}</span>
                <span>{checkoutInvoice.customerPhone && `Mob: ${checkoutInvoice.customerPhone}`}</span>
              </div>

              <div className="receipt-divider"></div>

              <div className="receipt-items">
                {checkoutInvoice.items.map((item, idx) => (
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
                <span>₹{checkoutInvoice.subtotal.toFixed(2)}</span>
              </div>
              <div className="receipt-row">
                <span>Tax (GST):</span>
                <span>₹{checkoutInvoice.taxAmount.toFixed(2)}</span>
              </div>
              {checkoutInvoice.discount > 0 && (
                <div className="receipt-row" style={{ color: 'red' }}>
                  <span>Discount:</span>
                  <span>-₹{checkoutInvoice.discount.toFixed(2)}</span>
                </div>
              )}
              
              <div className="receipt-divider"></div>

              <div className="receipt-row" style={{ fontSize: '1rem', fontWeight: 'bold' }}>
                <span>GRAND TOTAL:</span>
                <span>₹{checkoutInvoice.grandTotal.toFixed(2)}</span>
              </div>

              <div className="receipt-divider"></div>
              <div className="receipt-row" style={{ justifyContent: 'center', fontSize: '0.75rem', color: '#475569', fontWeight: 600 }}>
                Paid via: {checkoutInvoice.paymentMethod}
              </div>
              <div className="receipt-divider"></div>
              <p style={{ textAlign: 'center', fontSize: '0.7rem', margin: '4px 0 0 0', fontStyle: 'italic' }}>
                Thank you for your business! Powered by LEKA RETAIL.
              </p>
            </div>

            <div className="modal-footer" style={{ marginTop: '20px', borderTop: '1px solid rgba(0,0,0,0.08)', paddingTop: '12px' }}>
              <button 
                type="button" 
                className="btn btn-secondary" 
                style={{ background: '#e2e8f0', color: '#1e293b', border: 'none' }}
                onClick={() => window.print()}
              >
                Print PDF
              </button>
              <button 
                type="button" 
                className="btn btn-success" 
                onClick={() => setCheckoutInvoice(null)}
              >
                Close Bill
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default POS;
