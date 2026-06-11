import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import { 
  Truck, ShoppingBag, Plus, Minus, Search, Trash2, Edit, Eye, 
  Printer, X, Loader2, AlertTriangle, CheckCircle, MapPin, 
  Phone, User, Calendar, FileText, ChevronDown, CheckSquare, Square
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL;

// ─── Custom Category Dropdown ─────────────────────────────────────────────────
function CategoryDropdown({ categories, value, onChange }) {
  const [open, setOpen]     = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef(null);

  useEffect(() => {
    function handler(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const allOptions  = [{ id: '', name: 'All Categories' }, ...categories];
  const filtered    = allOptions.filter(c =>
    (c.name || '').toLowerCase().includes(search.toLowerCase())
  );
  const selected    = allOptions.find(c => c.id === value) || allOptions[0];

  return (
    <div ref={ref} style={{ position: 'relative', width: '180px', flexShrink: 0 }}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '8px',
          padding: '8px 14px', fontSize: '0.85rem', color: '#1f2937', cursor: 'pointer',
          height: '38px', boxSizing: 'border-box'
        }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selected.name}</span>
        <ChevronDown size={14} style={{ color: '#9ca3af', transform: open ? 'rotate(180deg)' : 'none', transition: '0.2s', flexShrink: 0 }} />
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, zIndex: 1200, width: '220px',
          background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '10px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.1)', marginTop: '4px', overflow: 'hidden'
        }}>
          <div style={{ padding: '8px', borderBottom: '1px solid #f3f4f6' }}>
            <div style={{ position: 'relative' }}>
              <Search size={12} style={{ position: 'absolute', left: '10px', top: '9px', color: '#9ca3af' }} />
              <input
                type="text"
                autoFocus
                placeholder="Search category..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{
                  width: '100%', paddingLeft: '30px', border: '1px solid #cbd5e1',
                  borderRadius: '6px', fontSize: '0.8rem', padding: '6px 6px 6px 30px',
                  background: '#f9fafb', color: '#1f2937', boxSizing: 'border-box',
                  height: '28px'
                }}
              />
            </div>
          </div>

          <div style={{ maxHeight: '180px', overflowY: 'auto' }}>
            {filtered.length === 0 ? (
              <div style={{ padding: '12px', textAlign: 'center', color: '#9ca3af', fontSize: '0.8rem' }}>
                No categories found
              </div>
            ) : filtered.map(cat => (
              <button
                key={cat.id}
                type="button"
                onClick={() => { onChange(cat.id); setOpen(false); setSearch(''); }}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '8px 12px', background: value === cat.id ? '#eff6ff' : 'transparent',
                  border: 'none', cursor: 'pointer', fontSize: '0.82rem',
                  color: value === cat.id ? '#2563eb' : '#374151', textAlign: 'left',
                  borderBottom: '1px solid #f3f4f6'
                }}
              >
                <span>{cat.name}</span>
                {value === cat.id && <CheckCircle size={12} style={{ color: '#2563eb' }} />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function Vendors({ token, business }) {
  const [activeTab, setActiveTab] = useState('orders'); // default tab is orders
  const [vendors, setVendors] = useState([]);
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Search queries
  const [vendorSearchQuery, setVendorSearchQuery] = useState('');
  const [orderSearchQuery, setOrderSearchQuery] = useState('');

  // Vendor Modal States
  const [showVendorModal, setShowVendorModal] = useState(false);
  const [editingVendor, setEditingVendor] = useState(null);
  const [vendorName, setVendorName] = useState('');
  const [vendorMobile, setVendorMobile] = useState('');
  const [vendorAddress, setVendorAddress] = useState('');
  const [vendorGst, setVendorGst] = useState('');
  const [vendorSaving, setVendorSaving] = useState(false);
  const [vendorFormError, setVendorFormError] = useState('');

  // Full Screen Order Modal States
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [editingOrder, setEditingOrder] = useState(null);
  const [selectedVendorId, setSelectedVendorId] = useState('');
  const [selectedItems, setSelectedItems] = useState([]); // [{ productId, name, shortCode, quantity }]
  const [productSearchQuery, setProductSearchQuery] = useState('');
  const [productCategoryFilter, setProductCategoryFilter] = useState('');
  const [orderSaving, setOrderSaving] = useState(false);
  const [orderFormError, setOrderFormError] = useState('');

  // Worksheet / View Modal States
  const [showWorksheetModal, setShowWorksheetModal] = useState(false);
  const [activeOrder, setActiveOrder] = useState(null);
  const [receivingItems, setReceivingItems] = useState({}); // { [productId]: boolean }

  // Custom Delete Modal States
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteType, setDeleteType] = useState('vendor'); // 'vendor' or 'order'
  const [deleteTargetId, setDeleteTargetId] = useState('');
  const [deleteTargetName, setDeleteTargetName] = useState('');
  const [deleting, setDeleting] = useState(false);

  // Common Headers
  const headers = () => ({
    headers: {
      Authorization: `Bearer ${token}`,
      'X-Business-Id': business.id
    }
  });

  // Fetch initial data
  useEffect(() => {
    fetchData();
  }, [business.id]);

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const [vendorsRes, ordersRes, productsRes, categoriesRes] = await Promise.all([
        axios.get(`${API_URL}/vendors`, headers()),
        axios.get(`${API_URL}/vendors/orders`, headers()),
        axios.get(`${API_URL}/products`, headers()),
        axios.get(`${API_URL}/categories`, headers())
      ]);

      if (vendorsRes.data.success) setVendors(vendorsRes.data.vendors);
      if (ordersRes.data.success) setOrders(ordersRes.data.orders);
      if (productsRes.data.success) setProducts(productsRes.data.products);
      if (categoriesRes.data.success) setCategories(categoriesRes.data.categories);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to load vendors & orders data');
    } finally {
      setLoading(false);
    }
  };

  // ────────────────────────────────────────────────────────────────────────────
  //  VENDORS CRUD
  // ────────────────────────────────────────────────────────────────────────────
  const openVendorModal = (vendor = null) => {
    setVendorFormError('');
    if (vendor) {
      setEditingVendor(vendor);
      setVendorName(vendor.name);
      setVendorMobile(vendor.mobile);
      setVendorAddress(vendor.address || '');
      setVendorGst(vendor.gstNumber || '');
    } else {
      setEditingVendor(null);
      setVendorName('');
      setVendorMobile('');
      setVendorAddress('');
      setVendorGst('');
    }
    setShowVendorModal(true);
  };

  const handleSaveVendor = async (e) => {
    e.preventDefault();
    setVendorFormError('');

    if (!vendorName.trim()) {
      setVendorFormError('Vendor name is required');
      return;
    }
    if (!vendorMobile.trim()) {
      setVendorFormError('Mobile number is required');
      return;
    }

    setVendorSaving(true);
    try {
      const payload = {
        name: vendorName.trim(),
        mobile: vendorMobile.trim(),
        address: vendorAddress.trim(),
        gstNumber: vendorGst.trim()
      };

      let response;
      if (editingVendor) {
        response = await axios.put(`${API_URL}/vendors/${editingVendor.id}`, payload, headers());
        if (response.data.success) {
          setVendors(vendors.map(v => v.id === editingVendor.id ? response.data.vendor : v));
          // Update vendor info in orders cache if any order references this vendor
          setOrders(orders.map(o => o.vendorId === editingVendor.id ? {
            ...o,
            vendorName: response.data.vendor.name,
            vendorMobile: response.data.vendor.mobile,
            vendorAddress: response.data.vendor.address,
            vendorGst: response.data.vendor.gstNumber
          } : o));
        }
      } else {
        response = await axios.post(`${API_URL}/vendors`, payload, headers());
        if (response.data.success) {
          setVendors([response.data.vendor, ...vendors]);
        }
      }
      setShowVendorModal(false);
    } catch (err) {
      setVendorFormError(err.response?.data?.message || 'Failed to save vendor details');
    } finally {
      setVendorSaving(false);
    }
  };

  const triggerDeleteVendor = (vendor) => {
    setDeleteType('vendor');
    setDeleteTargetId(vendor.id);
    setDeleteTargetName(vendor.name);
    setShowDeleteModal(true);
  };

  // ────────────────────────────────────────────────────────────────────────────
  //  PURCHASE ORDERS CRUD
  // ────────────────────────────────────────────────────────────────────────────
  const openOrderModal = (order = null) => {
    setOrderFormError('');
    if (order) {
      setEditingOrder(order);
      setSelectedVendorId(order.vendorId);
      // Map items to selected format
      setSelectedItems(order.items.map(it => ({
        productId: it.productId,
        name: it.name,
        shortCode: it.shortCode || '',
        quantity: it.quantity
      })));
    } else {
      setEditingOrder(null);
      setSelectedVendorId('');
      setSelectedItems([]);
    }
    setProductSearchQuery('');
    setProductCategoryFilter('');
    setShowOrderModal(true);
  };

  const handleAddItemToOrder = (product) => {
    const existing = selectedItems.find(it => it.productId === product.id);
    if (existing) {
      setSelectedItems(selectedItems.map(it => 
        it.productId === product.id ? { ...it, quantity: it.quantity + 1 } : it
      ));
    } else {
      setSelectedItems([...selectedItems, {
        productId: product.id,
        name: product.name,
        shortCode: product.shortCode || '',
        quantity: 1
      }]);
    }
  };

  const handleUpdateItemQty = (productId, qty) => {
    const targetQty = Number(qty);
    if (targetQty <= 0) {
      setSelectedItems(selectedItems.filter(it => it.productId !== productId));
    } else {
      setSelectedItems(selectedItems.map(it => 
        it.productId === productId ? { ...it, quantity: targetQty } : it
      ));
    }
  };

  const handleRemoveItem = (productId) => {
    setSelectedItems(selectedItems.filter(it => it.productId !== productId));
  };

  const handleSaveOrder = async () => {
    setOrderFormError('');

    if (!selectedVendorId) {
      setOrderFormError('Please select a vendor for this purchase order');
      return;
    }
    if (selectedItems.length === 0) {
      setOrderFormError('Please add at least one item to the order');
      return;
    }

    // Validate quantities
    const invalidItem = selectedItems.find(it => !it.quantity || it.quantity <= 0);
    if (invalidItem) {
      setOrderFormError(`Invalid quantity for item "${invalidItem.name}"`);
      return;
    }

    setOrderSaving(true);
    try {
      const payload = {
        vendorId: selectedVendorId,
        items: selectedItems.map(it => ({
          productId: it.productId,
          quantity: it.quantity
        }))
      };

      let response;
      if (editingOrder) {
        response = await axios.put(`${API_URL}/vendors/orders/${editingOrder.id}`, payload, headers());
        if (response.data.success) {
          setOrders(orders.map(o => o.id === editingOrder.id ? response.data.order : o));
        }
      } else {
        response = await axios.post(`${API_URL}/vendors/orders`, payload, headers());
        if (response.data.success) {
          setOrders([response.data.order, ...orders]);
        }
      }
      setShowOrderModal(false);
    } catch (err) {
      setOrderFormError(err.response?.data?.message || 'Failed to save purchase order');
    } finally {
      setOrderSaving(false);
    }
  };

  const triggerDeleteOrder = (order) => {
    setDeleteType('order');
    setDeleteTargetId(order.id);
    setDeleteTargetName(order.orderNumber);
    setShowDeleteModal(true);
  };

  // ────────────────────────────────────────────────────────────────────────────
  //  CONFIRMED DELETE ACTION
  // ────────────────────────────────────────────────────────────────────────────
  const handleConfirmDelete = async () => {
    setDeleting(true);
    try {
      if (deleteType === 'vendor') {
        const response = await axios.delete(`${API_URL}/vendors/${deleteTargetId}`, headers());
        if (response.data.success) {
          setVendors(vendors.filter(v => v.id !== deleteTargetId));
        }
      } else {
        const response = await axios.delete(`${API_URL}/vendors/orders/${deleteTargetId}`, headers());
        if (response.data.success) {
          setOrders(orders.filter(o => o.id !== deleteTargetId));
        }
      }
      setShowDeleteModal(false);
    } catch (err) {
      alert(err.response?.data?.message || 'Deletion failed');
    } finally {
      setDeleting(false);
    }
  };

  // ────────────────────────────────────────────────────────────────────────────
  //  PRINTING & PREVIEW FLOWS
  // ────────────────────────────────────────────────────────────────────────────
  const handleViewWorksheet = (order) => {
    setActiveOrder(order);
    setShowWorksheetModal(true);
  };

  const handlePrintWorksheet = (order) => {
    setActiveOrder(order);
    // Let browser render the print block before launching printer
    setTimeout(() => {
      window.print();
    }, 150);
  };

  // Mark specific PO item received & increment inventory stock level
  const handleReceivePOItem = async (orderId, productId) => {
    setReceivingItems(prev => ({ ...prev, [productId]: true }));
    try {
      const response = await axios.post(
        `${API_URL}/vendors/orders/${orderId}/items/${productId}/receive`,
        {},
        headers()
      );
      if (response.data.success) {
        const updatedOrder = response.data.order;
        // Update states
        setOrders(orders.map(o => o.id === orderId ? updatedOrder : o));
        setActiveOrder(updatedOrder);

        // Fetch refreshed products to show updated stock values in UI
        const productsRes = await axios.get(`${API_URL}/products`, headers());
        if (productsRes.data.success) {
          setProducts(productsRes.data.products);
        }
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update stock and mark received');
    } finally {
      setReceivingItems(prev => ({ ...prev, [productId]: false }));
    }
  };

  // Filters
  const filteredVendors = vendors.filter(v => 
    (v.name || '').toLowerCase().includes(vendorSearchQuery.toLowerCase()) ||
    (v.mobile || '').includes(vendorSearchQuery) ||
    (v.gstNumber || '').toLowerCase().includes(vendorSearchQuery.toLowerCase()) ||
    (v.address || '').toLowerCase().includes(vendorSearchQuery.toLowerCase())
  );

  const filteredOrders = orders.filter(o => 
    (o.orderNumber || '').toLowerCase().includes(orderSearchQuery.toLowerCase()) ||
    (o.vendorName || '').toLowerCase().includes(orderSearchQuery.toLowerCase()) ||
    (o.vendorMobile || '').includes(orderSearchQuery)
  );

  // Products filtering for full-screen order modal
  const filteredProducts = products.filter(p => {
    const matchesSearch = (p.name || '').toLowerCase().includes(productSearchQuery.toLowerCase()) || 
                          (p.shortCode || '').toLowerCase().includes(productSearchQuery.toLowerCase());
    const matchesCategory = !productCategoryFilter || p.categoryId === productCategoryFilter;
    return matchesSearch && matchesCategory;
  });

  // Calculate statistics
  const totalVendors = vendors.length;
  const totalOrders = orders.length;
  const activeOrdersCount = orders.filter(o => o.status === 'Created' || o.status === 'Partially Received').length;

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '350px' }}>
        <Loader2 className="animate-spin" size={36} style={{ color: 'var(--primary)' }} />
      </div>
    );
  }

  return (
    <div>
      {/* Printable Area - Hidden normally, visible during printing using React Portal */}
      {activeOrder && createPortal(
        <div id="printable-worksheet" className="print-only-layout">
          <div style={{ padding: '24px', fontFamily: 'Inter, system-ui, sans-serif', color: '#1e293b' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #e2e8f0', paddingBottom: '16px' }}>
              <div>
                <h1 style={{ fontSize: '1.6rem', fontWeight: 700, margin: 0, color: '#0f172a' }}>{business.name.toUpperCase()}</h1>
                <p style={{ fontSize: '0.82rem', color: '#475569', margin: '4px 0 0 0' }}>{business.address || 'Business Address'}</p>
                {business.gstNumber && <p style={{ fontSize: '0.82rem', color: '#475569', margin: '2px 0 0 0' }}>GSTIN: {business.gstNumber}</p>}
              </div>
              <div style={{ textAlign: 'right' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#2563eb', margin: 0 }}>PURCHASE ORDER WORKSHEET</h2>
                <p style={{ fontSize: '0.85rem', color: '#0f172a', fontWeight: 600, margin: '6px 0 0 0' }}>{activeOrder.orderNumber}</p>
                <p style={{ fontSize: '0.82rem', color: '#64748b', margin: '2px 0 0 0' }}>
                  Date: {activeOrder.createdAt ? (activeOrder.createdAt._seconds ? new Date(activeOrder.createdAt._seconds * 1000).toLocaleDateString() : new Date(activeOrder.createdAt).toLocaleDateString()) : '—'}
                </p>
                <span style={{ display: 'inline-block', background: '#eff6ff', color: '#2563eb', fontSize: '0.72rem', fontWeight: 600, padding: '2px 8px', borderRadius: '4px', marginTop: '4px', textTransform: 'uppercase' }}>
                  Status: {activeOrder.status}
                </span>
              </div>
            </div>

            {/* Vendor details */}
            <div style={{ background: '#f8fafc', borderRadius: '8px', padding: '16px', margin: '20px 0', border: '1px solid #e2e8f0' }}>
              <h3 style={{ fontSize: '0.85rem', textTransform: 'uppercase', color: '#64748b', margin: '0 0 8px 0', letterSpacing: '0.05em', fontWeight: 600 }}>Supplier Info:</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '0.85rem' }}>
                <div>
                  <p style={{ margin: 0, fontWeight: 600, color: '#0f172a' }}>{activeOrder.vendorName}</p>
                  <p style={{ margin: '4px 0 0 0', color: '#475569' }}>{activeOrder.vendorAddress || 'No Address Provided'}</p>
                </div>
                <div>
                  <p style={{ margin: 0, color: '#475569' }}><strong>Mobile:</strong> {activeOrder.vendorMobile}</p>
                  {activeOrder.vendorGst && <p style={{ margin: '4px 0 0 0', color: '#475569' }}><strong>GSTIN:</strong> {activeOrder.vendorGst}</p>}
                </div>
              </div>
            </div>

            {/* Item checklist table (No prices) */}
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', marginTop: '20px' }}>
              <thead>
                <tr style={{ background: '#f1f5f9', borderBottom: '2px solid #cbd5e1' }}>
                  <th style={{ padding: '10px 12px', textAlign: 'left', width: '60px', color: '#475569' }}>S.No</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left', color: '#475569' }}>Product Details</th>
                  <th style={{ padding: '10px 12px', textAlign: 'center', width: '150px', color: '#475569' }}>Qty Ordered</th>
                  <th style={{ padding: '10px 12px', textAlign: 'center', width: '150px', color: '#475569' }}>Qty Received Status</th>
                </tr>
              </thead>
              <tbody>
                {activeOrder.items?.map((item, idx) => (
                  <tr key={item.productId} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '10px 12px', color: '#64748b' }}>{idx + 1}</td>
                    <td style={{ padding: '10px 12px' }}>
                      <span style={{ fontWeight: 600, color: '#0f172a' }}>{item.name}</span>
                      {item.shortCode && <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block', marginTop: '2px' }}>Code: {item.shortCode}</span>}
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 600, color: '#0f172a', fontSize: '1rem' }}>{item.quantity}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 600, color: item.received ? '#059669' : '#e2e8f0' }}>
                      {item.received ? '✓ Received' : '[ &nbsp; &nbsp; &nbsp; ]'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Total summary */}
            <div style={{ marginTop: '28px', borderTop: '2px solid #e2e8f0', paddingTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b', fontStyle: 'italic' }}>
                  * This is a purchase worksheet for tracking incoming stock inventory.
                </p>
                <div style={{ marginTop: '40px', display: 'flex', gap: '80px' }}>
                  <div>
                    <div style={{ width: '150px', borderBottom: '1px solid #cbd5e1', height: '30px' }}></div>
                    <p style={{ margin: '4px 0 0 0', fontSize: '0.75rem', color: '#64748b', textAlign: 'center' }}>Prepared By</p>
                  </div>
                  <div>
                    <div style={{ width: '150px', borderBottom: '1px solid #cbd5e1', height: '30px' }}></div>
                    <p style={{ margin: '4px 0 0 0', fontSize: '0.75rem', color: '#64748b', textAlign: 'center' }}>Supplier Signature</p>
                  </div>
                </div>
              </div>
              <div style={{ background: '#f8fafc', borderRadius: '8px', padding: '16px', border: '1px solid #e2e8f0', minWidth: '200px', textAlign: 'right' }}>
                <span style={{ color: '#64748b', fontSize: '0.85rem' }}>Total Items Quantity:</span>
                <h3 style={{ margin: '4px 0 0 0', fontSize: '1.4rem', fontWeight: 700, color: '#2563eb' }}>
                  {activeOrder.items?.reduce((acc, i) => acc + i.quantity, 0) || 0} units
                </h3>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Screen Layout Wrapper */}
      <div className="no-print">
        {/* Page Header */}
        <div className="page-header-container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#0f172a' }}>Vendor & Purchase Orders</h2>
            <p style={{ color: '#64748b', fontSize: '0.78rem', marginTop: '2px' }}>
              Manage supplier contacts and create, track, or mark purchase orders received.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            {activeTab === 'vendors' ? (
              <button 
                className="btn-blue-primary" 
                style={{ width: 'auto', padding: '10px 20px', fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}
                onClick={() => openVendorModal()}
              >
                <Plus size={16} /> Add Vendor
              </button>
            ) : (
              <button 
                className="btn-blue-primary" 
                style={{ width: 'auto', padding: '10px 20px', fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}
                onClick={() => openOrderModal()}
              >
                <Plus size={16} /> Add Purchase Order
              </button>
            )}
          </div>
        </div>

        {/* Global Error Notice */}
        {error && (
          <div className="alert-banner error mb-4">
            <AlertTriangle size={18} />
            <span>{error}</span>
          </div>
        )}

        {/* Stats Cards */}
        <div className="stats-grid-container" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '24px' }}>
          {[
            { label: 'Total Vendors', value: totalVendors, desc: 'Active supplier profiles', color: '#fbbf24', bg: '#fffbeb', icon: <Truck size={20} /> },
            { label: 'Total Orders Created', value: totalOrders, desc: 'Overall worksheets generated', color: '#2563eb', bg: '#eff6ff', icon: <ShoppingBag size={20} /> },
            { label: 'Pending/Created Orders', value: activeOrdersCount, desc: 'Awaiting stock receipt', color: '#10b981', bg: '#ecfdf5', icon: <FileText size={18} /> }
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

        {/* Navigation Tabs */}
        <div className="navigation-tabs-container" style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', marginBottom: '20px', gap: '4px' }}>
          <button
            onClick={() => setActiveTab('orders')}
            style={{
              padding: '10px 20px',
              fontSize: '0.85rem',
              fontWeight: 600,
              color: activeTab === 'orders' ? '#2563eb' : '#64748b',
              border: 'none',
              background: 'none',
              borderBottom: activeTab === 'orders' ? '2px solid #2563eb' : '2px solid transparent',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <ShoppingBag size={16} /> Purchase Orders ({totalOrders})
          </button>
          <button
            onClick={() => setActiveTab('vendors')}
            style={{
              padding: '10px 20px',
              fontSize: '0.85rem',
              fontWeight: 600,
              color: activeTab === 'vendors' ? '#2563eb' : '#64748b',
              border: 'none',
              background: 'none',
              borderBottom: activeTab === 'vendors' ? '2px solid #2563eb' : '2px solid transparent',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <Truck size={16} /> Vendors Directory ({totalVendors})
          </button>
        </div>

        {/* Tab Content: Purchase Orders */}
        {activeTab === 'orders' && (
          <div>
            {/* Search Bar */}
            <div className="search-filter-container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div style={{ position: 'relative', flex: 1, maxWidth: '450px' }}>
                <Search size={18} style={{ position: 'absolute', left: '12px', top: '12px', color: '#94a3b8' }} />
                <input
                  type="text"
                  placeholder="Search orders by PO number, vendor..."
                  value={orderSearchQuery}
                  onChange={(e) => setOrderSearchQuery(e.target.value)}
                  style={{ 
                    paddingLeft: '40px', color: '#0f172a', background: '#ffffff', 
                    border: '1px solid #e2e8f0', borderRadius: '10px', fontSize: '0.85rem',
                    width: '100%', height: '42px', boxSizing: 'border-box'
                  }}
                />
              </div>
            </div>

            {filteredOrders.length === 0 ? (
              <div style={{ textAlign: 'center', background: '#ffffff', padding: '60px 20px', border: '1px solid #e2e8f0', borderRadius: '16px', color: '#64748b' }}>
                <ShoppingBag size={40} style={{ color: '#94a3b8', marginBottom: '12px' }} />
                <p style={{ fontWeight: 600, color: '#334155' }}>No purchase orders found</p>
                <p style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '4px' }}>Get started by creating a new purchase order sheet.</p>
              </div>
            ) : (
              <div className="data-table-container" style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.02)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                      <th style={{ padding: '14px 20px', color: '#475569', fontWeight: 600 }}>PO Number</th>
                      <th style={{ padding: '14px 20px', color: '#475569', fontWeight: 600 }}>Vendor</th>
                      <th style={{ padding: '14px 20px', color: '#475569', fontWeight: 600 }}>Total Items Quantity</th>
                      <th style={{ padding: '14px 20px', color: '#475569', fontWeight: 600 }}>Date Created</th>
                      <th style={{ padding: '14px 20px', color: '#475569', fontWeight: 600 }}>Status</th>
                      <th style={{ padding: '14px 20px', color: '#475569', fontWeight: 600, textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOrders.map(order => {
                      const totalQty = order.items?.reduce((acc, i) => acc + i.quantity, 0) || 0;
                      const formattedDate = order.createdAt 
                        ? (order.createdAt._seconds ? new Date(order.createdAt._seconds * 1000).toLocaleDateString() : new Date(order.createdAt).toLocaleDateString())
                        : '—';

                      return (
                        <tr key={order.id} style={{ borderBottom: '1px solid #f1f5f9' }} className="table-row-hover">
                          <td style={{ padding: '14px 20px', fontWeight: 600, color: '#0f172a', fontFamily: 'monospace' }}>{order.orderNumber}</td>
                          <td style={{ padding: '14px 20px', fontWeight: 600, color: '#334155' }}>{order.vendorName}</td>
                          <td style={{ padding: '14px 20px', color: '#475569', fontWeight: 600 }}>{totalQty} units</td>
                          <td style={{ padding: '14px 20px', color: '#64748b' }}>{formattedDate}</td>
                          <td style={{ padding: '14px 20px' }}>
                            <span style={{ 
                              background: order.status === 'Received' ? '#ecfdf5' : order.status === 'Partially Received' ? '#fffbeb' : '#eff6ff', 
                              color: order.status === 'Received' ? '#059669' : order.status === 'Partially Received' ? '#d97706' : '#2563eb', 
                              fontSize: '0.72rem', fontWeight: 600, padding: '2px 8px', borderRadius: '4px', textTransform: 'uppercase'
                            }}>
                              {order.status}
                            </span>
                          </td>
                          <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                            <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                              <button 
                                title="View Worksheet"
                                onClick={() => handleViewWorksheet(order)}
                                style={{ padding: '6px', borderRadius: '6px', border: '1px solid #e2e8f0', background: '#ffffff', color: '#475569', cursor: 'pointer' }}
                              >
                                <Eye size={14} />
                              </button>
                              <button 
                                title="Print Worksheet"
                                onClick={() => handlePrintWorksheet(order)}
                                style={{ padding: '6px', borderRadius: '6px', border: '1px solid #e2e8f0', background: '#ffffff', color: '#2563eb', cursor: 'pointer' }}
                              >
                                <Printer size={14} />
                              </button>
                              <button 
                                title="Edit PO"
                                onClick={() => openOrderModal(order)}
                                style={{ padding: '6px', borderRadius: '6px', border: '1px solid #e2e8f0', background: '#ffffff', color: '#10b981', cursor: 'pointer' }}
                              >
                                <Edit size={14} />
                              </button>
                              <button 
                                title="Delete PO"
                                onClick={() => triggerDeleteOrder(order)}
                                style={{ padding: '6px', borderRadius: '6px', border: '1px solid #fee2e2', background: '#fef2f2', color: '#ef4444', cursor: 'pointer' }}
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Tab Content: Vendors */}
        {activeTab === 'vendors' && (
          <div>
            {/* Search Bar */}
            <div className="search-filter-container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div style={{ position: 'relative', flex: 1, maxWidth: '450px' }}>
                <Search size={18} style={{ position: 'absolute', left: '12px', top: '12px', color: '#94a3b8' }} />
                <input
                  type="text"
                  placeholder="Search vendors by name, mobile, GST..."
                  value={vendorSearchQuery}
                  onChange={(e) => setVendorSearchQuery(e.target.value)}
                  style={{ 
                    paddingLeft: '40px', color: '#0f172a', background: '#ffffff', 
                    border: '1px solid #e2e8f0', borderRadius: '10px', fontSize: '0.85rem',
                    width: '100%', height: '42px', boxSizing: 'border-box'
                  }}
                />
              </div>
            </div>

            {filteredVendors.length === 0 ? (
              <div style={{ textAlign: 'center', background: '#ffffff', padding: '60px 20px', border: '1px solid #e2e8f0', borderRadius: '16px', color: '#64748b' }}>
                <Truck size={40} style={{ color: '#94a3b8', marginBottom: '12px' }} />
                <p style={{ fontWeight: 600, color: '#334155' }}>No vendors found</p>
                <p style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '4px' }}>Add your first vendor details to start procurement.</p>
              </div>
            ) : (
              <div className="data-table-container" style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.02)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                      <th style={{ padding: '14px 20px', color: '#475569', fontWeight: 600 }}>Supplier Name</th>
                      <th style={{ padding: '14px 20px', color: '#475569', fontWeight: 600 }}>Mobile</th>
                      <th style={{ padding: '14px 20px', color: '#475569', fontWeight: 600 }}>Address</th>
                      <th style={{ padding: '14px 20px', color: '#475569', fontWeight: 600 }}>GSTIN</th>
                      <th style={{ padding: '14px 20px', color: '#475569', fontWeight: 600 }}>Date Registered</th>
                      <th style={{ padding: '14px 20px', color: '#475569', fontWeight: 600, textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredVendors.map(v => {
                      const formattedDate = v.createdAt 
                        ? (v.createdAt._seconds ? new Date(v.createdAt._seconds * 1000).toLocaleDateString() : new Date(v.createdAt).toLocaleDateString())
                        : '—';

                      return (
                        <tr key={v.id} style={{ borderBottom: '1px solid #f1f5f9' }} className="table-row-hover">
                          <td style={{ padding: '14px 20px', fontWeight: 600, color: '#0f172a' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#fef3c7', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: '0.75rem' }}>
                                {v.name.slice(0, 2).toUpperCase()}
                              </div>
                              <span>{v.name}</span>
                            </div>
                          </td>
                          <td style={{ padding: '14px 20px', fontFamily: 'monospace', color: '#475569' }}>{v.mobile}</td>
                          <td style={{ padding: '14px 20px', color: '#64748b' }}>{v.address || '—'}</td>
                          <td style={{ padding: '14px 20px', fontFamily: 'monospace', fontWeight: 500, color: '#334155' }}>{v.gstNumber || '—'}</td>
                          <td style={{ padding: '14px 20px', color: '#64748b' }}>{formattedDate}</td>
                          <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                            <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                              <button 
                                title="Edit Vendor"
                                onClick={() => openVendorModal(v)}
                                style={{ padding: '6px', borderRadius: '6px', border: '1px solid #e2e8f0', background: '#ffffff', color: '#10b981', cursor: 'pointer' }}
                              >
                                <Edit size={14} />
                              </button>
                              <button 
                                title="Delete Vendor"
                                onClick={() => triggerDeleteVendor(v)}
                                style={{ padding: '6px', borderRadius: '6px', border: '1px solid #fee2e2', background: '#fef2f2', color: '#ef4444', cursor: 'pointer' }}
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Add / Edit Vendor Modal ─────────────────────────────────────────────── */}
      {showVendorModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '440px', background: '#ffffff', color: '#1e293b', padding: '24px', borderRadius: '16px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="modal-header" style={{ borderBottom: '1px solid rgba(0,0,0,0.08)', paddingBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#0f172a', fontSize: '1.05rem', fontWeight: 600 }}>
                <Truck size={20} style={{ color: '#2563eb' }} />
                {editingVendor ? 'Edit Supplier Profile' : 'Add New Supplier'}
              </h3>
              <button 
                type="button" 
                className="modal-close" 
                style={{ color: '#64748b', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem' }} 
                onClick={() => setShowVendorModal(false)}
              >
                ✕
              </button>
            </div>

            {vendorFormError && (
              <div className="alert-banner error mb-4" style={{ marginTop: '12px', marginBottom: 0 }}>
                <AlertTriangle size={16} />
                <span>{vendorFormError}</span>
              </div>
            )}

            <form onSubmit={handleSaveVendor} style={{ display: 'flex', flexDirection: 'column', gap: '14px', padding: '16px 0' }}>
              <div>
                <label style={{ fontSize: '0.78rem', color: '#4b5563', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                  Supplier Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Acme Wholesale Ltd"
                  value={vendorName}
                  onChange={(e) => setVendorName(e.target.value)}
                  style={{ background: '#ffffff', border: '1px solid #cbd5e1', color: '#0f172a', fontSize: '0.85rem', width: '100%', boxSizing: 'border-box', height: '40px', padding: '8px 12px', borderRadius: '8px' }}
                  required
                />
              </div>

              <div>
                <label style={{ fontSize: '0.78rem', color: '#4b5563', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                  Mobile Number *
                </label>
                <input
                  type="text"
                  placeholder="e.g. 9876543210"
                  value={vendorMobile}
                  onChange={(e) => setVendorMobile(e.target.value)}
                  style={{ background: '#ffffff', border: '1px solid #cbd5e1', color: '#0f172a', fontSize: '0.85rem', width: '100%', boxSizing: 'border-box', height: '40px', padding: '8px 12px', borderRadius: '8px' }}
                  required
                />
              </div>

              <div>
                <label style={{ fontSize: '0.78rem', color: '#4b5563', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                  GSTIN (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. 36AAAAA1111A1Z1"
                  value={vendorGst}
                  onChange={(e) => setVendorGst(e.target.value)}
                  style={{ background: '#ffffff', border: '1px solid #cbd5e1', color: '#0f172a', fontSize: '0.85rem', width: '100%', boxSizing: 'border-box', height: '40px', padding: '8px 12px', borderRadius: '8px', textTransform: 'uppercase' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.78rem', color: '#4b5563', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                  Supplier Address
                </label>
                <textarea
                  placeholder="e.g. Industrial Area, Hyderabad"
                  value={vendorAddress}
                  onChange={(e) => setVendorAddress(e.target.value)}
                  style={{ background: '#ffffff', border: '1px solid #cbd5e1', color: '#0f172a', fontSize: '0.85rem', width: '100%', boxSizing: 'border-box', minHeight: '70px', padding: '8px 12px', borderRadius: '8px', fontFamily: 'inherit' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', borderTop: '1px solid rgba(0,0,0,0.08)', paddingTop: '16px', marginTop: '10px' }}>
                <button 
                  type="button" 
                  className="btn-secondary" 
                  style={{ padding: '8px 16px', fontSize: '0.82rem', border: '1px solid #e2e8f0', background: '#ffffff', color: '#4b5563', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }} 
                  onClick={() => setShowVendorModal(false)} 
                  disabled={vendorSaving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-blue-primary"
                  style={{ width: 'auto', padding: '8px 20px', fontSize: '0.82rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}
                  disabled={vendorSaving}
                >
                  {vendorSaving ? <><Loader2 className="animate-spin" size={14} /> Saving...</> : 'Save Supplier'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Full Screen Add/Edit Purchase Order Modal (No Prices) ───────────────── */}
      {showOrderModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
          background: '#f8fafc', zIndex: 1100, display: 'flex', flexDirection: 'column',
          fontFamily: 'Inter, system-ui, sans-serif'
        }}>
          {/* Modal Header */}
          <div className="po-modal-header" style={{
            background: '#ffffff', borderBottom: '1px solid #e2e8f0', padding: '16px 24px',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '70px',
            boxSizing: 'border-box'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShoppingBag size={22} style={{ color: '#2563eb' }} />
                <h2 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: '#0f172a' }}>
                  {editingOrder ? `Edit Purchase Order (${editingOrder.orderNumber})` : 'New Purchase Order Worksheet'}
                </h2>
              </div>

              {/* Vendor Selector */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#475569' }}>Supplier:</label>
                <select
                  value={selectedVendorId}
                  onChange={(e) => setSelectedVendorId(e.target.value)}
                  style={{
                    background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '8px',
                    padding: '8px 12px', fontSize: '0.85rem', color: '#1f2937', fontWeight: 600,
                    minWidth: '220px', height: '38px', boxSizing: 'border-box', cursor: 'pointer'
                  }}
                >
                  <option value="">-- Select Vendor --</option>
                  {vendors.map(v => (
                    <option key={v.id} value={v.id}>{v.name} ({v.mobile})</option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {orderFormError && (
                <span style={{ fontSize: '0.8rem', color: '#ef4444', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <AlertTriangle size={14} /> {orderFormError}
                </span>
              )}
              <button
                onClick={handleSaveOrder}
                className="btn-blue-primary"
                style={{ width: 'auto', padding: '10px 24px', fontSize: '0.85rem', fontWeight: 600, height: '38px', display: 'flex', alignItems: 'center', gap: '6px' }}
                disabled={orderSaving}
              >
                {orderSaving ? <><Loader2 className="animate-spin" size={14} /> Saving...</> : 'Save PO Draft'}
              </button>
              <button
                onClick={() => setShowOrderModal(false)}
                style={{
                  background: 'transparent', border: '1px solid #cbd5e1', borderRadius: '8px',
                  color: '#475569', fontSize: '0.85rem', padding: '10px 16px', fontWeight: 600,
                  cursor: 'pointer', height: '38px', display: 'flex', alignItems: 'center', gap: '4px'
                }}
              >
                ✕ Close
              </button>
            </div>
          </div>

          {/* Modal Body */}
          <div className="po-modal-body" style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
            {/* Left Column: Product Directory */}
            <div className="po-modal-left-panel" style={{ width: '60%', display: 'flex', flexDirection: 'column', background: '#f8fafc', padding: '24px', borderRight: '1px solid #e2e8f0', boxSizing: 'border-box' }}>
              {/* Product Filtering Toolbar */}
              <div style={{ display: 'flex', gap: '12px', marginBottom: '18px' }}>
                <div style={{ position: 'relative', flex: 1 }}>
                  <Search size={16} style={{ position: 'absolute', left: '12px', top: '11px', color: '#94a3b8' }} />
                  <input
                    type="text"
                    placeholder="Search products by name, short code..."
                    value={productSearchQuery}
                    onChange={(e) => setProductSearchQuery(e.target.value)}
                    style={{
                      width: '100%', paddingLeft: '38px', border: '1px solid #cbd5e1',
                      borderRadius: '8px', fontSize: '0.85rem', padding: '8px 12px 8px 38px',
                      background: '#ffffff', color: '#1f2937', boxSizing: 'border-box',
                      height: '38px'
                    }}
                  />
                </div>
                {/* Custom category dropdown wrapper */}
                <CategoryDropdown
                  categories={categories}
                  value={productCategoryFilter}
                  onChange={setProductCategoryFilter}
                />
              </div>

              {/* Product Catalogue Grid */}
              <div style={{ flex: 1, overflowY: 'auto', maxHeight: 'calc(100vh - 180px)' }}>
                {filteredProducts.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px', background: '#ffffff', borderRadius: '12px', border: '1px dashed #cbd5e1', color: '#64748b' }}>
                    No products matching filter criteria.
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px' }}>
                    {filteredProducts.map(prod => {
                      const isLowStock = prod.stock <= (prod.bufferStock || 0);
                      const isSelected = selectedItems.some(it => it.productId === prod.id);

                      return (
                        <div
                          key={prod.id}
                          onClick={() => handleAddItemToOrder(prod)}
                          style={{
                            background: '#ffffff', border: isSelected ? '2px solid #2563eb' : '1px solid #e2e8f0',
                            borderRadius: '12px', padding: '16px', cursor: 'pointer', transition: 'all 0.15s ease',
                            display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.01)', position: 'relative'
                          }}
                          className="product-card-hover"
                        >
                          <div>
                            <span style={{ fontSize: '0.72rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>
                              {prod.categoryName || 'Uncategorised'}
                            </span>
                            <h4 style={{ fontSize: '0.88rem', fontWeight: 600, color: '#0f172a', margin: '4px 0 2px 0' }}>{prod.name}</h4>
                            {prod.shortCode && <code style={{ fontSize: '0.75rem', color: '#3b82f6', background: '#eff6ff', padding: '2px 6px', borderRadius: '4px' }}>{prod.shortCode}</code>}
                          </div>

                          <div style={{ marginTop: '14px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Stock Level:</span>
                              <span style={{ 
                                fontSize: '0.72rem', fontWeight: 600, 
                                color: isLowStock ? '#ef4444' : '#059669',
                                background: isLowStock ? '#fef2f2' : '#ecfdf5',
                                padding: '2px 6px', borderRadius: '4px'
                              }}>
                                {prod.stock} units
                              </span>
                            </div>
                            {isLowStock && (
                              <p style={{ margin: '6px 0 0 0', fontSize: '0.68rem', color: '#ef4444', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '3px' }}>
                                <AlertTriangle size={10} /> Low Stock (Buf: {prod.bufferStock})
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Ordered Items List & Summary */}
            <div className="po-modal-right-panel" style={{ width: '40%', display: 'flex', flexDirection: 'column', background: '#ffffff', boxSizing: 'border-box' }}>
              <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0, color: '#0f172a' }}>
                  PO Worksheet Items ({selectedItems.length})
                </h3>
                {selectedItems.length > 0 && (
                  <button 
                    onClick={() => setSelectedItems([])}
                    style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer' }}
                  >
                    Clear All
                  </button>
                )}
              </div>

              {/* Scrollable list of items */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px', maxHeight: 'calc(100vh - 260px)' }}>
                {selectedItems.length === 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#94a3b8', textAlign: 'center' }}>
                    <ShoppingBag size={36} style={{ marginBottom: '10px' }} />
                    <p style={{ fontSize: '0.85rem', margin: 0 }}>Select products from the left catalogue to add them to your PO list.</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {selectedItems.map(item => (
                      <div
                        key={item.productId}
                        style={{
                          background: '#f8fafc', border: '1px solid #e2e8f0',
                          borderRadius: '10px', padding: '12px', display: 'flex',
                          alignItems: 'center', justifyContent: 'space-between', gap: '12px'
                        }}
                      >
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <h5 style={{ fontSize: '0.82rem', fontWeight: 600, color: '#0f172a', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {item.name}
                          </h5>
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '2px' }}>
                            {item.shortCode && <span style={{ fontSize: '0.7rem', color: '#64748b', fontFamily: 'monospace' }}>{item.shortCode}</span>}
                          </div>
                        </div>

                        {/* Quantity Counter */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <button
                            onClick={() => handleUpdateItemQty(item.productId, item.quantity - 1)}
                            style={{ width: '28px', height: '28px', border: '1px solid #cbd5e1', background: '#ffffff', borderRadius: '6px', color: '#475569', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                          >
                            <Minus size={12} />
                          </button>
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => handleUpdateItemQty(item.productId, e.target.value)}
                            style={{
                              width: '50px', height: '28px', border: '1px solid #cbd5e1',
                              borderRadius: '6px', textAlign: 'center', fontSize: '0.8rem',
                              fontWeight: 600, color: '#0f172a', background: '#ffffff',
                              boxSizing: 'border-box'
                            }}
                          />
                          <button
                            onClick={() => handleUpdateItemQty(item.productId, item.quantity + 1)}
                            style={{ width: '28px', height: '28px', border: '1px solid #cbd5e1', background: '#ffffff', borderRadius: '6px', color: '#475569', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                          >
                            <Plus size={12} />
                          </button>
                        </div>

                        {/* Remove Action */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'flex-end' }}>
                          <button
                            onClick={() => handleRemoveItem(item.productId)}
                            style={{ border: 'none', background: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px' }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Order bottom summary (No Prices) */}
              <div style={{ padding: '20px 24px', borderTop: '1px solid #e2e8f0', background: '#f8fafc' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#4b5563', fontWeight: 600, fontSize: '0.9rem' }}>Total Quantity Ordered:</span>
                  <span style={{ fontWeight: 700, color: '#2563eb', fontSize: '1.1rem' }}>
                    {selectedItems.reduce((acc, i) => acc + Number(i.quantity), 0)} units
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── View Worksheet Modal (Normal Modal) ─────────────────────────────────── */}
      {showWorksheetModal && activeOrder && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '750px', background: '#ffffff', color: '#1e293b', padding: '24px', borderRadius: '16px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="modal-header" style={{ borderBottom: '1px solid rgba(0,0,0,0.08)', paddingBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#0f172a', fontSize: '1.05rem', fontWeight: 600 }}>
                <FileText size={20} style={{ color: '#2563eb' }} />
                Supplier Worksheet Detail
              </h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <button
                  onClick={() => handlePrintWorksheet(activeOrder)}
                  className="btn-blue-primary"
                  style={{ width: 'auto', padding: '6px 14px', fontSize: '0.78rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  <Printer size={12} /> Print Worksheet
                </button>
                <button 
                  type="button" 
                  className="modal-close" 
                  style={{ color: '#64748b', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem' }} 
                  onClick={() => setShowWorksheetModal(false)}
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Scrollable contents inside modal */}
            <div style={{ padding: '16px 0', fontSize: '0.85rem', color: '#334155' }}>
              {/* Business & PO information */}
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '16px' }}>
                <div>
                  <h4 style={{ fontSize: '1rem', fontWeight: 700, margin: '0 0 6px 0', color: '#0f172a' }}>{business.name}</h4>
                  <p style={{ margin: 0, color: '#64748b' }}>{business.address || 'Business address not set'}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ margin: 0, fontWeight: 700, color: '#2563eb' }}>{activeOrder.orderNumber}</p>
                  <p style={{ margin: '4px 0 0 0', color: '#64748b' }}>
                    Created: {activeOrder.createdAt ? (activeOrder.createdAt._seconds ? new Date(activeOrder.createdAt._seconds * 1000).toLocaleDateString() : new Date(activeOrder.createdAt).toLocaleDateString()) : '—'}
                  </p>
                </div>
              </div>

              {/* Vendor Information */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', background: '#f8fafc', padding: '14px', borderRadius: '10px', margin: '16px 0', border: '1px solid #e2e8f0' }}>
                <div>
                  <p style={{ margin: 0, fontWeight: 600, color: '#64748b', fontSize: '0.72rem', textTransform: 'uppercase' }}>Supplier Details</p>
                  <p style={{ margin: '6px 0 2px 0', fontWeight: 600, color: '#0f172a' }}>{activeOrder.vendorName}</p>
                  <p style={{ margin: 0, color: '#475569' }}>{activeOrder.vendorAddress || 'No Address Provided'}</p>
                </div>
                <div>
                  <p style={{ margin: 0, fontWeight: 600, color: '#64748b', fontSize: '0.72rem', textTransform: 'uppercase' }}>Contact Information</p>
                  <p style={{ margin: '6px 0 2px 0', color: '#475569' }}><strong>Mobile:</strong> {activeOrder.vendorMobile}</p>
                  {activeOrder.vendorGst && <p style={{ margin: 0, color: '#475569' }}><strong>GSTIN:</strong> {activeOrder.vendorGst}</p>}
                </div>
              </div>

              {/* Worksheet table (No Prices, display Qty and Stock Receive action) */}
              <div className="data-table-container" style={{ border: '1px solid #e2e8f0', borderRadius: '10px', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                      <th style={{ padding: '12px 14px', color: '#475569', fontWeight: 600, width: '60px' }}>S.No.</th>
                      <th style={{ padding: '12px 14px', color: '#475569', fontWeight: 600 }}>Item Name</th>
                      <th style={{ padding: '12px 14px', color: '#475569', fontWeight: 600, textAlign: 'center', width: '120px' }}>Qty Ordered</th>
                      <th style={{ padding: '12px 14px', color: '#475569', fontWeight: 600, textAlign: 'center', width: '180px' }}>Receipt Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeOrder.items?.map((item, index) => {
                      const isReceiving = !!receivingItems[item.productId];

                      return (
                        <tr key={item.productId} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '12px 14px', color: '#64748b' }}>{index + 1}</td>
                          <td style={{ padding: '12px 14px', fontWeight: 600, color: '#0f172a' }}>
                            {item.name}
                            {item.shortCode && <span style={{ fontSize: '0.72rem', color: '#64748b', display: 'block', fontWeight: 400, marginTop: '2px' }}>Code: {item.shortCode}</span>}
                          </td>
                          <td style={{ padding: '12px 14px', textAlign: 'center', fontWeight: 600, color: '#0f172a', fontSize: '0.95rem' }}>{item.quantity}</td>
                          <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                            {item.received ? (
                              <span style={{ 
                                display: 'inline-flex', alignItems: 'center', gap: '4px',
                                background: '#ecfdf5', color: '#059669', fontSize: '0.72rem', 
                                fontWeight: 600, padding: '4px 10px', borderRadius: '6px'
                              }}>
                                <CheckCircle size={12} /> Received
                              </span>
                            ) : (
                              <button
                                type="button"
                                disabled={isReceiving}
                                onClick={() => handleReceivePOItem(activeOrder.id, item.productId)}
                                style={{
                                  background: '#2563eb', color: '#ffffff', border: 'none',
                                  borderRadius: '6px', padding: '6px 12px', fontSize: '0.75rem',
                                  fontWeight: 600, cursor: 'pointer', display: 'inline-flex',
                                  alignItems: 'center', gap: '4px', transition: 'all 0.15s ease'
                                }}
                                className="receive-btn"
                              >
                                {isReceiving ? (
                                  <><Loader2 className="animate-spin" size={12} /> Processing...</>
                                ) : (
                                  'Received'
                                )}
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Total calculations (No Prices) */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
                <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '10px', border: '1px solid #e2e8f0', minWidth: '220px', boxSizing: 'border-box', textAlign: 'right' }}>
                  <span style={{ color: '#64748b', fontSize: '0.8rem' }}>Total Items Quantity:</span>
                  <h4 style={{ margin: '4px 0 0 0', fontSize: '1.2rem', fontWeight: 700, color: '#2563eb' }}>
                    {activeOrder.items?.reduce((acc, i) => acc + i.quantity, 0) || 0} units
                  </h4>
                </div>
              </div>
            </div>
            
            <div style={{ borderTop: '1px solid rgba(0,0,0,0.08)', paddingTop: '16px', display: 'flex', justifyContent: 'flex-end' }}>
              <button 
                type="button" 
                className="btn-secondary" 
                style={{ padding: '8px 16px', fontSize: '0.82rem', border: '1px solid #e2e8f0', background: '#ffffff', color: '#4b5563', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }} 
                onClick={() => setShowWorksheetModal(false)}
              >
                Close Worksheet
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Custom Styled Delete Confirmation Modal ───────────────────────────────── */}
      {showDeleteModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '400px', background: '#ffffff', color: '#1e293b', padding: '24px', borderRadius: '16px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
              <div style={{
                width: '48px', height: '48px', borderRadius: '50%', background: '#fee2e2',
                color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: '16px'
              }}>
                <AlertTriangle size={24} />
              </div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a', margin: '0 0 8px 0' }}>
                Confirm Deletion
              </h3>
              <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '0 0 20px 0', lineHeight: 1.5 }}>
                Are you sure you want to delete the {deleteType === 'vendor' ? 'supplier profile' : 'purchase order'} <strong>"{deleteTargetName}"</strong>? This action cannot be undone.
              </p>
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', borderTop: '1px solid rgba(0,0,0,0.08)', paddingTop: '16px' }}>
              <button 
                type="button" 
                className="btn-secondary" 
                style={{ padding: '10px 20px', fontSize: '0.82rem', border: '1px solid #e2e8f0', background: '#ffffff', color: '#4b5563', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, flex: 1 }} 
                onClick={() => setShowDeleteModal(false)} 
                disabled={deleting}
              >
                No, Keep it
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                style={{
                  padding: '10px 20px', fontSize: '0.82rem', border: 'none',
                  background: '#ef4444', color: '#ffffff', borderRadius: '8px',
                  cursor: 'pointer', fontWeight: 600, flex: 1, display: 'flex',
                  alignItems: 'center', justifyContent: 'center', gap: '6px'
                }}
                disabled={deleting}
              >
                {deleting ? <Loader2 className="animate-spin" size={14} /> : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Scoped CSS styling for product card hover and printing layout */}
      <style>{`
        .table-row-hover:hover {
          background-color: #f8fafc;
        }
        .product-card-hover {
          transition: transform 0.1s ease, box-shadow 0.1s ease;
        }
        .product-card-hover:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
        }
        .receive-btn:hover {
          background-color: #1d4ed8 !important;
        }
        .print-only-layout {
          display: none;
        }
        
        @media print {
          #root {
            display: none !important;
          }
          body {
            background: #ffffff !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .print-only-layout {
            display: block !important;
            width: 100% !important;
            position: absolute !important;
            top: 0 !important;
            left: 0 !important;
          }
          /* Hide standard browser print headers and footers */
          @page {
            size: auto;
            margin: 10mm;
          }
        }
      `}</style>
    </div>
  );
}
