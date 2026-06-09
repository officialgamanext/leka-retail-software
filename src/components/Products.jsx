import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Package, Plus, Search, Trash2, Edit, X, Loader2, AlertTriangle } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL;

function Products({ token, business }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Form states
  const [showForm, setShowForm] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');
  
  // Edit mode
  const [editingId, setEditingId] = useState(null);

  // Form Fields
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [price, setPrice] = useState('');
  const [gstRate, setGstRate] = useState(18); // 18% default
  const [stock, setStock] = useState('');

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
      setError(err.response?.data?.message || 'Failed to load catalog products');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreateForm = () => {
    setEditingId(null);
    setName('');
    setSku('');
    setPrice('');
    setGstRate(18);
    setStock('');
    setFormError('');
    setShowForm(true);
  };

  const handleOpenEditForm = (product) => {
    setEditingId(product.id);
    setName(product.name);
    setSku(product.sku || '');
    setPrice(product.price);
    setGstRate(product.gstRate || 0);
    setStock(product.stock);
    setFormError('');
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name || price === '' || stock === '') {
      setFormError('Please fill in Name, Price, and Stock fields.');
      return;
    }

    setFormLoading(true);
    setFormError('');

    const payload = {
      name,
      sku,
      price: Number(price),
      gstRate: Number(gstRate),
      stock: Number(stock)
    };

    try {
      if (editingId) {
        // Update
        const response = await axios.put(`${API_URL}/products/${editingId}`, payload, {
          headers: {
            Authorization: `Bearer ${token}`,
            'X-Business-Id': business.id
          }
        });
        if (response.data.success) {
          setProducts(products.map(p => p.id === editingId ? response.data.product : p));
          setShowForm(false);
        }
      } else {
        // Create
        const response = await axios.post(`${API_URL}/products`, payload, {
          headers: {
            Authorization: `Bearer ${token}`,
            'X-Business-Id': business.id
          }
        });
        if (response.data.success) {
          setProducts([...products, response.data.product]);
          setShowForm(false);
        }
      }
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to save product');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (productId) => {
    if (!window.confirm('Are you sure you want to delete this product from catalog?')) return;

    try {
      const response = await axios.delete(`${API_URL}/products/${productId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'X-Business-Id': business.id
        }
      });
      if (response.data.success) {
        setProducts(products.filter(p => p.id !== productId));
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete product');
    }
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (p.sku && p.sku.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div>
      <div className="flex-between mb-4">
        <div>
          <h2>Product Inventory Management</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '4px' }}>
            Maintain product catalog items, prices, GST tax rates, and real-time inventory counts.
          </p>
        </div>
        <button className="btn btn-primary" onClick={handleOpenCreateForm}>
          <Plus size={16} /> Add Product
        </button>
      </div>

      {error && (
        <div className="alert-banner error mb-4">
          <AlertTriangle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Search Bar */}
      <div style={{ position: 'relative', maxWidth: '400px', marginBottom: '20px' }}>
        <Search 
          size={18} 
          style={{ position: 'absolute', left: '12px', top: '13px', color: 'var(--text-muted)' }} 
        />
        <input
          type="text"
          placeholder="Filter products by name or SKU..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ paddingLeft: '40px' }}
        />
      </div>

      {/* Catalog Table */}
      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '200px' }}>
          <Loader2 className="animate-spin" size={32} style={{ color: 'var(--primary)' }} />
        </div>
      ) : filteredProducts.length === 0 ? (
        <div style={{ textAlign: 'center', background: 'var(--bg-card)', padding: '50px 20px', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', color: 'var(--text-secondary)' }}>
          <Package size={36} style={{ color: 'var(--text-muted)', marginBottom: '12px' }} />
          <p>No products registered matching criteria.</p>
          <button className="btn btn-secondary btn-sm" style={{ marginTop: '16px' }} onClick={handleOpenCreateForm}>
            Add First Product
          </button>
        </div>
      ) : (
        <div className="data-table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Product Name</th>
                <th>SKU Barcode</th>
                <th>Selling Price (₹)</th>
                <th>GST Rate</th>
                <th>Available Stock</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map(prod => (
                <tr key={prod.id}>
                  <td style={{ fontWeight: 500 }}>{prod.name}</td>
                  <td style={{ color: 'var(--text-secondary)', fontFamily: 'monospace' }}>{prod.sku || '—'}</td>
                  <td>₹{Number(prod.price).toFixed(2)}</td>
                  <td>{prod.gstRate}%</td>
                  <td style={{ fontWeight: 600, color: prod.stock <= 5 ? 'var(--warning)' : 'var(--text-primary)' }}>
                    {prod.stock}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: '8px' }}>
                      <button 
                        className="btn btn-secondary" 
                        style={{ padding: '6px 10px', fontSize: '0.8rem' }}
                        onClick={() => handleOpenEditForm(prod)}
                      >
                        <Edit size={12} /> Edit
                      </button>
                      <button 
                        className="btn btn-danger" 
                        style={{ padding: '6px 10px', fontSize: '0.8rem', background: 'rgba(239,68,68,0.1)', color: 'var(--danger)', border: 'none' }}
                        onClick={() => handleDelete(prod.id)}
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add / Edit Product Modal */}
      {showForm && (
        <div className="modal-overlay">
          <form className="modal-content" onSubmit={handleSubmit} style={{ maxWidth: '460px' }}>
            <div className="modal-header">
              <h2>{editingId ? 'Edit Product Item' : 'Add New Product'}</h2>
              <button type="button" className="modal-close" onClick={() => setShowForm(false)}>
                <X size={18} />
              </button>
            </div>

            {formError && (
              <div className="alert-banner error mb-4">
                <AlertTriangle size={16} />
                <span>{formError}</span>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label htmlFor="prodName">Product Name *</label>
                <input
                  id="prodName"
                  type="text"
                  placeholder="e.g. Raju Ghee Sweets 1kg"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={formLoading}
                  required
                />
              </div>

              <div>
                <label htmlFor="prodSku">SKU Barcode (Optional)</label>
                <input
                  id="prodSku"
                  type="text"
                  placeholder="e.g. 89010300223"
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                  disabled={formLoading}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label htmlFor="prodPrice">Price (₹, Excl. GST) *</label>
                  <input
                    id="prodPrice"
                    type="number"
                    step="0.01"
                    placeholder="e.g. 450.00"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    disabled={formLoading}
                    required
                  />
                </div>
                <div>
                  <label htmlFor="prodGst">GST Tax Rate *</label>
                  <select
                    id="prodGst"
                    value={gstRate}
                    onChange={(e) => setGstRate(Number(e.target.value))}
                    disabled={formLoading}
                  >
                    <option value={0}>0% GST (Exempt)</option>
                    <option value={5}>5% GST</option>
                    <option value={12}>12% GST</option>
                    <option value={18}>18% GST</option>
                    <option value={28}>28% GST</option>
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="prodStock">Initial Inventory Stock *</label>
                <input
                  id="prodStock"
                  type="number"
                  placeholder="e.g. 100"
                  value={stock}
                  onChange={(e) => setStock(e.target.value)}
                  disabled={formLoading}
                  required
                />
              </div>
            </div>

            <div className="modal-footer">
              <button 
                type="button" 
                className="btn btn-secondary" 
                onClick={() => setShowForm(false)}
                disabled={formLoading}
              >
                Cancel
              </button>
              <button 
                type="submit" 
                className="btn btn-primary" 
                disabled={formLoading}
              >
                {formLoading ? (
                  <>
                    <Loader2 className="animate-spin" size={16} /> Saving...
                  </>
                ) : (
                  editingId ? 'Update Product' : 'Add Product'
                )}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

export default Products;
