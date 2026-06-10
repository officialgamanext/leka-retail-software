import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import JsBarcode from 'jsbarcode';
import {
  Package, Tag, Plus, Search, Trash2, Edit, X, Loader2,
  AlertTriangle, Barcode, Image as ImageIcon, ChevronDown,
  CheckCircle, RefreshCw, Upload, Eye
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL;

// ─── Utilities ────────────────────────────────────────────────────────────────
function generateBarcodeValue() {
  // 12-digit numeric barcode (EAN-12 compatible, scannable in any POS)
  const ts   = Date.now().toString().slice(-6);
  const rand = Math.floor(100000 + Math.random() * 900000).toString();
  return ts + rand;
}

function canvasToBase64(canvas) {
  return canvas.toDataURL('image/png');
}

function renderBarcodeToCanvas(value) {
  const canvas = document.createElement('canvas');
  JsBarcode(canvas, value, {
    format:      'CODE128',
    width:       2,
    height:      60,
    displayValue: true,
    fontSize:    14,
    margin:      10,
    background:  '#ffffff',
    lineColor:   '#000000'
  });
  return canvas;
}

function compressImage(base64Str, targetSizeKB = 50) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = base64Str;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;

      // Limit maximum dimension to 800px to maintain high resolution details while reducing memory footprint
      const maxDim = 800;
      if (width > maxDim || height > maxDim) {
        if (width > height) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);

      // Perform iterative JPEG compression
      let quality = 0.9;
      let resultBase64 = canvas.toDataURL('image/jpeg', quality);
      let sizeKB = (resultBase64.length * 3) / 4 / 1024;

      while (sizeKB > targetSizeKB && quality > 0.1) {
        quality -= 0.05;
        resultBase64 = canvas.toDataURL('image/jpeg', quality);
        sizeKB = (resultBase64.length * 3) / 4 / 1024;
      }

      resolve(resultBase64);
    };
    img.onerror = (err) => reject(err);
  });
}

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
    c.name.toLowerCase().includes(search.toLowerCase())
  );
  const selected    = allOptions.find(c => c.id === value) || allOptions[0];

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: '#ffffff', border: '1px solid #d1d5db', borderRadius: '8px',
          padding: '10px 14px', fontSize: '0.88rem', color: '#1f2937', cursor: 'pointer'
        }}
      >
        <span>{selected.name}</span>
        <ChevronDown size={14} style={{ color: '#9ca3af', transform: open ? 'rotate(180deg)' : 'none', transition: '0.2s' }} />
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 200,
          background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '10px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.1)', marginTop: '4px', overflow: 'hidden'
        }}>
          {/* Search within dropdown */}
          <div style={{ padding: '10px', borderBottom: '1px solid #f3f4f6' }}>
            <div style={{ position: 'relative' }}>
              <Search size={13} style={{ position: 'absolute', left: '10px', top: '10px', color: '#9ca3af' }} />
              <input
                type="text"
                autoFocus
                placeholder="Search category..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{
                  width: '100%', paddingLeft: '30px', border: '1px solid #e5e7eb',
                  borderRadius: '6px', fontSize: '0.82rem', padding: '8px 8px 8px 30px',
                  background: '#f9fafb', color: '#1f2937'
                }}
              />
            </div>
          </div>

          {/* Option list */}
          <div style={{ maxHeight: '180px', overflowY: 'auto' }}>
            {filtered.length === 0 ? (
              <div style={{ padding: '12px', textAlign: 'center', color: '#9ca3af', fontSize: '0.82rem' }}>
                No categories found
              </div>
            ) : filtered.map(cat => (
              <button
                key={cat.id}
                type="button"
                onClick={() => { onChange(cat.id, cat.name); setOpen(false); setSearch(''); }}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '10px 14px', background: value === cat.id ? '#eff6ff' : 'transparent',
                  border: 'none', cursor: 'pointer', fontSize: '0.85rem',
                  color: value === cat.id ? '#2563eb' : '#374151', textAlign: 'left'
                }}
              >
                <span>{cat.name}</span>
                {value === cat.id && <CheckCircle size={14} style={{ color: '#2563eb' }} />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Items Component ─────────────────────────────────────────────────────
function Items({ token, business }) {
  const [activeTab, setActiveTab] = useState('items'); // 'items' | 'categories'

  // ── shared headers ──
  const headers = useCallback(() => ({
    Authorization:  `Bearer ${token}`,
    'X-Business-Id': business.id
  }), [token, business.id]);

  // ────────────────────────────────────────────────────────────────────────────
  //  CATEGORIES STATE
  // ────────────────────────────────────────────────────────────────────────────
  const [categories,      setCategories]     = useState([]);
  const [catLoading,      setCatLoading]     = useState(true);
  const [catError,        setCatError]       = useState('');
  const [catSearch,       setCatSearch]      = useState('');
  const [showCatForm,     setShowCatForm]    = useState(false);
  const [newCatName,      setNewCatName]     = useState('');
  const [catSaving,       setCatSaving]      = useState(false);
  const [catFormError,    setCatFormError]   = useState('');

  // ────────────────────────────────────────────────────────────────────────────
  //  ITEMS STATE
  // ────────────────────────────────────────────────────────────────────────────
  const [items,           setItems]          = useState([]);
  const [itemLoading,     setItemLoading]    = useState(true);
  const [itemError,       setItemError]      = useState('');
  const [itemSearch,      setItemSearch]     = useState('');
  const [showItemForm,    setShowItemForm]   = useState(false);
  const [editingItem,     setEditingItem]    = useState(null);
  const [viewingItem,     setViewingItem]    = useState(null);

  // Item form fields
  const [itemName,        setItemName]       = useState('');
  const [itemShortCode,   setItemShortCode]  = useState('');
  const [itemPrice,       setItemPrice]      = useState('');
  const [itemGst,         setItemGst]        = useState(18);
  const [itemStock,       setItemStock]      = useState('');
  const [itemBufferStock, setItemBufferStock]= useState('');
  const [itemCategoryId,  setItemCategoryId] = useState('');
  const [itemCategoryName,setItemCategoryName] = useState('All Categories');
  const [itemImageFile,   setItemImageFile]  = useState(null);
  const [itemImagePreview,setItemImagePreview] = useState('');
  const [barcodeValue,    setBarcodeValue]   = useState('');
  const [barcodePreview,  setBarcodePreview] = useState('');
  const [itemSaving,      setItemSaving]     = useState(false);
  const [itemFormError,   setItemFormError]  = useState('');
  const [uploadProgress,  setUploadProgress] = useState('');

  const imageInputRef = useRef(null);

  // ── Fetch on mount / tab switch ─────────────────────────────────────────────
  useEffect(() => { fetchCategories(); fetchItems(); }, [business.id]);

  const fetchCategories = async () => {
    setCatLoading(true); setCatError('');
    try {
      const res = await axios.get(`${API_URL}/categories`, { headers: headers() });
      if (res.data.success) setCategories(res.data.categories);
    } catch (e) {
      setCatError(e.response?.data?.message || 'Failed to load categories');
    } finally { setCatLoading(false); }
  };

  const fetchItems = async () => {
    setItemLoading(true); setItemError('');
    try {
      const res = await axios.get(`${API_URL}/products`, { headers: headers() });
      if (res.data.success) setItems(res.data.products);
    } catch (e) {
      setItemError(e.response?.data?.message || 'Failed to load items');
    } finally { setItemLoading(false); }
  };

  // ────────────────────────────────────────────────────────────────────────────
  //  CATEGORY HANDLERS
  // ────────────────────────────────────────────────────────────────────────────
  const handleAddCategory = async (e) => {
    e.preventDefault();
    if (!newCatName.trim()) { setCatFormError('Category name is required'); return; }
    setCatSaving(true); setCatFormError('');
    try {
      const res = await axios.post(`${API_URL}/categories`, { name: newCatName }, { headers: headers() });
      if (res.data.success) {
        setCategories(prev => [res.data.category, ...prev]);
        setNewCatName(''); setShowCatForm(false);
      }
    } catch (e) {
      setCatFormError(e.response?.data?.message || 'Failed to add category');
    } finally { setCatSaving(false); }
  };

  const handleDeleteCategory = async (catId) => {
    if (!window.confirm('Delete this category? Items in this category will become Uncategorised.')) return;
    try {
      await axios.delete(`${API_URL}/categories/${catId}`, { headers: headers() });
      setCategories(prev => prev.filter(c => c.id !== catId));
    } catch (e) {
      alert(e.response?.data?.message || 'Failed to delete');
    }
  };

  // ────────────────────────────────────────────────────────────────────────────
  //  ITEM HANDLERS
  // ────────────────────────────────────────────────────────────────────────────
  const resetItemForm = () => {
    setItemName(''); setItemShortCode(''); setItemPrice('');
    setItemGst(18); setItemStock(0); setItemBufferStock('');
    setItemCategoryId(''); setItemCategoryName('All Categories');
    setItemImageFile(null); setItemImagePreview('');
    setBarcodeValue(''); setBarcodePreview('');
    setItemFormError(''); setUploadProgress('');
    setEditingItem(null);
  };

  const handleOpenAddItem = () => { resetItemForm(); setShowItemForm(true); };

  const handleOpenEditItem = (item) => {
    setEditingItem(item);
    setItemName(item.name || '');
    setItemShortCode(item.shortCode || '');
    setItemPrice(item.price || '');
    setItemGst(item.gstRate || 18);
    setItemStock(item.stock || 0);
    setItemBufferStock(item.bufferStock || '');
    setItemCategoryId(item.categoryId || '');
    setItemCategoryName(item.categoryName || 'All Categories');
    setItemImagePreview(item.imageUrl || '');
    setBarcodeValue(item.barcode || '');
    if (item.barcode) {
      try {
        const c = renderBarcodeToCanvas(item.barcode);
        setBarcodePreview(c.toDataURL());
      } catch {}
    }
    setItemFormError('');
    setShowItemForm(true);
  };

  const handleGenerateBarcode = () => {
    const val = generateBarcodeValue();
    setBarcodeValue(val);
    const canvas = renderBarcodeToCanvas(val);
    setBarcodePreview(canvas.toDataURL());
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadProgress('Compressing image...');
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const compressedBase64 = await compressImage(ev.target.result, 50);
        setItemImagePreview(compressedBase64);
        setItemImageFile(file);
      } catch (err) {
        console.error('Image compression failed', err);
        setItemImagePreview(ev.target.result);
        setItemImageFile(file);
      } finally {
        setUploadProgress('');
      }
    };
    reader.readAsDataURL(file);
  };

  const uploadToImageKit = async (base64, fileName, folder) => {
    const res = await axios.post(
      `${API_URL}/upload`,
      { base64, fileName, folder },
      { headers: headers() }
    );
    if (!res.data.success) throw new Error('Upload failed');
    return res.data.url;
  };

  const handleSaveItem = async (e) => {
    e.preventDefault();
    if (!itemName.trim() || !itemPrice) {
      setItemFormError('Item name and price are required');
      return;
    }
    if (!editingItem && !barcodeValue) {
      setItemFormError('Please generate a barcode before saving');
      return;
    }

    setItemSaving(true); setItemFormError(''); setUploadProgress('');

    try {
      let imageUrl   = editingItem?.imageUrl   || '';
      let barcodeImgUrl = editingItem?.barcodeImageUrl || '';

      // Upload product image if user selected one
      if (itemImageFile && itemImagePreview) {
        setUploadProgress('Uploading product image...');
        imageUrl = await uploadToImageKit(
          itemImagePreview,
          `item_${Date.now()}.png`,
          '/leka-retail/items'
        );
      }

      // Upload barcode image (only for new items or if barcode changed)
      if (!editingItem && barcodeValue && barcodePreview) {
        setUploadProgress('Uploading barcode image...');
        barcodeImgUrl = await uploadToImageKit(
          barcodePreview,
          `barcode_${barcodeValue}.png`,
          '/leka-retail/barcodes'
        );
      }

      setUploadProgress('Saving item...');

      const payload = {
        name:            itemName.trim(),
        shortCode:       itemShortCode.trim(),
        price:           Number(itemPrice),
        gstRate:         Number(itemGst),
        stock:           Number(itemStock),
        bufferStock:     Number(itemBufferStock || 0),
        categoryId:      itemCategoryId,
        categoryName:    itemCategoryName,
        barcode:         barcodeValue,
        imageUrl,
        barcodeImageUrl: barcodeImgUrl
      };

      if (editingItem) {
        const res = await axios.put(`${API_URL}/products/${editingItem.id}`, payload, { headers: headers() });
        if (res.data.success) {
          setItems(prev => prev.map(p => p.id === editingItem.id ? res.data.product : p));
          setShowItemForm(false); resetItemForm();
        }
      } else {
        const res = await axios.post(`${API_URL}/products`, payload, { headers: headers() });
        if (res.data.success) {
          setItems(prev => [res.data.product, ...prev]);
          setShowItemForm(false); resetItemForm();
        }
      }
    } catch (err) {
      setItemFormError(err.response?.data?.message || err.message || 'Failed to save item');
    } finally {
      setItemSaving(false); setUploadProgress('');
    }
  };

  const handleDeleteItem = async (id) => {
    if (!window.confirm('Delete this item? This action cannot be undone.')) return;
    try {
      await axios.delete(`${API_URL}/products/${id}`, { headers: headers() });
      setItems(prev => prev.filter(p => p.id !== id));
    } catch (e) {
      alert(e.response?.data?.message || 'Failed to delete');
    }
  };

  // ── Filtered lists ──────────────────────────────────────────────────────────
  const filteredCats  = categories.filter(c => c.name.toLowerCase().includes(catSearch.toLowerCase()));
  const filteredItems = items.filter(p =>
    p.name.toLowerCase().includes(itemSearch.toLowerCase()) ||
    (p.shortCode && p.shortCode.toLowerCase().includes(itemSearch.toLowerCase())) ||
    (p.barcode   && p.barcode.includes(itemSearch))
  );

  // ────────────────────────────────────────────────────────────────────────────
  //  RENDER
  // ────────────────────────────────────────────────────────────────────────────
  return (
    <div style={{ background: '#f8fafc', minHeight: '100%' }}>

      {/* ── Page Header ── */}
      <div style={{
        background: '#ffffff', borderBottom: '1px solid #e5e7eb',
        padding: '20px 28px', display: 'flex', alignItems: 'center', gap: '16px'
      }}>
        <Package size={22} style={{ color: '#2563eb' }} />
        <div>
          <h1 style={{ fontSize: '1.15rem', fontWeight: 600, color: '#0f172a' }}>Items</h1>
          <p style={{ fontSize: '0.78rem', color: '#9ca3af', marginTop: '2px' }}>
            {business.name} — manage your product catalogue and categories
          </p>
        </div>

        {/* Tab Switcher */}
        <div style={{
          marginLeft: 'auto', display: 'flex', background: '#f3f4f6',
          borderRadius: '10px', padding: '4px'
        }}>
          {['items', 'categories'].map(tab => (
            <button key={tab} type="button"
              onClick={() => setActiveTab(tab)}
              style={{
                padding: '7px 20px', borderRadius: '8px', border: 'none',
                fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer',
                background: activeTab === tab ? '#ffffff' : 'transparent',
                color: activeTab === tab ? '#2563eb' : '#6b7280',
                boxShadow: activeTab === tab ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
                transition: 'all 0.15s ease', textTransform: 'capitalize'
              }}
            >
              {tab === 'items' ? <><Package size={13} style={{ marginRight: '6px', verticalAlign: 'middle' }} />Items</> :
                                <><Tag size={13} style={{ marginRight: '6px', verticalAlign: 'middle' }} />Categories</>}
            </button>
          ))}
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════════════
           CATEGORIES TAB
         ════════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'categories' && (
        <div style={{
          display: 'flex', gap: 0, minHeight: 'calc(100vh - 140px)',
          transition: 'all 0.3s ease'
        }}>
          {/* Left — Category List */}
          <div style={{
            flex: 1, padding: '24px 28px',
            transition: 'all 0.3s ease'
          }}>
            {/* Search + Add Row */}
            <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', alignItems: 'center' }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <Search size={14} style={{ position: 'absolute', left: '12px', top: '11px', color: '#9ca3af' }} />
                <input
                  type="text" placeholder="Search categories..."
                  value={catSearch} onChange={e => setCatSearch(e.target.value)}
                  style={{
                    width: '100%', paddingLeft: '36px', background: '#ffffff',
                    border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '0.85rem', color: '#1f2937',
                    padding: '9px 12px 9px 36px'
                  }}
                />
              </div>
              <button
                className="btn-blue-primary"
                onClick={() => { setShowCatForm(true); setCatFormError(''); setNewCatName(''); }}
                style={{ width: 'auto', padding: '9px 16px', fontSize: '0.85rem', whiteSpace: 'nowrap' }}
              >
                <Plus size={15} /> Add Category
              </button>
            </div>

            {catError && (
              <div className="alert-banner error" style={{ marginBottom: '16px' }}>
                <AlertTriangle size={15} /><span>{catError}</span>
              </div>
            )}

            {catLoading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
                <Loader2 className="animate-spin" size={28} style={{ color: '#2563eb' }} />
              </div>
            ) : filteredCats.length === 0 ? (
              <div style={{
                background: '#ffffff', border: '2px dashed #e5e7eb', borderRadius: '12px',
                padding: '48px', textAlign: 'center'
              }}>
                <Tag size={36} style={{ color: '#d1d5db', marginBottom: '12px' }} />
                <p style={{ color: '#6b7280', fontWeight: 500 }}>No categories yet</p>
                <p style={{ color: '#9ca3af', fontSize: '0.8rem', marginTop: '4px' }}>
                  Click "Add Category" to create one
                </p>
              </div>
            ) : (
              <div style={{
                background: '#ffffff', border: '1px solid #e5e7eb',
                borderRadius: '12px', overflow: 'hidden'
              }}>
                {filteredCats.map((cat, i) => (
                  <div key={cat.id} style={{
                    display: 'flex', alignItems: 'center', gap: '14px',
                    padding: '14px 20px',
                    borderBottom: i < filteredCats.length - 1 ? '1px solid #f3f4f6' : 'none'
                  }}>
                    <div style={{
                      width: '36px', height: '36px', borderRadius: '8px',
                      background: '#eff6ff', color: '#2563eb',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                    }}>
                      <Tag size={16} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, color: '#1f2937', fontSize: '0.9rem' }}>{cat.name}</div>
                      <div style={{ fontSize: '0.72rem', color: '#9ca3af', marginTop: '2px' }}>
                        {items.filter(p => p.categoryId === cat.id).length} item(s)
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteCategory(cat.id)}
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: '#d1d5db', padding: '4px', borderRadius: '6px'
                      }}
                      onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
                      onMouseLeave={e => e.currentTarget.style.color = '#d1d5db'}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right — Add Category Form panel */}
          {showCatForm && (
            <div style={{
              width: '320px', flexShrink: 0,
              background: '#ffffff', borderLeft: '1px solid #e5e7eb',
              padding: '28px', display: 'flex', flexDirection: 'column', gap: '20px',
              animation: 'slideInRight 0.2s ease'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#0f172a' }}>New Category</h3>
                <button type="button" onClick={() => setShowCatForm(false)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af' }}>
                  <X size={18} />
                </button>
              </div>

              {catFormError && (
                <div style={{
                  background: '#fef2f2', border: '1px solid #fee2e2', borderRadius: '8px',
                  padding: '10px 12px', fontSize: '0.8rem', color: '#b91c1c',
                  display: 'flex', gap: '8px', alignItems: 'flex-start'
                }}>
                  <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: '1px' }} />{catFormError}
                </div>
              )}

              <form onSubmit={handleAddCategory} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#4b5563', display: 'block', marginBottom: '6px' }}>
                    Category Name *
                  </label>
                  <input
                    type="text" autoFocus
                    placeholder="e.g. Electronics, Groceries..."
                    value={newCatName}
                    onChange={e => setNewCatName(e.target.value)}
                    disabled={catSaving}
                    style={{
                      width: '100%', background: '#f9fafb', border: '1px solid #d1d5db',
                      borderRadius: '8px', padding: '10px 12px', fontSize: '0.88rem', color: '#1f2937'
                    }}
                    required
                  />
                </div>

                <button type="submit" className="btn-blue-primary" disabled={catSaving}>
                  {catSaving ? <><Loader2 className="animate-spin" size={15} /> Saving...</> : <><Plus size={15} /> Save Category</>}
                </button>
              </form>
            </div>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════════
           ITEMS TAB
         ════════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'items' && (
        <div style={{ display: 'flex', gap: 0, minHeight: 'calc(100vh - 140px)' }}>
          {/* Left — Items List */}
          <div style={{ flex: 1, padding: '24px 28px', overflow: 'auto' }}>
            {/* Search + Add Row */}
            <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', alignItems: 'center' }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <Search size={14} style={{ position: 'absolute', left: '12px', top: '11px', color: '#9ca3af' }} />
                <input
                  type="text" placeholder="Search by name, short code, or barcode..."
                  value={itemSearch} onChange={e => setItemSearch(e.target.value)}
                  style={{
                    width: '100%', background: '#ffffff', border: '1px solid #e5e7eb',
                    borderRadius: '8px', padding: '9px 12px 9px 36px', fontSize: '0.85rem', color: '#1f2937'
                  }}
                />
              </div>
              <button
                className="btn-blue-primary"
                onClick={handleOpenAddItem}
                style={{ width: 'auto', padding: '9px 16px', fontSize: '0.85rem', whiteSpace: 'nowrap' }}
              >
                <Plus size={15} /> Add Item
              </button>
            </div>

            {itemError && (
              <div className="alert-banner error" style={{ marginBottom: '16px' }}>
                <AlertTriangle size={15} /><span>{itemError}</span>
              </div>
            )}

            {/* Items table */}
            {itemLoading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
                <Loader2 className="animate-spin" size={28} style={{ color: '#2563eb' }} />
              </div>
            ) : filteredItems.length === 0 ? (
              <div style={{
                background: '#ffffff', border: '2px dashed #e5e7eb', borderRadius: '12px',
                padding: '48px', textAlign: 'center'
              }}>
                <Package size={36} style={{ color: '#d1d5db', marginBottom: '12px' }} />
                <p style={{ color: '#6b7280', fontWeight: 500 }}>No items yet</p>
                <p style={{ color: '#9ca3af', fontSize: '0.8rem', marginTop: '4px' }}>
                  Click "Add Item" to add your first product
                </p>
              </div>
            ) : (
              <div style={{
                background: '#ffffff', border: '1px solid #e5e7eb',
                borderRadius: '12px', overflow: 'hidden'
              }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#f9fafb' }}>
                      {['Item', 'Category', 'Short Code', 'Price', 'GST', 'Stock', 'Buffer Stock', 'Barcode', 'Actions'].map(h => (
                        <th key={h} style={{
                          padding: '12px 16px', fontSize: '0.72rem', fontWeight: 600,
                          color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.04em',
                          textAlign: 'left', borderBottom: '1px solid #f3f4f6'
                        }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredItems.map((item, i) => (
                      <tr key={item.id} style={{ borderBottom: i < filteredItems.length - 1 ? '1px solid #f3f4f6' : 'none' }}>
                        {/* Item name + image */}
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            {item.imageUrl ? (
                              <img
                                src={item.imageUrl} alt={item.name}
                                style={{ width: '36px', height: '36px', borderRadius: '6px', objectFit: 'cover', border: '1px solid #e5e7eb' }}
                              />
                            ) : (
                              <div style={{
                                width: '36px', height: '36px', borderRadius: '6px',
                                background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center'
                              }}>
                                <Package size={16} style={{ color: '#9ca3af' }} />
                              </div>
                            )}
                            <span style={{ fontWeight: 600, color: '#1f2937', fontSize: '0.88rem' }}>{item.name}</span>
                          </div>
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: '0.82rem', color: '#6b7280' }}>
                          {item.categoryName || '—'}
                        </td>
                        <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontSize: '0.82rem', color: '#374151' }}>
                          {item.shortCode || '—'}
                        </td>
                        <td style={{ padding: '12px 16px', fontWeight: 600, color: '#0f172a', fontSize: '0.88rem' }}>
                          ₹{Number(item.price).toFixed(2)}
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: '0.82rem', color: '#6b7280' }}>
                          {item.gstRate}%
                        </td>
                        <td style={{ padding: '12px 16px', fontWeight: 600,
                          color: item.stock <= 5 ? '#ef4444' : '#0f172a', fontSize: '0.85rem' }}>
                          {item.stock}
                        </td>
                        <td style={{ padding: '12px 16px', fontWeight: 600, color: '#0f172a', fontSize: '0.85rem' }}>
                          {item.bufferStock || 0}
                        </td>
                        {/* Barcode preview */}
                        <td style={{ padding: '12px 16px' }}>
                          {item.barcodeImageUrl ? (
                            <img
                              src={item.barcodeImageUrl} alt="barcode"
                              style={{ height: '32px', maxWidth: '80px', objectFit: 'contain' }}
                            />
                          ) : item.barcode ? (
                            <span style={{ fontFamily: 'monospace', fontSize: '0.72rem', color: '#9ca3af' }}>
                              {item.barcode}
                            </span>
                          ) : (
                            <span style={{ color: '#d1d5db', fontSize: '0.75rem' }}>—</span>
                          )}
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button
                              type="button"
                              onClick={() => setViewingItem(item)}
                              style={{
                                background: '#f0fdf4', border: 'none', color: '#16a34a',
                                borderRadius: '6px', padding: '5px 10px', fontSize: '0.78rem',
                                fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px'
                              }}
                            >
                              <Eye size={11} /> View
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenEditItem(item)}
                              style={{
                                background: '#eff6ff', border: 'none', color: '#2563eb',
                                borderRadius: '6px', padding: '5px 10px', fontSize: '0.78rem',
                                fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px'
                              }}
                            >
                              <Edit size={11} /> Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteItem(item.id)}
                              style={{
                                background: '#fef2f2', border: 'none', color: '#ef4444',
                                borderRadius: '6px', padding: '5px 8px', cursor: 'pointer'
                              }}
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Right — Add / Edit Item Form */}
          {showItemForm && (
            <div style={{
              width: '400px', flexShrink: 0,
              background: '#ffffff', borderLeft: '1px solid #e5e7eb',
              overflowY: 'auto', animation: 'slideInRight 0.2s ease'
            }}>
              <div style={{
                position: 'sticky', top: 0, background: '#ffffff',
                borderBottom: '1px solid #f3f4f6', padding: '18px 24px',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 10
              }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#0f172a' }}>
                  {editingItem ? 'Edit Item' : 'New Item'}
                </h3>
                <button type="button" onClick={() => { setShowItemForm(false); resetItemForm(); }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af' }}>
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSaveItem} style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>

                {itemFormError && (
                  <div style={{
                    background: '#fef2f2', border: '1px solid #fee2e2', borderRadius: '8px',
                    padding: '10px 12px', fontSize: '0.8rem', color: '#b91c1c',
                    display: 'flex', gap: '8px', alignItems: 'flex-start'
                  }}>
                    <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: '1px' }} />{itemFormError}
                  </div>
                )}

                {/* ── Item Image ── */}
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#4b5563', display: 'block', marginBottom: '8px' }}>
                    Item Image
                  </label>
                  <div
                    onClick={() => imageInputRef.current?.click()}
                    style={{
                      width: '100%', height: '120px', border: '2px dashed #d1d5db',
                      borderRadius: '10px', cursor: 'pointer', display: 'flex',
                      alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
                      background: '#f9fafb', position: 'relative'
                    }}
                  >
                    {itemImagePreview ? (
                      <img src={itemImagePreview} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ textAlign: 'center' }}>
                        <ImageIcon size={28} style={{ color: '#9ca3af', marginBottom: '6px' }} />
                        <p style={{ color: '#9ca3af', fontSize: '0.78rem' }}>Click to upload image</p>
                      </div>
                    )}
                  </div>
                  <input
                    ref={imageInputRef} type="file" accept="image/*"
                    onChange={handleImageChange} style={{ display: 'none' }}
                  />
                </div>

                {/* ── Item Name ── */}
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#4b5563', display: 'block', marginBottom: '6px' }}>
                    Item Name *
                  </label>
                  <input
                    type="text" placeholder="e.g. Parle-G Biscuit 100g"
                    value={itemName} onChange={e => setItemName(e.target.value)}
                    disabled={itemSaving} required
                    style={{
                      width: '100%', background: '#f9fafb', border: '1px solid #d1d5db',
                      borderRadius: '8px', padding: '10px 12px', fontSize: '0.88rem', color: '#1f2937'
                    }}
                  />
                </div>

                {/* ── Category Dropdown ── */}
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#4b5563', display: 'block', marginBottom: '6px' }}>
                    Category
                  </label>
                  <CategoryDropdown
                    categories={categories}
                    value={itemCategoryId}
                    onChange={(id, name) => { setItemCategoryId(id); setItemCategoryName(name); }}
                  />
                </div>

                {/* ── Short Code ── */}
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#4b5563', display: 'block', marginBottom: '6px' }}>
                    Item Short Code
                  </label>
                  <input
                    type="text" placeholder="e.g. PRLG001"
                    value={itemShortCode} onChange={e => setItemShortCode(e.target.value)}
                    disabled={itemSaving}
                    style={{
                      width: '100%', background: '#f9fafb', border: '1px solid #d1d5db',
                      borderRadius: '8px', padding: '10px 12px', fontSize: '0.88rem',
                      color: '#1f2937', fontFamily: 'monospace', textTransform: 'uppercase'
                    }}
                  />
                </div>

                {/* ── Price + GST row ── */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#4b5563', display: 'block', marginBottom: '6px' }}>
                      Price (₹) *
                    </label>
                    <input
                      type="number" step="0.01" min="0" placeholder="0.00"
                      value={itemPrice} onChange={e => setItemPrice(e.target.value)}
                      disabled={itemSaving} required
                      style={{
                        width: '100%', background: '#f9fafb', border: '1px solid #d1d5db',
                        borderRadius: '8px', padding: '10px 12px', fontSize: '0.88rem', color: '#1f2937'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#4b5563', display: 'block', marginBottom: '6px' }}>
                      GST Rate
                    </label>
                    <select
                      value={itemGst} onChange={e => setItemGst(Number(e.target.value))}
                      disabled={itemSaving}
                      style={{
                        width: '100%', background: '#f9fafb', border: '1px solid #d1d5db',
                        borderRadius: '8px', padding: '10px 12px', fontSize: '0.88rem', color: '#1f2937'
                      }}
                    >
                      {[0,5,12,18,28].map(r => <option key={r} value={r}>{r}% GST</option>)}
                    </select>
                  </div>
                </div>

                {/* ── Initial Stock + Buffer Stock row ── */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#4b5563', display: 'block', marginBottom: '6px' }}>
                      Initial Stock
                    </label>
                    <input
                      type="number" min="0" placeholder="0"
                      value={itemStock} onChange={e => setItemStock(e.target.value)}
                      disabled={itemSaving}
                      style={{
                        width: '100%', background: '#f9fafb', border: '1px solid #d1d5db',
                        borderRadius: '8px', padding: '10px 12px', fontSize: '0.88rem', color: '#1f2937'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#4b5563', display: 'block', marginBottom: '6px' }}>
                      Buffer Stock
                    </label>
                    <input
                      type="number" min="0" placeholder="0"
                      value={itemBufferStock} onChange={e => setItemBufferStock(e.target.value)}
                      disabled={itemSaving}
                      style={{
                        width: '100%', background: '#f9fafb', border: '1px solid #d1d5db',
                        borderRadius: '8px', padding: '10px 12px', fontSize: '0.88rem', color: '#1f2937'
                      }}
                    />
                  </div>
                </div>

                {/* ── Barcode Generator ── */}
                <div style={{
                  background: '#f8fafc', border: '1px solid #e5e7eb',
                  borderRadius: '10px', padding: '16px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#1f2937', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Barcode size={15} style={{ color: '#2563eb' }} />
                      Barcode {!editingItem && <span style={{ color: '#ef4444' }}>*</span>}
                    </label>
                    {!editingItem && (
                      <button
                        type="button"
                        onClick={handleGenerateBarcode}
                        style={{
                          background: barcodeValue ? '#f0fdf4' : '#2563eb',
                          color: barcodeValue ? '#16a34a' : '#ffffff',
                          border: 'none', borderRadius: '6px', padding: '5px 12px',
                          fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer',
                          display: 'flex', alignItems: 'center', gap: '5px'
                        }}
                      >
                        {barcodeValue ? <><RefreshCw size={11} /> Regenerate</> : <><Barcode size={11} /> Generate</>}
                      </button>
                    )}
                  </div>

                  {barcodePreview ? (
                    <div style={{ textAlign: 'center' }}>
                      <img src={barcodePreview} alt="barcode preview"
                        style={{ maxWidth: '100%', borderRadius: '6px', background: '#ffffff', padding: '6px' }} />
                      <p style={{ fontSize: '0.72rem', color: '#9ca3af', marginTop: '6px', fontFamily: 'monospace' }}>
                        {barcodeValue}
                      </p>
                    </div>
                  ) : (
                    <div style={{
                      textAlign: 'center', padding: '20px',
                      color: '#9ca3af', fontSize: '0.8rem'
                    }}>
                      {editingItem
                        ? 'Barcode is permanent and cannot be changed after creation'
                        : 'Click "Generate" to create a unique barcode for this item'}
                    </div>
                  )}
                </div>

                {/* Upload progress */}
                {uploadProgress && (
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    background: '#eff6ff', border: '1px solid #dbeafe',
                    borderRadius: '8px', padding: '10px 12px', fontSize: '0.8rem', color: '#2563eb'
                  }}>
                    <Loader2 className="animate-spin" size={14} />
                    {uploadProgress}
                  </div>
                )}

                {/* ── Submit ── */}
                <button
                  type="submit"
                  className="btn-blue-primary"
                  disabled={itemSaving}
                  style={{ marginTop: '4px' }}
                >
                  {itemSaving ? (
                    <><Loader2 className="animate-spin" size={15} /> {uploadProgress || 'Saving...'}</>
                  ) : (
                    <><Upload size={15} /> {editingItem ? 'Update Item' : 'Save Item'}</>
                  )}
                </button>

              </form>
            </div>
          )}
        </div>
      )}

      {/* ── View Item Modal ── */}
      {viewingItem && (
        <div className="modal-overlay" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="modal-content" style={{ background: '#ffffff', color: '#1f2937', maxWidth: '450px', borderRadius: '16px', boxShadow: '0 10px 30px rgba(0,0,0,0.1)', padding: '24px' }}>
            
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f3f4f6', paddingBottom: '12px', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Package size={18} style={{ color: '#2563eb' }} /> Item Details
              </h3>
              <button type="button" onClick={() => setViewingItem(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af' }}>
                <X size={20} />
              </button>
            </div>

            {/* Body */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', alignItems: 'center' }}>
              
              {/* Product Image */}
              {viewingItem.imageUrl ? (
                <img src={viewingItem.imageUrl} alt={viewingItem.name} style={{ width: '120px', height: '120px', borderRadius: '12px', objectFit: 'cover', border: '1px solid #e5e7eb', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }} />
              ) : (
                <div style={{ width: '120px', height: '120px', borderRadius: '12px', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #dbeafe' }}>
                  <Package size={48} style={{ color: '#2563eb' }} />
                </div>
              )}

              {/* Title & Category */}
              <div style={{ textAlign: 'center' }}>
                <h4 style={{ fontSize: '1.2rem', fontWeight: 600, color: '#0f172a' }}>{viewingItem.name}</h4>
                <span style={{ fontSize: '0.8rem', color: '#2563eb', background: '#eff6ff', padding: '3px 10px', borderRadius: '99px', display: 'inline-block', marginTop: '6px', fontWeight: 500 }}>
                  {viewingItem.categoryName || 'Uncategorised'}
                </span>
              </div>

              {/* Info Grid */}
              <div style={{ width: '100%', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #f1f5f9' }}>
                
                <div>
                  <span style={{ fontSize: '0.72rem', color: '#9ca3af', display: 'block', textTransform: 'uppercase', fontWeight: 600 }}>Short Code</span>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#374151', fontFamily: 'monospace' }}>{viewingItem.shortCode || '—'}</span>
                </div>

                <div>
                  <span style={{ fontSize: '0.72rem', color: '#9ca3af', display: 'block', textTransform: 'uppercase', fontWeight: 600 }}>Price</span>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#0f172a' }}>₹{Number(viewingItem.price).toFixed(2)}</span>
                </div>

                <div>
                  <span style={{ fontSize: '0.72rem', color: '#9ca3af', display: 'block', textTransform: 'uppercase', fontWeight: 600 }}>GST Rate</span>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#4b5563' }}>{viewingItem.gstRate || 0}%</span>
                </div>

                <div>
                  <span style={{ fontSize: '0.72rem', color: '#9ca3af', display: 'block', textTransform: 'uppercase', fontWeight: 600 }}>Buffer Stock</span>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#4b5563' }}>{viewingItem.bufferStock || 0}</span>
                </div>

                <div style={{ gridColumn: 'span 2', borderTop: '1px solid #e2e8f0', paddingTop: '10px', marginTop: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <span style={{ fontSize: '0.72rem', color: '#9ca3af', display: 'block', textTransform: 'uppercase', fontWeight: 600 }}>Current Stock</span>
                    <span style={{ fontSize: '1rem', fontWeight: 600, color: viewingItem.stock <= (viewingItem.bufferStock || 0) ? '#ef4444' : '#10b981' }}>
                      {viewingItem.stock}
                    </span>
                  </div>
                  {viewingItem.stock <= (viewingItem.bufferStock || 0) && (
                    <span style={{ fontSize: '0.72rem', color: '#ef4444', background: '#fef2f2', padding: '3px 8px', borderRadius: '6px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <AlertTriangle size={12} /> Low Stock Warning
                    </span>
                  )}
                </div>

              </div>

              {/* Barcode Section */}
              <div style={{ width: '100%', background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #f1f5f9', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '0.72rem', color: '#9ca3af', textTransform: 'uppercase', fontWeight: 600 }}>Barcode</span>
                {viewingItem.barcodeImageUrl ? (
                  <img src={viewingItem.barcodeImageUrl} alt="barcode" style={{ height: '52px', maxWidth: '100%', objectFit: 'contain' }} />
                ) : viewingItem.barcode ? (
                  <span style={{ fontFamily: 'monospace', fontSize: '0.85rem', color: '#4b5563' }}>{viewingItem.barcode}</span>
                ) : (
                  <span style={{ color: '#9ca3af', fontSize: '0.8rem' }}>No barcode generated</span>
                )}
                {viewingItem.barcode && (
                  <span style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: '#6b7280' }}>{viewingItem.barcode}</span>
                )}
              </div>

            </div>

            {/* Footer */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', borderTop: '1px solid #f3f4f6', paddingTop: '16px', marginTop: '20px' }}>
              <button type="button" onClick={() => { setViewingItem(null); handleOpenEditItem(viewingItem); }} style={{ background: '#eff6ff', border: 'none', color: '#2563eb', borderRadius: '8px', padding: '8px 16px', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Edit size={14} /> Edit Item
              </button>
              <button type="button" onClick={() => setViewingItem(null)} style={{ background: '#f3f4f6', border: 'none', color: '#4b5563', borderRadius: '8px', padding: '8px 16px', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}>
                Close
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Slide-in animation */}
      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(40px); opacity: 0; }
          to   { transform: translateX(0);   opacity: 1; }
        }
      `}</style>
    </div>
  );
}

export default Items;
