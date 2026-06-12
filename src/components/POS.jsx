import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import {
  Search, ShoppingBag, Trash2, Tag, CreditCard, Banknote,
  Landmark, Loader2, Sparkles, ReceiptText, Barcode, Eye,
  Plus, Minus, CheckCircle, Printer, AlertTriangle, Play, X, Wallet, RefreshCw,
  UserPlus, Camera, MapPin, ChevronDown, Package, Calendar
} from 'lucide-react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';

const API_URL = import.meta.env.VITE_API_URL;

// ─── Custom Category Dropdown for POS ─────────────────────────────────────────
function CategoryDropdown({ categories, value, onChange }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef(null);

  useEffect(() => {
    function handler(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const allOptions = [{ id: '', name: 'All Categories' }, ...categories];
  const filtered = allOptions.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );
  const selected = allOptions.find(c => c.id === value) || allOptions[0];

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
          position: 'absolute', top: '100%', right: 0, zIndex: 200, width: '220px',
          background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '10px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.1)', marginTop: '4px', overflow: 'hidden'
        }}>
          {/* Search within dropdown */}
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

          {/* Option list */}
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

const getProductUnit = (p) => {
  if (p.unit) return p.unit;
  const name = (p.name || '').toLowerCase();
  if (name.includes('chicken') || name.includes('pakoda') || name.includes('cafe item') || name.includes('kg') || name.includes('mutton') || name.includes('fish') || name.includes('weight') || name.includes('raw')) {
    return 'kg';
  }
  return 'pcs';
};

function POS({ token, business, printerCharacteristic, handleConnectPrinter, printerConnecting, printerDevice }) {
  // Navigation Tabs: 'barcode' | 'item' | 'history'
  const [activeTab, setActiveTab] = useState('barcode');

  // Mobile layout detection
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Mobile bottom sheet state
  const [showMobileCheckoutSheet, setShowMobileCheckoutSheet] = useState(false);

  // Master Data
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Cart State
  const [cart, setCart] = useState([]);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [discount, setDiscount] = useState(0);

  // Tab 1: Barcode Scan State
  const [scanInput, setScanInput] = useState('');
  const [showCameraSimulation, setShowCameraSimulation] = useState(false);
  const scanInputRef = useRef(null);
  const scanInputValueRef = useRef(''); // Always-fresh copy of scanInput (avoids stale state in handlers)

  // Keep a ref of products so camera scanner callbacks always see latest data
  const productsRef = useRef([]);
  useEffect(() => { productsRef.current = products; }, [products]);

  // Tab 2: Item Billing Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');

  // Tab 3: Billing History State
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historySearch, setHistorySearch] = useState('');
  const [historyDateFilterType, setHistoryDateFilterType] = useState('today'); // 'all' | 'today' | 'yesterday' | '7days' | '30days' | 'custom'
  const [historyStartDate, setHistoryStartDate] = useState('');
  const [historyEndDate, setHistoryEndDate] = useState('');

  // Modals / Overlays
  const [checkoutInvoice, setCheckoutInvoice] = useState(null);
  const [settlementBill, setSettlementBill] = useState(null); // bill to settle (either new cart or existing open invoice)
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('Cash');
  const [settleLoading, setSettleLoading] = useState(false);

  // Offline Billing & Connection State
  const [offlineBills, setOfflineBills] = useState(() => {
    return JSON.parse(localStorage.getItem(`leka_offline_bills_${business.id}`) || '[]');
  });
  const [syncing, setSyncing] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [cameraActive, setCameraActive] = useState(false);
  const [scanFeedback, setScanFeedback] = useState('');
  const [customerModalSaving, setCustomerModalSaving] = useState(false);
  const [customerModalError, setCustomerModalError] = useState('');

  // Shared Headers
  const headers = useCallback(() => ({
    Authorization: `Bearer ${token}`,
    'X-Business-Id': business.id
  }), [token, business.id]);

  // Sync manager for offline bills
  const syncOfflineBills = async () => {
    if (syncing) return;
    const cacheKey = `leka_offline_bills_${business.id}`;
    const pending = JSON.parse(localStorage.getItem(cacheKey) || '[]');
    if (pending.length === 0) return;

    setSyncing(true);
    const headersConfig = headers();
    let successCount = 0;
    const remaining = [];

    for (const bill of pending) {
      try {
        let response;
        if (bill.status === 'Settled' || bill.status === 'Open') {
          response = await axios.post(`${API_URL}/invoices`, {
            customerName: bill.customerName,
            customerPhone: bill.customerPhone,
            items: bill.items.map(it => ({
              productId: it.productId,
              quantity: it.quantity
            })),
            discount: bill.discount,
            paymentMethod: bill.paymentMethod,
            status: bill.status,
            createdAt: bill.createdAt
          }, { headers: headersConfig });
        }

        if (response && response.data.success) {
          successCount++;
        } else {
          remaining.push(bill);
        }
      } catch (err) {
        console.error('Failed to sync offline bill:', err);
        remaining.push(bill);
      }
    }

    localStorage.setItem(cacheKey, JSON.stringify(remaining));
    setOfflineBills(remaining);
    setSyncing(false);

    if (successCount > 0) {
      // Revalidate master caches
      try {
        const responseHistory = await axios.get(`${API_URL}/invoices`, { headers: headersConfig });
        if (responseHistory.data.success) {
          setHistory(responseHistory.data.invoices);
          localStorage.setItem(`leka_cache_history_${business.id}`, JSON.stringify(responseHistory.data.invoices));
        }
      } catch (err) {
        console.error(err);
      }
      try {
        const responseProducts = await axios.get(`${API_URL}/products`, { headers: headersConfig });
        if (responseProducts.data.success) {
          setProducts(responseProducts.data.products);
          localStorage.setItem(`leka_cache_products_${business.id}`, JSON.stringify(responseProducts.data.products));
        }
      } catch (err) {
        console.error(err);
      }
    }
  };

  // Sync Listeners
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      syncOfflineBills();
    };
    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      if (navigator.onLine && offlineBills.length > 0) {
        syncOfflineBills();
      }
    }, 20000); // sync check interval 20s
    return () => clearInterval(interval);
  }, [offlineBills]);

  // Fetch Master Data & Trigger Sync
  useEffect(() => {
    fetchProducts();
    fetchCategories();
    fetchHistory();
    fetchCustomerDirectory();
    if (navigator.onLine) {
      syncOfflineBills();
    }
  }, [business.id]);

  const fetchProducts = async () => {
    const cacheKey = `leka_cache_products_${business.id}`;
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      try {
        setProducts(JSON.parse(cached));
      } catch (e) {
        console.error(e);
      }
    } else {
      setLoading(true);
    }
    setError('');

    try {
      const response = await axios.get(`${API_URL}/products`, { headers: headers() });
      if (response.data.success) {
        setProducts(response.data.products);
        localStorage.setItem(cacheKey, JSON.stringify(response.data.products));
      }
    } catch (err) {
      if (!cached) {
        setError(err.response?.data?.message || 'Failed to load product list');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    const cacheKey = `leka_cache_categories_${business.id}`;
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      try {
        setCategories(JSON.parse(cached));
      } catch (e) {
        console.error(e);
      }
    }

    try {
      const response = await axios.get(`${API_URL}/categories`, { headers: headers() });
      if (response.data.success) {
        setCategories(response.data.categories);
        localStorage.setItem(cacheKey, JSON.stringify(response.data.categories));
      }
    } catch (err) {
      console.error('Failed to load categories', err);
    }
  };

  const fetchHistory = async () => {
    const cacheKey = `leka_cache_history_${business.id}`;
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      try {
        setHistory(JSON.parse(cached));
      } catch (e) {
        console.error(e);
      }
    } else {
      setHistoryLoading(true);
    }

    try {
      const response = await axios.get(`${API_URL}/invoices`, { headers: headers() });
      if (response.data.success) {
        setHistory(response.data.invoices);
        localStorage.setItem(cacheKey, JSON.stringify(response.data.invoices));
      }
    } catch (err) {
      console.error('Failed to load invoice history', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  const fetchCustomerDirectory = async () => {
    const cacheKey = `leka_cache_customers_${business.id}`;
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      try {
        setCustomerDirectory(JSON.parse(cached));
      } catch (e) {
        console.error(e);
      }
    }

    try {
      const response = await axios.get(`${API_URL}/customers`, { headers: headers() });
      if (response.data.success) {
        setCustomerDirectory(response.data.customers);
        localStorage.setItem(cacheKey, JSON.stringify(response.data.customers));
      }
    } catch (err) {
      console.error('Failed to load customer directory', err);
    }
  };

  const handleOpenAddCustomerModal = () => {
    const query = customerSearchQuery.trim();
    const isDigits = /^\d+$/.test(query);
    if (isDigits) {
      setNewCustomerPhone(query);
      setNewCustomerName('');
    } else {
      setNewCustomerPhone('');
      setNewCustomerName(query);
    }
    setNewCustomerAddress('');
    setCustomerModalError('');
    setShowAddCustomerModal(true);
    setShowCustomerDropdown(false);
  };

  const handleSaveNewCustomer = async (e) => {
    e.preventDefault();
    setCustomerModalError('');

    if (!newCustomerName.trim()) {
      setCustomerModalError('Customer name is required');
      return;
    }
    if (!newCustomerPhone.trim()) {
      setCustomerModalError('Mobile number is required');
      return;
    }

    setCustomerModalSaving(true);
    try {
      const response = await axios.post(`${API_URL}/customers`, {
        name: newCustomerName.trim(),
        phone: newCustomerPhone.trim(),
        address: newCustomerAddress.trim()
      }, { headers: headers() });

      if (response.data.success) {
        const newCust = response.data.customer;
        // Update local session array and master directory
        setLocalCustomers([newCust, ...localCustomers]);
        setCustomerDirectory([newCust, ...customerDirectory]);

        // Auto-select the newly saved customer
        setCustomerPhone(newCust.phone);
        setCustomerName(newCust.name);
        setCustomerAddress(newCust.address || '');
        setCustomerSearchQuery('');

        setShowAddCustomerModal(false);
        setNewCustomerName('');
        setNewCustomerPhone('');
        setNewCustomerAddress('');
      }
    } catch (err) {
      setCustomerModalError(err.response?.data?.message || 'Failed to save customer');
    } finally {
      setCustomerModalSaving(false);
    }
  };

  // Derived list of unique customers from customerDirectory + history + localCustomers
  const [localCustomers, setLocalCustomers] = useState([]);
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
  const [newCustomerPhone, setNewCustomerPhone] = useState('');
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerAddress, setNewCustomerAddress] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [customerDirectory, setCustomerDirectory] = useState([]);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);

  // Helper: barcode lookup — case-insensitive, strips all whitespace & control chars
  const findProductByBarcode = useCallback((rawCode) => {
    const code = rawCode.replace(/[\r\n\t\s]/g, '').toLowerCase();
    if (!code) return null;
    return productsRef.current.find(p => {
      const stored = (p.barcode || '').replace(/[\r\n\t\s]/g, '').toLowerCase();
      return stored !== '' && stored === code;
    }) || null;
  }, []);

  // Ref to always-current handleAddToCart (set during render below)
  const handleAddToCartRef = useRef(null);
  // Ref to always-current processBarcode (set during render below)
  const processBarcodeRef = useRef(null);

  // Global focus-redirect listener: when USB scanner types chars anywhere on the page,
  // redirect focus to the barcode input field so React's onChange can capture them.
  // This is simpler and more reliable than intercepting keystrokes globally.
  useEffect(() => {
    if (activeTab !== 'barcode' || cameraActive) return;

    const onKeyDown = (e) => {
      // Skip if already in the barcode input or in another input/textarea/select
      const tag = document.activeElement?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return;

      // For any printable character, focus the barcode input
      // USB scanner will continue typing into it
      if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
        scanInputRef.current?.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown, true);
    return () => document.removeEventListener('keydown', onKeyDown, true);
  }, [activeTab, cameraActive]);

  // Camera scanner logic (inline scanner)
  useEffect(() => {
    let html5QrCode;

    if (cameraActive) {
      const timer = setTimeout(() => {
        html5QrCode = new Html5Qrcode("inline-camera-reader");
        const config = {
          fps: 30,
          qrbox: (width, height) => {
            // Wide horizontal rectangle scanning region optimized for standard 1D barcodes
            return {
              width: Math.min(width * 0.85, 380),
              height: Math.min(height * 0.45, 140)
            };
          },
          aspectRatio: 1.777778, // Widescreen format to capture wide barcodes
          formatsToSupport: [
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.EAN_8,
            Html5QrcodeSupportedFormats.CODE_128,
            Html5QrcodeSupportedFormats.CODE_39,
            Html5QrcodeSupportedFormats.UPC_A,
            Html5QrcodeSupportedFormats.UPC_E,
            Html5QrcodeSupportedFormats.QR_CODE
          ],
          experimentalFeatures: {
            useBarCodeDetectorIfSupported: true // Native hardware detector for near-instant pickups
          }
        };

        let lastScannedText = "";
        let lastScannedTime = 0;

        html5QrCode.start(
          { facingMode: "environment" },
          config,
          (decodedText) => {
            const now = Date.now();
            // Debounce duplicate scans for 1500ms
            if (decodedText === lastScannedText && now - lastScannedTime < 1500) {
              return;
            }
            lastScannedText = decodedText;
            lastScannedTime = now;

            // Use processBarcodeRef to always have the latest processBarcode function
            processBarcodeRef.current && processBarcodeRef.current(decodedText);
          },
          (_errorMessage) => { /* suppress per-frame decode errors */ }
        ).catch(err => {
          console.error("Error starting camera scanner: ", err);
          alert("Could not access camera. Please ensure camera permissions are granted.");
          setCameraActive(false);
        });
      }, 300);

      return () => {
        clearTimeout(timer);
        if (html5QrCode) {
          try {
            if (html5QrCode.isScanning) {
              html5QrCode.stop().then(() => {
                html5QrCode.clear();
              }).catch(err => console.error("Error stopping scanner: ", err));
            } else {
              html5QrCode.clear();
            }
          } catch (e) {
            console.error("Error in scanner cleanup: ", e);
          }
        }
      };
    }
  }, [cameraActive, findProductByBarcode]);

  // Derived list of unique customers from customerDirectory + history + localCustomers
  const getUniqueCustomers = () => {
    const map = new Map();

    // 1. From database customers
    customerDirectory.forEach(c => {
      const phone = (c.phone || '').trim();
      const name = (c.name || '').trim();
      const address = (c.address || '').trim();
      if (phone && name) {
        map.set(phone, { name, address });
      }
    });

    // 2. From billing history
    history.forEach(inv => {
      const phone = (inv.customerPhone || '').trim();
      const name = (inv.customerName || '').trim();
      const address = (inv.customerAddress || '').trim();
      if (phone && name && name.toLowerCase() !== 'walk-in customer') {
        if (!map.has(phone)) {
          map.set(phone, { name, address });
        }
      }
    });

    // 3. From local session additions
    localCustomers.forEach(c => {
      const phone = (c.phone || '').trim();
      const name = (c.name || '').trim();
      const address = (c.address || '').trim();
      if (phone && name) {
        map.set(phone, { name, address });
      }
    });

    return Array.from(map.entries()).map(([phone, data]) => ({
      phone,
      name: data.name,
      address: data.address
    }));
  };

  const uniqueCustomers = getUniqueCustomers();
  const filteredCustomers = customerSearchQuery.trim()
    ? uniqueCustomers.filter(c =>
      c.phone.includes(customerSearchQuery.trim()) ||
      c.name.toLowerCase().includes(customerSearchQuery.toLowerCase())
    )
    : uniqueCustomers.slice(0, 10);


  // Cart Helpers
  const handleAddToCart = (product) => {
    if (product.stock <= 0) {
      alert(`Product "${product.name}" is out of stock.`);
      return;
    }

    const existing = cart.find(item => item.productId === product.id);
    const currentQty = existing ? existing.quantity : 0;

    if (currentQty >= product.stock) {
      alert(`Cannot add more. Only ${product.stock} units available in stock.`);
      return;
    }

    if (existing) {
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
  // Keep the ref always pointing to the latest version (avoids stale closures in scanner listeners)
  handleAddToCartRef.current = handleAddToCart;

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
    setCustomerAddress('');
    setCustomerSearchQuery('');
    setDiscount(0);
    setShowMobileCheckoutSheet(false);
  };

  // Calculations
  const calculateSubtotal = () => {
    return cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  };

  const calculateGst = () => {
    const activeGstRate = business.gstEnabled ? Number(business.gstPercentage || 0) : 0;
    return cart.reduce((sum, item) => {
      return sum + (((item.price * item.quantity) * activeGstRate) / 100);
    }, 0);
  };

  const subtotal = calculateSubtotal();
  const gstAmount = calculateGst();
  const grandTotal = Math.max(0, subtotal + gstAmount - Number(discount || 0));

  // Barcode lookup and add to cart helper — used by both manual input and camera scanner
  const processBarcode = useCallback((rawCode) => {
    const trimmed = rawCode.replace(/[\r\n\t]/g, '').trim();
    if (!trimmed) return;

    const matched = findProductByBarcode(trimmed);
    if (matched) {
      // Use ref to avoid stale cart state
      handleAddToCartRef.current && handleAddToCartRef.current(matched);
      setScanFeedback('OK:' + matched.name);
      setTimeout(() => setScanFeedback(''), 2500);
    } else {
      setScanFeedback('ERR:' + trimmed);
      setTimeout(() => setScanFeedback(''), 4000);
    }
    setScanInput('');
    scanInputValueRef.current = '';
    setTimeout(() => scanInputRef.current?.focus(), 30);
  }, [findProductByBarcode]);
  // Keep ref fresh so camera scanner always calls the latest version
  processBarcodeRef.current = processBarcode;

  // Handle Enter key pressed in the input (USB scanners send Enter after barcode)
  const handleScanKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      // Read directly from DOM to avoid stale React state
      const rawValue = scanInputRef.current?.value || scanInputValueRef.current || '';
      processBarcode(rawValue);
    }
  };

  // Handle form submit (button click fallback)
  const handleBarcodeSubmit = (e) => {
    e.preventDefault();
    const rawValue = scanInputRef.current?.value || scanInputValueRef.current || '';
    processBarcode(rawValue);
  };

  const handleThermalPrintReceipt = async (invoice) => {
    if (!printerCharacteristic) {
      alert("Please connect the Bluetooth Thermal Printer first using the button in the header.");
      return;
    }

    try {
      const encoder = new TextEncoder();
      const commands = [];

      // Helper to push text
      const pushText = (text) => {
        commands.push(...encoder.encode(text));
      };

      // 1. Initialize printer
      commands.push(0x1B, 0x40);

      // 2. Business Name (Center, Bold, Large)
      commands.push(0x1B, 0x61, 0x01); // Center
      commands.push(0x1B, 0x45, 0x01); // Bold On
      commands.push(0x1D, 0x21, 0x11); // Double size
      pushText(`${business.name}\n`);
      commands.push(0x1D, 0x21, 0x00); // Normal size
      commands.push(0x1B, 0x45, 0x00); // Bold Off

      // 3. Business Address
      if (business.address) {
        pushText(`${business.address}\n`);
      }
      pushText("--------------------------------\n"); // 32 chars divider

      // 4. Metadata (Left align)
      commands.push(0x1B, 0x61, 0x00); // Left align
      pushText(`Bill No: ${invoice.invoiceNumber}\n`);
      const dateVal = invoice.createdAt?._seconds
        ? new Date(invoice.createdAt._seconds * 1000)
        : new Date(invoice.createdAt);
      pushText(`Date: ${dateVal.toLocaleDateString()} ${dateVal.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}\n`);
      pushText(`Customer: ${invoice.customerName || 'Walk-in'}\n`);
      if (invoice.customerPhone) {
        pushText(`Phone: ${invoice.customerPhone}\n`);
      }
      pushText("--------------------------------\n");

      // 5. Items (Left align)
      pushText("Item Name\n");
      pushText("  Qty x Price            Total\n");
      pushText("--------------------------------\n");

      invoice.items?.forEach(item => {
        // Line 1: Item Name
        pushText(`${item.name}\n`);

        // Line 2: Details (Qty x Price and Total aligned)
        const qtyPriceStr = `  ${item.quantity} x Rs.${Number(item.price).toFixed(2)}`;
        const totalStr = `Rs.${Number(item.total).toFixed(2)}`;

        // Calculate spaces between details and total
        // Total line width is 32 characters
        const spacesCount = Math.max(1, 32 - qtyPriceStr.length - totalStr.length);
        const spaces = " ".repeat(spacesCount);

        pushText(`${qtyPriceStr}${spaces}${totalStr}\n`);
      });

      pushText("--------------------------------\n");

      // 6. Summary Totals
      const printSummaryLine = (label, amount) => {
        const valStr = `Rs.${Number(amount).toFixed(2)}`;
        const spacesCount = Math.max(1, 32 - label.length - valStr.length);
        const spaces = " ".repeat(spacesCount);
        pushText(`${label}${spaces}${valStr}\n`);
      };

      printSummaryLine("Subtotal:", invoice.subtotal || 0);
      printSummaryLine("Tax (GST):", invoice.taxAmount || 0);
      if (invoice.discount > 0) {
        printSummaryLine("Discount:", -invoice.discount);
      }
      pushText("--------------------------------\n");

      // Grand Total (Bold)
      commands.push(0x1B, 0x45, 0x01); // Bold On
      printSummaryLine("GRAND TOTAL:", invoice.grandTotal || 0);
      commands.push(0x1B, 0x45, 0x00); // Bold Off
      pushText("--------------------------------\n");

      // 7. Footer (Center)
      commands.push(0x1B, 0x61, 0x01); // Center
      pushText("Thank you for shopping!\n");
      pushText("Please visit again!\n");
      pushText(`Status: ${invoice.status === 'Open' ? 'UNSETTLED (OPEN)' : 'PAID'}\n`);

      // Feed paper 4 lines
      commands.push(0x1B, 0x64, 0x04);

      const data = new Uint8Array(commands);

      // Chunk write in 20-byte payloads to fit BLE GATT MTU limitations
      const chunkSize = 20;
      for (let offset = 0; offset < data.length; offset += chunkSize) {
        const chunk = data.slice(offset, offset + chunkSize);
        await printerCharacteristic.writeValue(chunk);
      }
    } catch (err) {
      alert(`Printing failed: ${err.message}`);
    }
  };

  // Save Bill (Open / Unsettled)
  const handleSaveBill = async () => {
    if (!customerName.trim() || !customerPhone.trim()) {
      alert('Customer is mandatory. Please search for an existing customer or add a new customer first.');
      return;
    }

    if (cart.length === 0) {
      alert('Cart is empty. Add products before saving.');
      return;
    }

    const offlineBillId = `offline_${Date.now()}`;
    const offlineBillNo = `OFF-OPEN-${Date.now().toString().slice(-6)}`;
    const subtotalLocal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const gstRateLocal = business.gstEnabled ? Number(business.gstPercentage || 0) : 0;
    const taxAmountLocal = (subtotalLocal * gstRateLocal) / 100;
    const grandTotalLocal = Math.max(0, subtotalLocal + taxAmountLocal - Number(discount));

    const offlineInvoiceObj = {
      id: offlineBillId,
      isOffline: true,
      invoiceNumber: offlineBillNo,
      customerName: customerName || 'Walk-in Customer',
      customerPhone: customerPhone || '',
      items: cart.map(item => ({
        productId: item.productId,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        total: item.price * item.quantity,
        gstRate: gstRateLocal
      })),
      discount: Number(discount),
      subtotal: subtotalLocal,
      taxAmount: taxAmountLocal,
      grandTotal: grandTotalLocal,
      paymentMethod: 'Pending',
      status: 'Open',
      createdAt: new Date().toISOString()
    };

    const cacheKey = `leka_offline_bills_${business.id}`;
    const pending = JSON.parse(localStorage.getItem(cacheKey) || '[]');
    const updatedPending = [...pending, offlineInvoiceObj];
    localStorage.setItem(cacheKey, JSON.stringify(updatedPending));
    setOfflineBills(updatedPending);

    alert(`Bill ${offlineBillNo} saved locally as Open! It will sync automatically.`);
    handleClearCart();

    if (navigator.onLine) {
      syncOfflineBills();
    }
  };

  // Open Settlement Modal
  const handleOpenSettlement = () => {
    if (!customerName.trim() || !customerPhone.trim()) {
      alert('Customer is mandatory. Please search for an existing customer or add a new customer first.');
      return;
    }

    if (cart.length === 0) {
      alert('Cart is empty. Select products to settle.');
      return;
    }
    // Set settlement data representing the new cart checkout
    setSettlementBill({
      isNew: true,
      grandTotal: grandTotal,
      customerName,
      customerPhone,
      discount: Number(discount)
    });
    setSelectedPaymentMethod('Cash');
  };

  // Settle Bill execution (POST new or PUT existing open invoice)
  const handleExecuteSettlement = async (e) => {
    e.preventDefault();
    if (!settlementBill) return;

    setSettleLoading(true);

    if (settlementBill.isNew) {
      const offlineBillId = `offline_${Date.now()}`;
      const offlineBillNo = `OFF-SETTLED-${Date.now().toString().slice(-6)}`;
      const subtotalLocal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      const gstRateLocal = business.gstEnabled ? Number(business.gstPercentage || 0) : 0;
      const taxAmountLocal = (subtotalLocal * gstRateLocal) / 100;
      const grandTotalLocal = Math.max(0, subtotalLocal + taxAmountLocal - Number(settlementBill.discount));

      const offlineInvoiceObj = {
        id: offlineBillId,
        isOffline: true,
        invoiceNumber: offlineBillNo,
        customerName: settlementBill.customerName || 'Walk-in Customer',
        customerPhone: settlementBill.customerPhone || '',
        items: cart.map(item => ({
          productId: item.productId,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          total: item.price * item.quantity,
          gstRate: gstRateLocal
        })),
        discount: Number(settlementBill.discount),
        subtotal: subtotalLocal,
        taxAmount: taxAmountLocal,
        grandTotal: grandTotalLocal,
        paymentMethod: selectedPaymentMethod,
        status: 'Settled',
        createdAt: new Date().toISOString()
      };

      const cacheKey = `leka_offline_bills_${business.id}`;
      const pending = JSON.parse(localStorage.getItem(cacheKey) || '[]');
      const updatedPending = [...pending, offlineInvoiceObj];
      localStorage.setItem(cacheKey, JSON.stringify(updatedPending));
      setOfflineBills(updatedPending);

      // Deduct stock levels locally
      const updatedProducts = products.map(p => {
        const cartItem = cart.find(it => it.productId === p.id);
        if (cartItem) {
          return { ...p, stock: Math.max(0, p.stock - cartItem.quantity) };
        }
        return p;
      });
      setProducts(updatedProducts);
      localStorage.setItem(`leka_cache_products_${business.id}`, JSON.stringify(updatedProducts));

      setCheckoutInvoice(offlineInvoiceObj);
      handleClearCart();
      setSettlementBill(null);
      setSettleLoading(false);

      if (navigator.onLine) {
        syncOfflineBills();
      }
    } else {
      // Settle an existing open bill online
      try {
        const response = await axios.put(`${API_URL}/invoices/${settlementBill.id}/settle`, {
          paymentMethod: selectedPaymentMethod
        }, { headers: headers() });

        if (response.data.success) {
          setCheckoutInvoice(response.data.invoice);
          setSettlementBill(null);
          fetchHistory();
        }
      } catch (err) {
        alert(err.response?.data?.message || 'Settlement failed. Network is offline.');
      } finally {
        setSettleLoading(false);
      }
    }
  };

  // Filtered lists for Tab 2: Item Billing
  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.shortCode && p.shortCode.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (p.barcode && p.barcode.includes(searchQuery));

    const matchesCategory = selectedCategory === '' || p.categoryId === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Filtered lists for Tab 3: History Search
  const filteredHistory = history.filter(inv => {
    // 1. Text Search Filter
    const matchesSearch =
      inv.invoiceNumber.toLowerCase().includes(historySearch.toLowerCase()) ||
      inv.customerName.toLowerCase().includes(historySearch.toLowerCase()) ||
      (inv.customerPhone && inv.customerPhone.includes(historySearch));

    if (!matchesSearch) return false;

    // 2. Date Filter
    if (historyDateFilterType === 'all') return true;

    const dateVal = inv.createdAt?._seconds
      ? new Date(inv.createdAt._seconds * 1000)
      : new Date(inv.createdAt);

    const invoiceTime = dateVal.getTime();
    const now = new Date();

    // Helper to get start of day in local time
    const getStartOfDay = (d) => {
      const copy = new Date(d);
      copy.setHours(0, 0, 0, 0);
      return copy.getTime();
    };

    // Helper to get end of day in local time
    const getEndOfDay = (d) => {
      const copy = new Date(d);
      copy.setHours(23, 59, 59, 999);
      return copy.getTime();
    };

    const startOfToday = getStartOfDay(now);
    const endOfToday = getEndOfDay(now);

    if (historyDateFilterType === 'today') {
      return invoiceTime >= startOfToday && invoiceTime <= endOfToday;
    }

    if (historyDateFilterType === 'yesterday') {
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      const startOfYesterday = getStartOfDay(yesterday);
      const endOfYesterday = getEndOfDay(yesterday);
      return invoiceTime >= startOfYesterday && invoiceTime <= endOfYesterday;
    }

    if (historyDateFilterType === '7days') {
      const sevenDaysAgo = new Date(now);
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      return invoiceTime >= getStartOfDay(sevenDaysAgo) && invoiceTime <= endOfToday;
    }

    if (historyDateFilterType === '30days') {
      const thirtyDaysAgo = new Date(now);
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      return invoiceTime >= getStartOfDay(thirtyDaysAgo) && invoiceTime <= endOfToday;
    }

    if (historyDateFilterType === 'custom') {
      if (historyStartDate) {
        const parts = historyStartDate.split('-');
        const startDateLocal = new Date(parts[0], parts[1] - 1, parts[2], 0, 0, 0, 0);
        if (invoiceTime < startDateLocal.getTime()) return false;
      }
      if (historyEndDate) {
        const parts = historyEndDate.split('-');
        const endDateLocal = new Date(parts[0], parts[1] - 1, parts[2], 23, 59, 59, 999);
        if (invoiceTime > endDateLocal.getTime()) return false;
      }
      return true;
    }

    return true;
  });

  return (
    <div style={{ padding: '24px 0', display: 'flex', flexDirection: 'column', gap: '20px', minHeight: 'calc(100vh - 70px)', background: '#f8fafc' }}>

      {/* Offline Sync Indicator Bar */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '10px 18px',
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '10px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.01)',
        fontSize: '0.8rem',
        fontWeight: 600,
        color: '#374151'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: isOnline ? '#10b981' : '#ef4444',
            display: 'inline-block'
          }}></span>
          <span>Terminal Connection: {isOnline ? 'Online' : 'Offline Mode (Local Caching)'}</span>
        </div>

        {offlineBills.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: '#d97706' }}>
            <span>⚠️ {offlineBills.length} Bill{offlineBills.length > 1 ? 's' : ''} Pending Sync</span>
            <button
              onClick={syncOfflineBills}
              disabled={syncing}
              style={{
                background: '#f59e0b',
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                padding: '6px 12px',
                fontSize: '0.75rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                height: '28px',
                transition: 'all 0.15s ease'
              }}
            >
              {syncing ? (
                <><Loader2 className="animate-spin" size={10} /> Syncing...</>
              ) : (
                'Sync Now'
              )}
            </button>
          </div>
        )}
      </div>

      {/* Tab Header & Switcher */}
      <div className="pos-header-container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e5e7eb', paddingBottom: '16px' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShoppingBag size={20} style={{ color: '#2563eb' }} /> Billing Terminal (POS)
          </h2>
          <p style={{ fontSize: '0.78rem', color: '#6b7280', marginTop: '2px' }}>
            {business.name} — register sales, scan barcodes, and settle transaction records
          </p>
        </div>

        {/* Navigation Tabs */}
        <div className="pos-tab-header" style={{ display: 'flex', background: '#f3f4f6', borderRadius: '10px', padding: '4px' }}>
          {[
            { id: 'barcode', label: 'Barcode Billing', icon: <Barcode size={13} /> },
            { id: 'item', label: 'Item Billing', icon: <Tag size={13} /> },
            { id: 'history', label: 'Billing History', icon: <ReceiptText size={13} /> }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                // Auto focus barcode input when selecting barcode tab
                if (tab.id === 'barcode') setTimeout(() => scanInputRef.current?.focus(), 100);
              }}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '8px 16px', borderRadius: '8px', border: 'none',
                fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer',
                background: activeTab === tab.id ? '#ffffff' : 'transparent',
                color: activeTab === tab.id ? '#2563eb' : '#6b7280',
                boxShadow: activeTab === tab.id ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
                transition: 'all 0.15s ease'
              }}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Layout Area */}
      <div className="pos-terminal-layout" style={{ display: 'flex', gap: isMobile ? '0' : '24px', flexGrow: 1, alignItems: 'stretch', flexDirection: isMobile ? 'column' : 'row' }}>

        {/* Left Interactive Side */}
        <div className="pos-main-panel" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {/* TAB 1: BARCODE BILLING */}
          {activeTab === 'barcode' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', flexGrow: 1 }}>

              {/* Barcode Scanner Box */}
              <div style={{ background: '#ffffff', borderRadius: '12px', padding: '24px', border: '1px solid #e5e7eb', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 600, color: '#0f172a' }}>Barcode Scanner</h4>
                    <p style={{ margin: '2px 0 0 0', fontSize: '0.75rem', color: '#6b7280' }}>
                      {cameraActive ? 'Point product barcode towards camera to add automatically' : 'Start camera scanner or type barcode manually'}
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                      type="button"
                      onClick={() => setCameraActive(!cameraActive)}
                      style={{
                        background: cameraActive ? '#ef4444' : '#2563eb',
                        color: '#ffffff',
                        padding: '10px 18px',
                        borderRadius: '8px',
                        border: 'none',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <Camera size={14} />
                      {cameraActive ? 'Stop Scanner' : 'Start Camera Scan'}
                    </button>
                    {!cameraActive && (
                      <button
                        type="button"
                        onClick={() => setShowCameraSimulation(true)}
                        style={{ background: '#eff6ff', border: 'none', color: '#2563eb', padding: '10px 14px', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                      >
                        <Play size={12} /> Simulate Scan
                      </button>
                    )}
                  </div>
                </div>

                {cameraActive ? (
                  /* Inline Live Scanner Reader Container */
                  <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={{ position: 'relative', width: '100%', maxWidth: '440px', background: '#090b11', borderRadius: '12px', overflow: 'hidden', padding: '8px', boxSizing: 'border-box' }}>
                      <div id="inline-camera-reader" style={{ width: '100%', minHeight: '260px', borderRadius: '8px', overflow: 'hidden' }}></div>
                      {/* Overlay scanning laser line */}
                      <div style={{
                        position: 'absolute', left: '8px', right: '8px', height: '2px',
                        background: '#ef4444', top: '50%', boxShadow: '0 0 10px #ef4444',
                        pointerEvents: 'none', zIndex: 10,
                        animation: 'scanLineMove 2.5s infinite ease-in-out'
                      }}></div>
                    </div>
                    {scanFeedback && (
                      <div style={{
                        width: '100%', maxWidth: '440px',
                        padding: '10px 14px', borderRadius: '8px',
                        background: scanFeedback.startsWith('ERR:') ? '#fef2f2' : '#f0fdf4',
                        color: scanFeedback.startsWith('ERR:') ? '#ef4444' : '#16a34a',
                        fontSize: '0.82rem', fontWeight: 600, textAlign: 'center', marginTop: '12px',
                        border: scanFeedback.startsWith('ERR:') ? '1px solid #fee2e2' : '1px solid #bbf7d0',
                        animation: 'fadeIn 0.2s ease'
                      }}>
                        {scanFeedback.startsWith('ERR:')
                          ? `Not found: "${scanFeedback.slice(4)}" — check product barcode`
                          : `Added to cart: ${scanFeedback.slice(3)}`
                        }
                      </div>
                    )}
                  </div>
                ) : (
                  /* Manual input / USB hardware scanner mode */
                  <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: '16px' }}>
                    <label htmlFor="scan-field" style={{ fontSize: '0.78rem', fontWeight: 500, color: '#4b5563', display: 'block', marginBottom: '6px' }}>
                      USB / Bluetooth scanner ready — or type barcode and press Enter
                    </label>
                    <form onSubmit={handleBarcodeSubmit} style={{ display: 'flex', gap: '10px' }}>
                      <div style={{ position: 'relative', flex: 1 }}>
                        <Barcode size={16} style={{ position: 'absolute', left: '12px', top: '13px', color: '#9ca3af' }} />
                        <input
                          id="scan-field"
                          ref={scanInputRef}
                          type="text"
                          placeholder="Scan barcode here (auto-focused for scanner)..."
                          value={scanInput}
                          onChange={(e) => {
                            setScanInput(e.target.value);
                            scanInputValueRef.current = e.target.value; // keep ref fresh
                          }}
                          onKeyDown={handleScanKeyDown}
                          autoFocus
                          autoComplete="off"
                          style={{ paddingLeft: '38px', background: '#f9fafb', color: '#0f172a' }}
                        />
                      </div>
                      <button type="submit" className="btn-blue-primary" style={{ width: 'auto', padding: '10px 20px', fontSize: '0.85rem' }}>
                        Add
                      </button>
                    </form>
                    {scanFeedback && (
                      <div style={{
                        marginTop: '10px',
                        padding: '10px 14px', borderRadius: '8px',
                        background: scanFeedback.startsWith('ERR:') ? '#fef2f2' : '#f0fdf4',
                        color: scanFeedback.startsWith('ERR:') ? '#ef4444' : '#16a34a',
                        fontSize: '0.82rem', fontWeight: 600,
                        border: scanFeedback.startsWith('ERR:') ? '1px solid #fee2e2' : '1px solid #bbf7d0',
                        animation: 'fadeIn 0.2s ease'
                      }}>
                        {scanFeedback.startsWith('ERR:')
                          ? `Not found: "${scanFeedback.slice(4)}" — check product barcode setup`
                          : `Added to cart: ${scanFeedback.slice(3)}`
                        }
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Scanned Cart Table */}
              <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e5e7eb', flexGrow: 1, padding: '24px' }}>
                <h3 style={{ fontSize: '0.9rem', fontWeight: 600, color: '#0f172a', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ShoppingBag size={16} style={{ color: '#2563eb' }} /> Scanned Cart Items ({cart.length})
                </h3>

                {cart.length === 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 20px', color: '#9ca3af', gap: '10px' }}>
                    <Barcode size={36} />
                    <p style={{ fontSize: '0.82rem', fontWeight: 500 }}>No items scanned yet.</p>
                    <p style={{ fontSize: '0.75rem', color: '#cbd5e1' }}>Scan a barcode or use the simulator to add items.</p>
                  </div>
                ) : (
                  <div className="data-table-container" style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                      <thead>
                        <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                          <th style={{ padding: '10px 12px', textAlign: 'left', color: '#6b7280', fontWeight: 600 }}>Item</th>
                          <th style={{ padding: '10px 12px', textAlign: 'right', color: '#6b7280', fontWeight: 600 }}>Price</th>
                          <th style={{ padding: '10px 12px', textAlign: 'center', color: '#6b7280', fontWeight: 600 }}>Quantity</th>
                          <th style={{ padding: '10px 12px', textAlign: 'right', color: '#6b7280', fontWeight: 600 }}>GST</th>
                          <th style={{ padding: '10px 12px', textAlign: 'right', color: '#6b7280', fontWeight: 600 }}>Amount</th>
                          <th style={{ padding: '10px 12px', textAlign: 'right', color: '#6b7280', fontWeight: 600 }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {cart.map((item, idx) => {
                          const activeGstRate = business.gstEnabled ? Number(business.gstPercentage || 0) : 0;
                          const itemSubtotal = item.price * item.quantity;
                          const itemTax = (itemSubtotal * activeGstRate) / 100;
                          return (
                            <tr key={item.productId} style={{ borderBottom: '1px solid #f3f4f6' }}>
                              <td style={{ padding: '12px 12px', fontWeight: 600, color: '#1f2937' }}>{item.name}</td>
                              <td style={{ padding: '12px 12px', textAlign: 'right', color: '#4b5563' }}>₹{Number(item.price).toFixed(2)}</td>
                              <td style={{ padding: '12px 12px', textAlign: 'center' }}>
                                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: '#f3f4f6', padding: '4px 8px', borderRadius: '6px' }}>
                                  <button onClick={() => handleUpdateQty(item.productId, item.quantity - 1)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#4b5563', padding: '2px' }}>
                                    <Minus size={12} />
                                  </button>
                                  <span style={{ fontWeight: 600, minWidth: '16px' }}>{item.quantity}</span>
                                  <button onClick={() => handleUpdateQty(item.productId, item.quantity + 1)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#4b5563', padding: '2px' }}>
                                    <Plus size={12} />
                                  </button>
                                </div>
                              </td>
                              <td style={{ padding: '12px 12px', textAlign: 'right', color: '#6b7280' }}>
                                {activeGstRate}% (₹{itemTax.toFixed(2)})
                              </td>
                              <td style={{ padding: '12px 12px', textAlign: 'right', fontWeight: 600, color: '#0f172a' }}>
                                ₹{(itemSubtotal + itemTax).toFixed(2)}
                              </td>
                              <td style={{ padding: '12px 12px', textAlign: 'right' }}>
                                <button onClick={() => handleRemoveFromCart(item.productId)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px' }}>
                                  <Trash2 size={14} />
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

            </div>
          )}

          {/* TAB 2: ITEM BILLING */}
          {activeTab === 'item' && (
            isMobile ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flexGrow: 1, padding: '0 4px 80px 4px' }}>
                
                {/* Mobile Search Bar */}
                <div style={{ position: 'relative', width: '100%' }}>
                  <Search size={16} style={{ position: 'absolute', left: '14px', top: '12px', color: '#9ca3af' }} />
                  <input
                    type="text"
                    placeholder="Search items..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{
                      display: 'block',
                      width: '100%',
                      boxSizing: 'border-box',
                      background: '#ffffff',
                      color: '#1f2937',
                      border: '1px solid #e2e8f0',
                      borderRadius: '24px',
                      padding: '10px 16px 10px 42px',
                      fontSize: '0.9rem',
                      height: '42px',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
                      outline: 'none'
                    }}
                  />
                </div>

                {/* Mobile Category Slider (Horizontal Scroll) */}
                <div style={{ 
                  display: 'flex', 
                  gap: '8px', 
                  overflowX: 'auto', 
                  padding: '4px 0 8px 0', 
                  scrollbarWidth: 'none',
                  msOverflowStyle: 'none'
                }} className="no-scrollbar">
                  <style>{`
                    .no-scrollbar::-webkit-scrollbar {
                      display: none;
                    }
                  `}</style>
                  {[{ id: '', name: 'All Items' }, ...categories].map(cat => {
                    const isSelected = selectedCategory === cat.id;
                    const isAllItems = cat.id === '';
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setSelectedCategory(cat.id)}
                        style={{
                          flexShrink: 0,
                          padding: '8px 18px',
                          borderRadius: '20px',
                          border: isSelected ? 'none' : '1px solid #e2e8f0',
                          background: isSelected ? '#2563eb' : '#ffffff', // primary blue
                          color: isSelected ? '#ffffff' : '#374151',
                          fontWeight: 600,
                          fontSize: '0.8rem',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        {isAllItems ? 'All Items' : cat.name}
                      </button>
                    );
                  })}
                </div>

                {/* Mobile 3-column Items Grid */}
                <div style={{ flexGrow: 1, overflowY: 'auto', maxHeight: 'calc(100vh - 260px)' }} className="no-scrollbar">
                  {loading ? (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
                      <Loader2 className="animate-spin" size={24} style={{ color: '#2563eb' }} />
                    </div>
                  ) : filteredProducts.length === 0 ? (
                    <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e5e7eb', textAlign: 'center', padding: '36px', color: '#6b7280' }}>
                      <Package size={30} style={{ color: '#cbd5e1', marginBottom: '8px' }} />
                      <p style={{ fontWeight: 500, fontSize: '0.85rem' }}>No products found</p>
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                      {filteredProducts.map(p => {
                        const cartItem = cart.find(item => item.productId === p.id);
                        const isAdded = !!cartItem;
                        const isOutOfStock = p.stock <= 0;
                        const unit = getProductUnit(p);

                        return (
                          <div
                            key={p.id}
                            onClick={() => !isOutOfStock && !isAdded && handleAddToCart(p)}
                            style={{
                              background: '#ffffff',
                              border: isAdded ? '2px solid #2563eb' : '1px solid #e2e8f0',
                              borderRadius: '16px',
                              display: 'flex',
                              flexDirection: 'column',
                              padding: '6px',
                              position: 'relative',
                              opacity: isOutOfStock ? 0.5 : 1,
                              cursor: isOutOfStock ? 'not-allowed' : 'pointer',
                              boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
                              transition: 'all 0.2s ease',
                              boxSizing: 'border-box'
                            }}
                          >
                            {/* Selected count badge at top-right */}
                            {isAdded && (
                              <div style={{
                                position: 'absolute',
                                top: '6px',
                                right: '6px',
                                background: '#2563eb',
                                color: '#ffffff',
                                borderRadius: '50%',
                                width: '20px',
                                height: '20px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '0.75rem',
                                fontWeight: 'bold',
                                zIndex: 5
                              }}>
                                {cartItem.quantity}
                              </div>
                            )}

                            {/* Product Image */}
                            <div style={{ 
                              width: '100%', 
                              height: '70px', 
                              borderRadius: '12px', 
                              background: '#f8fafc', 
                              display: 'flex', 
                              alignItems: 'center', 
                              justifyContent: 'center', 
                              overflow: 'hidden',
                              marginBottom: '6px'
                            }}>
                              {p.imageUrl ? (
                                <img src={p.imageUrl} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              ) : (
                                <Package size={20} style={{ color: '#cbd5e1' }} />
                              )}
                            </div>

                            {/* Product Title */}
                            <div style={{ 
                              fontSize: '0.75rem', 
                              fontWeight: 600, 
                              color: '#475569', 
                              textAlign: 'left',
                              padding: '0 4px',
                              lineHeight: '1.2',
                              minHeight: '2.4em',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical'
                            }}>
                              {p.name}
                            </div>

                            {/* Product Price & Unit */}
                            <div style={{ 
                              fontSize: '0.75rem', 
                              fontWeight: 600, 
                              color: '#2563eb', 
                              textAlign: 'left',
                              padding: '2px 4px 6px 4px'
                            }}>
                              ₹{Number(p.price).toFixed(0)}<span style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: 500 }}>/{unit}</span>
                            </div>

                            {/* Quantity Controls Overlay if added */}
                            {isAdded && (
                              <div style={{ 
                                marginTop: 'auto',
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'space-between',
                                border: '1px solid #2563eb',
                                borderRadius: '8px',
                                padding: '2px',
                                background: '#ffffff'
                              }}>
                                <button 
                                  type="button" 
                                  onClick={(e) => { 
                                    e.stopPropagation(); 
                                    handleUpdateQty(p.id, cartItem.quantity - 1); 
                                  }} 
                                  style={{ 
                                    background: 'none', 
                                    border: 'none', 
                                    color: '#2563eb', 
                                    cursor: 'pointer', 
                                    padding: '4px', 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    justifyContent: 'center',
                                    flex: 1
                                  }}
                                >
                                  <Minus size={12} strokeWidth={2.5} />
                                </button>
                                <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#2563eb', padding: '0 4px' }}>
                                  {cartItem.quantity}
                                </span>
                                <button 
                                  type="button" 
                                  onClick={(e) => { 
                                    e.stopPropagation(); 
                                    handleUpdateQty(p.id, cartItem.quantity + 1); 
                                  }} 
                                  style={{ 
                                    background: 'none', 
                                    border: 'none', 
                                    color: '#2563eb', 
                                    cursor: 'pointer', 
                                    padding: '4px', 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    justifyContent: 'center',
                                    flex: 1
                                  }}
                                >
                                  <Plus size={12} strokeWidth={2.5} />
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', flexGrow: 1 }}>

                {/* Filter controls row */}
                <div style={{ display: 'flex', gap: '12px', background: '#ffffff', padding: '16px 20px', borderRadius: '12px', border: '1px solid #cbd5e1', alignItems: 'center' }}>
                  <div style={{ position: 'relative', flex: 1 }}>
                    <Search size={14} style={{ position: 'absolute', left: '12px', top: '12px', color: '#4b5563' }} />
                    <input
                      type="text"
                      placeholder="Search item by name or short code..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      style={{ display: 'block', width: '100%', boxSizing: 'border-box', background: '#ffffff', color: '#0f172a', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '10px 12px 10px 36px', fontSize: '0.85rem' }}
                    />
                  </div>

                  <CategoryDropdown
                    categories={categories}
                    value={selectedCategory}
                    onChange={(id) => setSelectedCategory(id)}
                  />
                </div>

                {/* Items Card Grid */}
                <div style={{ flexGrow: 1, minHeight: '300px', maxHeight: '420px', overflowY: 'auto' }}>
                  {loading ? (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
                      <Loader2 className="animate-spin" size={28} style={{ color: '#2563eb' }} />
                    </div>
                  ) : filteredProducts.length === 0 ? (
                    <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e5e7eb', textAlign: 'center', padding: '48px', color: '#6b7280' }}>
                      <Package size={36} style={{ color: '#cbd5e1', marginBottom: '12px' }} />
                      <p style={{ fontWeight: 500 }}>No products found matching criteria</p>
                    </div>
                  ) : (
                    <div className="pos-products-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '16px' }}>
                      {filteredProducts.map(p => {
                        const cartItem = cart.find(item => item.productId === p.id);
                        const isAdded = !!cartItem;
                        const isOutOfStock = p.stock <= 0;

                        return (
                          <div
                            key={p.id}
                            onClick={() => !isOutOfStock && handleAddToCart(p)}
                            className="pos-product-card"
                            style={{
                              background: '#ffffff', border: isAdded ? '2px solid #2563eb' : '1px solid #e5e7eb',
                              borderRadius: '12px', display: 'flex', flexDirection: 'column',
                              transition: 'all 0.2s ease', position: 'relative', opacity: isOutOfStock ? 0.6 : 1,
                              cursor: isOutOfStock ? 'not-allowed' : 'pointer'
                            }}
                          >
                            {/* Image Placeholder */}
                            <div className="pos-prod-img-wrapper" style={{ width: '100%', height: '80px', borderRadius: '8px', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                              {p.imageUrl ? (
                                <img src={p.imageUrl} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              ) : (
                                <Package size={24} style={{ color: '#cbd5e1' }} />
                              )}
                            </div>

                            <div>
                              <div className="pos-prod-name" style={{ fontSize: '0.8rem', fontWeight: 600, color: '#1f2937', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', height: '2.4em', lineHeight: '1.2' }}>
                                {p.name}
                              </div>
                              <span style={{ fontSize: '0.68rem', color: '#9ca3af' }}>{p.categoryName || 'General'}</span>
                            </div>

                            <div className="pos-prod-meta" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
                              <span style={{ fontWeight: 600, fontSize: '0.88rem', color: '#0f172a' }}>₹{Number(p.price).toFixed(2)}</span>
                              <span style={{ fontSize: '0.7rem', color: p.stock <= 5 ? '#ef4444' : '#6b7280', fontWeight: 500 }}>
                                {isOutOfStock ? 'No Stock' : `Qty: ${p.stock}`}
                              </span>
                            </div>

                            {/* Add/Plus/Minus buttons overlay */}
                            <div style={{ marginTop: '4px' }}>
                              {isOutOfStock ? (
                                <button className="pos-prod-add-btn oos" disabled style={{ width: '100%', background: '#cbd5e1', border: 'none', color: '#ffffff', padding: '6px', borderRadius: '6px', fontSize: '0.72rem', cursor: 'not-allowed', fontWeight: 600 }}>
                                  <span>Out of Stock</span>
                                </button>
                              ) : isAdded ? (
                                <div className="pos-prod-qty-wrapper" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '6px', padding: '4px' }}>
                                  <button type="button" onClick={(e) => { e.stopPropagation(); handleUpdateQty(p.id, cartItem.quantity - 1); }} style={{ background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', padding: '2px', display: 'flex' }}>
                                    <Minus size={12} />
                                  </button>
                                  <span className="pos-prod-qty-badge" style={{ fontSize: '0.75rem', fontWeight: 600, color: '#2563eb' }}>{cartItem.quantity}</span>
                                  <button type="button" onClick={(e) => { e.stopPropagation(); handleUpdateQty(p.id, cartItem.quantity + 1); }} style={{ background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', padding: '2px', display: 'flex' }}>
                                    <Plus size={12} />
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); handleAddToCart(p); }}
                                  className="pos-prod-add-btn"
                                  style={{ width: '100%', background: '#2563eb', border: 'none', color: '#ffffff', padding: '6px', borderRadius: '6px', fontSize: '0.72rem', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                                >
                                  <Plus size={11} /> <span>Select Item</span>
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Selected List details */}
                <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e5e7eb', padding: '16px 24px' }}>
                  <h3 style={{ fontSize: '0.85rem', fontWeight: 600, color: '#0f172a', marginBottom: '10px' }}>
                    Billing items checklist:
                  </h3>
                  {cart.length === 0 ? (
                    <span style={{ fontSize: '0.78rem', color: '#9ca3af' }}>Select products above to build invoice.</span>
                  ) : (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {cart.map(item => (
                        <span key={item.productId} style={{ fontSize: '0.75rem', background: '#f1f5f9', border: '1px solid #e2e8f0', color: '#475569', padding: '4px 10px', borderRadius: '6px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                          <strong>{item.quantity}x</strong> {item.name}
                          <button onClick={() => handleRemoveFromCart(item.productId)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#ef4444', fontSize: '0.9rem', padding: 0 }}>×</button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

              </div>
            )
          )}

          {/* TAB 3: BILLING HISTORY */}
          {activeTab === 'history' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', flexGrow: 1 }}>

              {/* History Search bar */}
              <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '12px',
                background: '#ffffff',
                padding: '16px 20px',
                borderRadius: '12px',
                border: '1px solid #cbd5e1',
                alignItems: 'center'
              }}>
                <div style={{ position: 'relative', flex: '1 1 240px' }}>
                  <Search size={14} style={{ position: 'absolute', left: '12px', top: '11px', color: '#9ca3af' }} />
                  <input
                    type="text"
                    placeholder="Search historical bills by Invoice No. or Client info..."
                    value={historySearch}
                    onChange={(e) => setHistorySearch(e.target.value)}
                    style={{ background: '#ffffff', color: '#0f172a', fontSize: '0.85rem', padding: '8px 12px 8px 36px', width: '100%', border: '1px solid #cbd5e1', borderRadius: '8px', outline: 'none', boxSizing: 'border-box', height: '36px' }}
                  />
                </div>

                {/* Date Filter */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <Calendar size={14} style={{ position: 'absolute', left: '10px', color: '#64748b', pointerEvents: 'none' }} />
                    <select
                      value={historyDateFilterType}
                      onChange={(e) => setHistoryDateFilterType(e.target.value)}
                      style={{
                        paddingLeft: '30px',
                        paddingRight: '12px',
                        paddingTop: '8px',
                        paddingBottom: '8px',
                        background: '#ffffff',
                        border: '1px solid #cbd5e1',
                        borderRadius: '8px',
                        fontSize: '0.8rem',
                        fontWeight: 500,
                        color: '#1e293b',
                        cursor: 'pointer',
                        outline: 'none',
                        height: '36px',
                        boxSizing: 'border-box'
                      }}
                    >
                      <option value="all">All Time</option>
                      <option value="today">Today</option>
                      <option value="yesterday">Yesterday</option>
                      <option value="7days">Last 7 Days</option>
                      <option value="30days">Last 30 Days</option>
                      <option value="custom">Custom Range</option>
                    </select>
                  </div>

                  {historyDateFilterType === 'custom' && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                      <input
                        type="date"
                        value={historyStartDate}
                        onChange={(e) => setHistoryStartDate(e.target.value)}
                        style={{
                          padding: '6px 10px',
                          background: '#ffffff',
                          border: '1px solid #cbd5e1',
                          borderRadius: '8px',
                          fontSize: '0.8rem',
                          color: '#1e293b',
                          outline: 'none',
                          height: '36px',
                          boxSizing: 'border-box'
                        }}
                      />
                      <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 500 }}>to</span>
                      <input
                        type="date"
                        value={historyEndDate}
                        onChange={(e) => setHistoryEndDate(e.target.value)}
                        style={{
                          padding: '6px 10px',
                          background: '#ffffff',
                          border: '1px solid #cbd5e1',
                          borderRadius: '8px',
                          fontSize: '0.8rem',
                          color: '#1e293b',
                          outline: 'none',
                          height: '36px',
                          boxSizing: 'border-box'
                        }}
                      />
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={fetchHistory}
                  style={{ background: 'none', border: '1px solid #cbd5e1', color: '#4b5563', padding: '8px 14px', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', height: '36px', boxSizing: 'border-box', marginLeft: 'auto' }}
                >
                  <RefreshCw size={12} /> Refresh
                </button>
              </div>

              {/* History Data Table */}
              <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e5e7eb', flexGrow: 1, padding: '24px' }}>
                {historyLoading ? (
                  <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
                    <Loader2 className="animate-spin" size={28} style={{ color: '#2563eb' }} />
                  </div>
                ) : filteredHistory.length === 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 20px', color: '#9ca3af', gap: '10px' }}>
                    <ReceiptText size={36} />
                    <p style={{ fontSize: '0.82rem', fontWeight: 500 }}>No billing history found.</p>
                  </div>
                ) : (
                  <div className="data-table-container" style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                      <thead>
                        <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                          <th style={{ padding: '10px 12px', textAlign: 'left', color: '#6b7280', fontWeight: 600 }}>Bill Number</th>
                          <th style={{ padding: '10px 12px', textAlign: 'left', color: '#6b7280', fontWeight: 600 }}>Date</th>
                          <th style={{ padding: '10px 12px', textAlign: 'left', color: '#6b7280', fontWeight: 600 }}>Customer Name</th>
                          <th style={{ padding: '10px 12px', textAlign: 'left', color: '#6b7280', fontWeight: 600 }}>Status</th>
                          <th style={{ padding: '10px 12px', textAlign: 'left', color: '#6b7280', fontWeight: 600 }}>Method</th>
                          <th style={{ padding: '10px 12px', textAlign: 'right', color: '#6b7280', fontWeight: 600 }}>Grand Total</th>
                          <th style={{ padding: '10px 12px', textAlign: 'center', color: '#6b7280', fontWeight: 600 }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredHistory.map((inv) => {
                          const dateVal = inv.createdAt?._seconds
                            ? new Date(inv.createdAt._seconds * 1000)
                            : new Date(inv.createdAt);
                          const isOpen = inv.status === 'Open';

                          return (
                            <tr key={inv.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                              <td style={{ padding: '10px 12px', fontWeight: 600, color: '#2563eb' }}>{inv.invoiceNumber}</td>
                              <td style={{ padding: '10px 12px', color: '#6b7280' }}>{dateVal.toLocaleDateString()}</td>
                              <td style={{ padding: '10px 12px', color: '#1f2937' }}>{inv.customerName}</td>
                              <td style={{ padding: '10px 12px' }}>
                                <span style={{
                                  fontSize: '0.7rem', padding: '2px 8px', borderRadius: '99px', fontWeight: 600,
                                  background: isOpen ? '#fffbeb' : '#ecfdf5',
                                  color: isOpen ? '#d97706' : '#10b981',
                                  border: isOpen ? '1px solid #fde68a' : '1px solid #a7f3d0'
                                }}>
                                  {inv.status || 'Settled'}
                                </span>
                              </td>
                              <td style={{ padding: '10px 12px', color: '#4b5563' }}>{inv.paymentMethod}</td>
                              <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600, color: '#0f172a' }}>
                                ₹{Number(inv.grandTotal).toFixed(2)}
                              </td>
                              <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                                <div style={{ display: 'inline-flex', gap: '6px' }}>
                                  {isOpen && (
                                    <button
                                      onClick={() => {
                                        setSettlementBill({
                                          id: inv.id,
                                          isNew: false,
                                          grandTotal: inv.grandTotal,
                                          customerName: inv.customerName,
                                          customerPhone: inv.customerPhone
                                        });
                                        setSelectedPaymentMethod('Cash');
                                        if (isMobile) {
                                          setShowMobileCheckoutSheet(true);
                                        }
                                      }}
                                      style={{ background: '#10b981', border: 'none', color: '#ffffff', borderRadius: '4px', padding: '4px 10px', fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer' }}
                                    >
                                      Settle Bill
                                    </button>
                                  )}
                                  <button
                                    onClick={() => setCheckoutInvoice(inv)}
                                    style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', color: '#475569', borderRadius: '4px', padding: '4px 8px', fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                                  >
                                    <Eye size={12} /> View Bill
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

            </div>
          )}

        </div>

        {/* Right Billing Details Side (Applicable for both Barcode & Item Billing tabs) */}
        {activeTab !== 'history' && !isMobile && (
          <div className="pos-sidebar-panel" style={{ width: '360px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '20px' }}>

            {/* Customer Details block */}
            <div style={{ background: '#ffffff', borderRadius: '12px', padding: '24px', border: '1px solid #e5e7eb', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <h3 style={{ fontSize: '0.9rem', fontWeight: 600, color: '#0f172a', borderBottom: '1px solid #f3f4f6', paddingBottom: '10px' }}>
                Customer Information
              </h3>

              {customerPhone ? (
                /* Selected customer information preview card */
                <div style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  padding: '12px 14px',
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px'
                }}>
                  {/* Avatar circle using pastel color scheme matching initials */}
                  <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    width: '36px', height: '36px', borderRadius: '50%',
                    background: '#eff6ff', color: '#2563eb', fontWeight: 600, fontSize: '0.82rem'
                  }}>
                    {customerName ? customerName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : 'C'}
                  </div>

                  {/* Selected customer attributes */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1, paddingRight: '20px' }}>
                    <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#0f172a' }}>
                      {customerName || 'Walk-in Customer'}
                    </span>
                    <span style={{ fontSize: '0.74rem', color: '#4b5563', fontFamily: 'monospace' }}>
                      {customerPhone}
                    </span>
                    {customerAddress && (
                      <span style={{ fontSize: '0.7rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                        <MapPin size={10} style={{ color: '#94a3b8' }} /> {customerAddress}
                      </span>
                    )}
                  </div>

                  {/* Reset/Clear button */}
                  <button
                    type="button"
                    onClick={() => {
                      setCustomerPhone('');
                      setCustomerName('');
                      setCustomerAddress('');
                      setCustomerSearchQuery('');
                    }}
                    style={{
                      position: 'absolute', top: '10px', right: '10px',
                      background: 'none', border: 'none', cursor: 'pointer',
                      color: '#9ca3af', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}
                    title="Change Customer"
                  >
                    <X size={16} />
                  </button>
                </div>
              ) : (
                /* Unified Customer Search Input & suggestions dropdown */
                <div style={{ position: 'relative' }}>
                  <label htmlFor="cust-search" style={{ fontSize: '0.78rem', color: '#4b5563', fontWeight: 500, display: 'block', marginBottom: '6px' }}>
                    Search Customer <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Search size={14} style={{ position: 'absolute', left: '10px', top: '12px', color: '#9ca3af' }} />
                    <input
                      id="cust-search"
                      type="text"
                      placeholder="Type name or mobile number..."
                      value={customerSearchQuery}
                      onChange={(e) => {
                        setCustomerSearchQuery(e.target.value);
                        setShowCustomerDropdown(true);
                      }}
                      onFocus={() => setShowCustomerDropdown(true)}
                      onBlur={() => {
                        // Delay dropdown close to registerMouseDown clicks
                        setTimeout(() => setShowCustomerDropdown(false), 200);
                      }}
                      style={{
                        paddingLeft: '34px', background: '#f9fafb', color: '#0f172a',
                        fontSize: '0.85rem', width: '100%', boxSizing: 'border-box',
                        height: '38px', borderRadius: '8px', border: '1px solid #cbd5e1'
                      }}
                    />
                  </div>
                  <div style={{ marginTop: '6px', color: '#ef4444', fontSize: '0.72rem', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span>⚠️ Customer is required before checking out</span>
                  </div>

                  {showCustomerDropdown && (
                    <div style={{
                      position: 'absolute', top: '100%', left: 0, right: 0,
                      background: '#ffffff', border: '1px solid #cbd5e1',
                      borderRadius: '8px', boxShadow: '0 4px 10px rgba(0,0,0,0.08)',
                      zIndex: 50, marginTop: '4px', maxHeight: '220px', overflowY: 'auto'
                    }}>
                      {/* Suggestion list */}
                      {filteredCustomers.length > 0 ? (
                        filteredCustomers.map((cust, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onMouseDown={() => {
                              setCustomerPhone(cust.phone);
                              setCustomerName(cust.name);
                              setCustomerAddress(cust.address || '');
                              setCustomerSearchQuery('');
                              setShowCustomerDropdown(false);
                            }}
                            style={{
                              width: '100%', padding: '10px 12px', border: 'none',
                              background: 'none', textAlign: 'left', cursor: 'pointer',
                              fontSize: '0.8rem', display: 'flex', flexDirection: 'column',
                              borderBottom: '1px solid #f1f5f9', gap: '2px'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'}
                            onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                          >
                            <span style={{ fontWeight: 600, color: '#1e293b' }}>{cust.name}</span>
                            <span style={{ fontSize: '0.72rem', color: '#64748b', fontFamily: 'monospace' }}>{cust.phone}</span>
                            {cust.address && (
                              <span style={{ fontSize: '0.68rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '3px' }}>
                                <MapPin size={10} /> {cust.address}
                              </span>
                            )}
                          </button>
                        ))
                      ) : (
                        <div style={{ padding: '12px', textAlign: 'center', fontSize: '0.78rem', color: '#64748b' }}>
                          No matching customers found
                        </div>
                      )}

                      {/* Sticky Add Customer Button inside dropdown */}
                      <button
                        type="button"
                        onMouseDown={handleOpenAddCustomerModal}
                        style={{
                          width: '100%', padding: '10px 12px', border: 'none',
                          background: '#f0fdf4', color: '#15803d', textAlign: 'left',
                          cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600,
                          display: 'flex', alignItems: 'center', gap: '6px',
                          borderTop: '1px solid #dcfce7', position: 'sticky', bottom: 0
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = '#dcfce7'}
                        onMouseLeave={(e) => e.currentTarget.style.background = '#f0fdf4'}
                      >
                        <UserPlus size={14} /> + Add New Customer
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Selected Items / Cart List block */}
            <div style={{ background: '#ffffff', borderRadius: '12px', padding: '20px 24px', border: '1px solid #e5e7eb', maxHeight: '280px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <h3 style={{ fontSize: '0.9rem', fontWeight: 600, color: '#0f172a', borderBottom: '1px solid #f3f4f6', paddingBottom: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: 0 }}>
                <span>Selected Items</span>
                <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>({cart.length})</span>
              </h3>

              {cart.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '20px', color: '#9ca3af', fontSize: '0.8rem' }}>
                  No items in cart
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {cart.map((item) => (
                    <div key={item.productId} style={{ display: 'flex', flexDirection: 'column', gap: '6px', borderBottom: '1px solid #f3f4f6', paddingBottom: '10px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#1f2937' }}>{item.name}</span>
                        <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#0f172a' }}>
                          ₹{((item.price * item.quantity) + (((item.price * item.quantity) * (business.gstEnabled ? Number(business.gstPercentage || 0) : 0)) / 100)).toFixed(2)}
                        </span>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.72rem', color: '#6b7280' }}>
                          ₹{Number(item.price).toFixed(2)} each
                        </span>

                        {/* Plus / Minus / Input Controls */}
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                          <button
                            type="button"
                            onClick={() => handleUpdateQty(item.productId, item.quantity - 1)}
                            style={{ border: '1px solid #cbd5e1', background: '#ffffff', borderRadius: '4px', cursor: 'pointer', color: '#4b5563', padding: '3px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                          >
                            <Minus size={10} />
                          </button>

                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => {
                              const val = parseInt(e.target.value) || 0;
                              handleUpdateQty(item.productId, val);
                            }}
                            style={{
                              width: '40px',
                              textAlign: 'center',
                              border: '1px solid #cbd5e1',
                              borderRadius: '4px',
                              padding: '2px 0',
                              fontSize: '0.78rem',
                              background: '#ffffff',
                              color: '#0f172a',
                              height: '22px'
                            }}
                          />

                          <button
                            type="button"
                            onClick={() => handleUpdateQty(item.productId, item.quantity + 1)}
                            style={{ border: '1px solid #cbd5e1', background: '#ffffff', borderRadius: '4px', cursor: 'pointer', color: '#4b5563', padding: '3px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                          >
                            <Plus size={10} />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleRemoveFromCart(item.productId)}
                            style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#ef4444', padding: '2px', marginLeft: '4px', display: 'flex', alignItems: 'center' }}
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Bill Summary block */}
            <div style={{ background: '#ffffff', borderRadius: '12px', padding: '24px', border: '1px solid #e5e7eb', flexGrow: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <h3 style={{ fontSize: '0.9rem', fontWeight: 600, color: '#0f172a', borderBottom: '1px solid #f3f4f6', paddingBottom: '10px' }}>
                Billing Summary
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.85rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#4b5563' }}>
                  <span>Cart Items Count</span>
                  <span style={{ fontWeight: 600 }}>{cart.reduce((sum, item) => sum + item.quantity, 0)} item(s)</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#4b5563' }}>
                  <span>Subtotal</span>
                  <span style={{ fontWeight: 600 }}>₹{subtotal.toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#4b5563' }}>
                  <span>GST Amount</span>
                  <span style={{ fontWeight: 600 }}>₹{gstAmount.toFixed(2)}</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px dashed #e5e7eb', paddingTop: '10px', marginTop: '4px' }}>
                  <span style={{ color: '#4b5563' }}>Discount (₹)</span>
                  <input
                    type="number"
                    min="0"
                    placeholder="0.00"
                    value={discount}
                    onChange={(e) => setDiscount(Math.max(0, Number(e.target.value)))}
                    style={{ width: '100px', textAlign: 'right', padding: '6px 10px', fontSize: '0.82rem', background: '#f9fafb', color: '#0f172a' }}
                  />
                </div>
              </div>

              {/* Grand Total */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #e5e7eb', paddingTop: '14px', marginTop: 'auto' }}>
                <span style={{ fontSize: '1rem', fontWeight: 600, color: '#0f172a' }}>Grand Total</span>
                <span style={{ fontSize: '1.25rem', fontWeight: 600, color: '#2563eb' }}>₹{grandTotal.toFixed(2)}</span>
              </div>

              {/* Save & Settle Button Actions */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '12px' }}>
                <button
                  type="button"
                  onClick={handleOpenSettlement}
                  disabled={cart.length === 0}
                  style={{ background: '#2563eb', border: 'none', color: '#ffffff', borderRadius: '8px', padding: '12px', fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                >
                  <CheckCircle size={16} /> Settle & Pay
                </button>
                <button
                  type="button"
                  onClick={handleSaveBill}
                  disabled={cart.length === 0}
                  style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', color: '#475569', borderRadius: '8px', padding: '10px', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}
                >
                  Save Bill (Keep Open)
                </button>
              </div>

            </div>

          </div>
        )}

      </div>

      {/* MODAL 1: CAMERA SCAN SIMULATOR */}
      {showCameraSimulation && (
        <div className="modal-overlay" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="modal-content" style={{ background: '#ffffff', color: '#1f2937', maxWidth: '420px', borderRadius: '16px', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f3f4f6', paddingBottom: '12px', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Barcode size={16} style={{ color: '#2563eb' }} /> Simulate Barcode Scan
              </h3>
              <button onClick={() => setShowCameraSimulation(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af' }}>
                <X size={20} />
              </button>
            </div>

            {/* Simulating animation */}
            <div style={{ height: '140px', background: '#090b11', borderRadius: '8px', position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '10px', color: '#ffffff', marginBottom: '16px' }}>
              {/* Scan laser line */}
              <div style={{ position: 'absolute', left: 0, right: 0, height: '2px', background: '#ef4444', top: '50%', boxShadow: '0 0 10px #ef4444', animation: 'scanLineMove 2s infinite ease-in-out' }}></div>
              <Barcode size={48} style={{ opacity: 0.6 }} />
              <span style={{ fontSize: '0.72rem', color: '#94a3b8', zIndex: 2 }}>PULSING SCAN LASER...</span>
            </div>

            <p style={{ fontSize: '0.8rem', color: '#6b7280', marginBottom: '12px' }}>
              Select a catalog product below to simulate a barcode scanner read event:
            </p>

            <div style={{ maxHeight: '180px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '6px' }}>
              {products.length === 0 ? (
                <span style={{ fontSize: '0.8rem', color: '#9ca3af', padding: '12px', textAlign: 'center' }}>No products in database</span>
              ) : products.filter(p => p.barcode).map(p => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    handleAddToCart(p);
                    setShowCameraSimulation(false);
                    // focus scan field back
                    setTimeout(() => scanInputRef.current?.focus(), 100);
                  }}
                  style={{ width: '100%', padding: '8px 10px', border: 'none', background: '#f8fafc', borderRadius: '6px', cursor: 'pointer', textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', color: '#374151' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#eff6ff'}
                  onMouseLeave={e => e.currentTarget.style.background = '#f8fafc'}
                >
                  <span style={{ fontWeight: 600 }}>{p.name}</span>
                  <span style={{ fontFamily: 'monospace', color: '#9ca3af', fontSize: '0.72rem' }}>{p.barcode}</span>
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
              <button onClick={() => setShowCameraSimulation(false)} className="btn-secondary" style={{ padding: '8px 16px', fontSize: '0.82rem' }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: SETTLEMENT / PAYMENT POPUP */}
      {settlementBill && !isMobile && (
        <div className="modal-overlay" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <form onSubmit={handleExecuteSettlement} className="modal-content" style={{ background: '#ffffff', color: '#1f2937', maxWidth: '420px', borderRadius: '16px', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f3f4f6', paddingBottom: '12px', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Wallet size={18} style={{ color: '#10b981' }} /> Settle Bill Payments
              </h3>
              <button type="button" onClick={() => setSettlementBill(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af' }} disabled={settleLoading}>
                <X size={20} />
              </button>
            </div>

            {/* Bill summary details */}
            <div style={{ background: '#f8fafc', borderRadius: '10px', padding: '14px', border: '1px solid #f1f5f9', marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.82rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#6b7280' }}>Customer</span>
                <span style={{ fontWeight: 600, color: '#1f2937' }}>{settlementBill.customerName || 'Walk-in Customer'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#6b7280' }}>Payable Amount</span>
                <span style={{ fontSize: '1.1rem', fontWeight: 600, color: '#10b981' }}>₹{Number(settlementBill.grandTotal).toFixed(2)}</span>
              </div>
            </div>

            {/* Payment Methods selection */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#4b5563' }}>Select Settlement Mode</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                {[
                  { id: 'Cash', label: 'Cash', icon: <Banknote size={16} /> },
                  { id: 'UPI', label: 'UPI', icon: <Sparkles size={16} /> },
                  { id: 'Card', label: 'Card', icon: <CreditCard size={16} /> }
                ].map(mode => (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() => setSelectedPaymentMethod(mode.id)}
                    style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px',
                      padding: '14px 10px', borderRadius: '10px', cursor: 'pointer',
                      border: selectedPaymentMethod === mode.id ? '2px solid #10b981' : '1px solid #cbd5e1',
                      background: selectedPaymentMethod === mode.id ? '#f0fdf4' : '#ffffff',
                      color: selectedPaymentMethod === mode.id ? '#15803d' : '#475569',
                      fontWeight: 600, fontSize: '0.8rem', transition: 'all 0.15s ease'
                    }}
                  >
                    {mode.icon} {mode.label}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button type="button" onClick={() => setSettlementBill(null)} className="btn-secondary" style={{ padding: '10px 16px', fontSize: '0.85rem' }} disabled={settleLoading}>
                Cancel
              </button>
              <button type="submit" className="btn btn-success" style={{ background: '#10b981', color: '#ffffff', border: 'none', padding: '10px 20px', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }} disabled={settleLoading}>
                {settleLoading ? <><Loader2 className="animate-spin" size={14} /> Settle...</> : <><CheckCircle size={14} /> Complete Settlement</>}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL 3: INVOICE / RECEIPT DETAILS POPUP (FOR PRINTING / VIEWING) */}
      {checkoutInvoice && (
        <div className="modal-overlay" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="modal-content" style={{ maxWidth: '380px', width: '90%', background: '#f8fafc', color: '#1e293b', padding: '24px', borderRadius: '16px', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(0,0,0,0.08)', paddingBottom: '12px', marginBottom: '16px', flexShrink: 0 }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#0f172a', fontSize: '1rem', fontWeight: 600 }}>
                <ReceiptText size={18} style={{ color: '#10b981' }} /> Sales Invoice Receipt
              </h3>
              <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }} onClick={() => setCheckoutInvoice(null)}>
                ✕
              </button>
            </div>

            {/* Print Friendly Format with scrolling items list inside */}
            <div className="receipt-wrapper" style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px', overflowY: 'auto', flexGrow: 1, minHeight: 0 }}>
              <div style={{ textAlign: 'center', borderBottom: '1px dashed #cbd5e1', paddingBottom: '10px', marginBottom: '10px' }}>
                <h2 style={{ fontSize: '1.1rem', fontWeight: 600, margin: 0, color: '#0f172a' }}>{business.name}</h2>
                <p style={{ fontSize: '0.7rem', color: '#64748b', margin: '4px 0 0 0' }}>{business.address}</p>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: '#475569', marginBottom: '4px' }}>
                <span>Bill No: <strong>{checkoutInvoice.invoiceNumber}</strong></span>
                <span>Date: {new Date(checkoutInvoice.createdAt?._seconds ? checkoutInvoice.createdAt._seconds * 1000 : checkoutInvoice.createdAt).toLocaleDateString()}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: '#475569', marginBottom: '10px' }}>
                <span>Customer: {checkoutInvoice.customerName}</span>
                <span>{checkoutInvoice.customerPhone && `Mob: ${checkoutInvoice.customerPhone}`}</span>
              </div>

              <div style={{ borderTop: '1px dashed #cbd5e1', margin: '8px 0' }}></div>

              {/* Items List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {checkoutInvoice.items?.map((item, idx) => (
                  <div key={idx} style={{ fontSize: '0.75rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600, color: '#1f2937' }}>
                      <span>{item.name}</span>
                      <span>₹{item.total.toFixed(2)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', fontSize: '0.68rem' }}>
                      <span>₹{item.price.toFixed(2)} x {item.quantity} units</span>
                      <span>GST: {item.gstRate}%</span>
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ borderTop: '1px dashed #cbd5e1', margin: '10px 0' }}></div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.75rem', color: '#475569' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Subtotal:</span>
                  <span>₹{checkoutInvoice.subtotal?.toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Tax (GST):</span>
                  <span>₹{checkoutInvoice.taxAmount?.toFixed(2)}</span>
                </div>
                {checkoutInvoice.discount > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#ef4444' }}>
                    <span>Discount:</span>
                    <span>-₹{checkoutInvoice.discount?.toFixed(2)}</span>
                  </div>
                )}
              </div>

              <div style={{ borderTop: '1px dashed #cbd5e1', margin: '10px 0' }}></div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.95rem', fontWeight: 600, color: '#0f172a' }}>
                <span>GRAND TOTAL:</span>
                <span>₹{checkoutInvoice.grandTotal?.toFixed(2)}</span>
              </div>

              <div style={{ borderTop: '1px dashed #cbd5e1', margin: '8px 0' }}></div>
              <div style={{ display: 'flex', justifyContent: 'center', fontSize: '0.7rem', color: '#475569', fontWeight: 600 }}>
                Status: {checkoutInvoice.status === 'Open' ? 'UNSETTLED (OPEN)' : `PAID via ${checkoutInvoice.paymentMethod}`}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px', flexShrink: 0 }}>
              {printerCharacteristic ? (
                <button
                  type="button"
                  className="btn btn-success"
                  style={{ background: '#10b981', color: '#ffffff', border: 'none', fontSize: '0.8rem', padding: '8px 14px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}
                  onClick={() => handleThermalPrintReceipt(checkoutInvoice)}
                >
                  <Printer size={12} /> Print Thermal
                </button>
              ) : (
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', fontSize: '0.8rem', padding: '8px 14px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}
                  onClick={() => alert("Please connect the Bluetooth printer from the top bar first.")}
                >
                  <Printer size={12} /> Print Thermal (Disconnected)
                </button>
              )}
              <button
                type="button"
                className="btn btn-success"
                style={{ background: '#2563eb', border: 'none', color: '#ffffff', fontSize: '0.8rem', padding: '8px 14px', cursor: 'pointer' }}
                onClick={() => setCheckoutInvoice(null)}
              >
                Close Bill
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ADD NEW CUSTOMER */}
      {showAddCustomerModal && (
        <div className="modal-overlay" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <form onSubmit={handleSaveNewCustomer} className="modal-content" style={{ background: '#ffffff', color: '#1f2937', maxWidth: '400px', borderRadius: '16px', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f3f4f6', paddingBottom: '12px', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <UserPlus size={18} style={{ color: '#2563eb' }} /> Add New Customer
              </h3>
              <button type="button" onClick={() => setShowAddCustomerModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af' }} disabled={customerModalSaving}>
                <X size={20} />
              </button>
            </div>

            {customerModalError && (
              <div className="alert-banner error mb-4" style={{ marginTop: '4px', marginBottom: '12px' }}>
                <AlertTriangle size={16} />
                <span>{customerModalError}</span>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '0.78rem', color: '#4b5563', fontWeight: 500, display: 'block', marginBottom: '4px' }}>
                  Customer Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. John Doe"
                  value={newCustomerName}
                  onChange={(e) => setNewCustomerName(e.target.value)}
                  autoFocus
                  style={{ background: '#ffffff', border: '1px solid #cbd5e1', color: '#0f172a', fontSize: '0.85rem', width: '100%', boxSizing: 'border-box', height: '40px', padding: '8px 12px', borderRadius: '8px' }}
                  required
                  disabled={customerModalSaving}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.78rem', color: '#4b5563', fontWeight: 500, display: 'block', marginBottom: '4px' }}>
                  Mobile Number *
                </label>
                <input
                  type="text"
                  placeholder="e.g. 9876543210"
                  value={newCustomerPhone}
                  onChange={(e) => setNewCustomerPhone(e.target.value)}
                  style={{ background: '#ffffff', border: '1px solid #cbd5e1', color: '#0f172a', fontSize: '0.85rem', width: '100%', boxSizing: 'border-box', height: '40px', padding: '8px 12px', borderRadius: '8px' }}
                  required
                  disabled={customerModalSaving}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.78rem', color: '#4b5563', fontWeight: 500, display: 'block', marginBottom: '4px' }}>
                  Address
                </label>
                <textarea
                  placeholder="e.g. Plot 42, Hitech City, Hyderabad"
                  value={newCustomerAddress}
                  onChange={(e) => setNewCustomerAddress(e.target.value)}
                  style={{ background: '#ffffff', border: '1px solid #cbd5e1', color: '#0f172a', fontSize: '0.85rem', width: '100%', boxSizing: 'border-box', minHeight: '80px', padding: '8px 12px', borderRadius: '8px', fontFamily: 'inherit' }}
                  disabled={customerModalSaving}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px', borderTop: '1px solid #f3f4f6', paddingTop: '16px' }}>
              <button type="button" onClick={() => setShowAddCustomerModal(false)} className="btn-secondary" style={{ padding: '8px 16px', fontSize: '0.82rem', border: '1px solid #cbd5e1', color: '#4b5563', background: '#ffffff', borderRadius: '8px', cursor: 'pointer' }} disabled={customerModalSaving}>
                Cancel
              </button>
              <button
                type="submit"
                className="btn-blue-primary"
                style={{ width: 'auto', padding: '8px 20px', fontSize: '0.82rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}
                disabled={customerModalSaving}
              >
                {customerModalSaving ? <><Loader2 className="animate-spin" size={14} /> Saving...</> : 'Save Customer'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Mobile Floating Checkout Bar */}
      {isMobile && cart.length > 0 && activeTab !== 'history' && (
        <div style={{
          position: 'fixed',
          bottom: '20px',
          left: '16px',
          right: '16px',
          background: '#2563eb', // primary blue
          borderRadius: '24px',
          padding: '12px 18px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxShadow: '0 8px 30px rgba(37, 99, 235, 0.3)', // blue shadow
          zIndex: 90,
          animation: 'slideUp 0.3s ease-out'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              background: 'rgba(255, 255, 255, 0.2)',
              borderRadius: '12px',
              width: '40px',
              height: '40px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <ShoppingBag size={20} style={{ color: '#ffffff' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '0.7rem', color: '#bfdbfe', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                {cart.reduce((sum, item) => sum + item.quantity, 0)} Items
              </span>
              <span style={{ fontSize: '1.2rem', color: '#ffffff', fontWeight: 'bold' }}>
                ₹{grandTotal.toFixed(0)}
              </span>
            </div>
          </div>
          
          <button
            type="button"
            onClick={() => {
              setSettlementBill({
                isNew: true,
                grandTotal: grandTotal,
                customerName: customerName || '',
                customerPhone: customerPhone || '',
                discount: Number(discount)
              });
              setSelectedPaymentMethod('Cash');
              setShowMobileCheckoutSheet(true);
            }}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#ffffff',
              fontSize: '1rem',
              fontWeight: 'bold',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            Checkout <span style={{ fontSize: '1.2rem', lineHeight: 1 }}>&rsaquo;</span>
          </button>
        </div>
      )}

      {/* Mobile Bottom Sheet Order Summary Modal */}
      {isMobile && showMobileCheckoutSheet && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.4)',
          backdropFilter: 'blur(4px)',
          zIndex: 100,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end',
          animation: 'fadeIn 0.2s ease-out'
        }}>
          <div style={{
            background: '#ffffff',
            borderTopLeftRadius: '28px',
            borderTopRightRadius: '28px',
            padding: '20px 16px 24px 16px',
            maxHeight: '92vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 -10px 40px rgba(0,0,0,0.15)',
            animation: 'slideUpSheet 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
            boxSizing: 'border-box'
          }}>
            {/* Drag Indicator */}
            <div style={{
              width: '40px',
              height: '4px',
              background: '#e2e8f0',
              borderRadius: '2px',
              margin: '0 auto 16px auto',
              flexShrink: 0
            }}></div>

            {/* Header */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '16px',
              flexShrink: 0
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{
                  background: '#eff6ff', // light blue
                  color: '#2563eb', // primary blue
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <ReceiptText size={18} />
                </div>
                <span style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#0f172a' }}>
                  Order Summary
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowMobileCheckoutSheet(false)}
                style={{
                  background: '#f1f5f9',
                  border: 'none',
                  color: '#475569',
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer'
                }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Customer block inside bottom sheet */}
            <div style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '14px', marginBottom: '14px', flexShrink: 0 }}>
              {customerPhone ? (
                <div style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  padding: '10px 12px',
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px'
                }}>
                  <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    width: '32px', height: '32px', borderRadius: '50%',
                    background: '#eff6ff', color: '#2563eb', fontWeight: 600, fontSize: '0.8rem'
                  }}>
                    {customerName ? customerName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : 'C'}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1, paddingRight: '20px' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#1f2937' }}>
                      {customerName || 'Walk-in Customer'}
                    </span>
                    <span style={{ fontSize: '0.72rem', color: '#4b5563', fontFamily: 'monospace' }}>
                      {customerPhone}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setCustomerPhone('');
                      setCustomerName('');
                      setCustomerAddress('');
                      setCustomerSearchQuery('');
                      setSettlementBill(prev => prev ? { ...prev, customerName: '', customerPhone: '' } : null);
                    }}
                    style={{
                      position: 'absolute', top: '8px', right: '8px',
                      background: 'none', border: 'none', cursor: 'pointer',
                      color: '#9ca3af', padding: '4px'
                    }}
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <div style={{ position: 'relative' }}>
                  <label style={{ fontSize: '0.75rem', color: '#4b5563', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                    Select Customer <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Search size={14} style={{ position: 'absolute', left: '10px', top: '10px', color: '#9ca3af' }} />
                    <input
                      type="text"
                      placeholder="Type name or mobile number..."
                      value={customerSearchQuery}
                      onChange={(e) => {
                        setCustomerSearchQuery(e.target.value);
                        setShowCustomerDropdown(true);
                      }}
                      onFocus={() => setShowCustomerDropdown(true)}
                      onBlur={() => {
                        setTimeout(() => setShowCustomerDropdown(false), 200);
                      }}
                      style={{
                        paddingLeft: '32px', background: '#f9fafb', color: '#0f172a',
                        fontSize: '0.8rem', width: '100%', boxSizing: 'border-box',
                        height: '34px', borderRadius: '8px', border: '1px solid #cbd5e1'
                      }}
                    />
                  </div>
                  {showCustomerDropdown && (
                    <div style={{
                      position: 'absolute', top: '100%', left: 0, right: 0,
                      background: '#ffffff', border: '1px solid #cbd5e1',
                      borderRadius: '8px', boxShadow: '0 4px 10px rgba(0,0,0,0.08)',
                      zIndex: 150, marginTop: '4px', maxHeight: '160px', overflowY: 'auto'
                    }}>
                      {filteredCustomers.length > 0 ? (
                        filteredCustomers.map((cust, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onMouseDown={() => {
                              setCustomerPhone(cust.phone);
                              setCustomerName(cust.name);
                              setCustomerAddress(cust.address || '');
                              setCustomerSearchQuery('');
                              setShowCustomerDropdown(false);
                              setSettlementBill(prev => prev ? { ...prev, customerName: cust.name, customerPhone: cust.phone } : null);
                            }}
                            style={{
                              width: '100%', padding: '8px 10px', border: 'none',
                              background: 'none', textAlign: 'left', cursor: 'pointer',
                              fontSize: '0.78rem', display: 'flex', flexDirection: 'column',
                              borderBottom: '1px solid #f1f5f9'
                            }}
                          >
                            <span style={{ fontWeight: 600, color: '#1e293b' }}>{cust.name}</span>
                            <span style={{ fontSize: '0.7rem', color: '#64748b', fontFamily: 'monospace' }}>{cust.phone}</span>
                          </button>
                        ))
                      ) : (
                        <div style={{ padding: '10px', textAlign: 'center', fontSize: '0.75rem', color: '#64748b' }}>
                          No customers found
                        </div>
                      )}
                      <button
                        type="button"
                        onMouseDown={handleOpenAddCustomerModal}
                        style={{
                          width: '100%', padding: '8px 10px', border: 'none',
                          background: '#f0fdf4', color: '#15803d', textAlign: 'left',
                          cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600,
                          display: 'flex', alignItems: 'center', gap: '4px',
                          borderTop: '1px solid #dcfce7', position: 'sticky', bottom: 0
                        }}
                      >
                        <UserPlus size={12} /> + Add Customer
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Cart Items List */}
            <div style={{ 
              overflowY: 'auto', 
              maxHeight: '180px', 
              marginBottom: '16px',
              paddingRight: '4px'
            }} className="no-scrollbar">
              {(settlementBill?.isNew ? cart : (history.find(h => h.id === settlementBill?.id)?.items || [])).map((item) => (
                <div key={item.productId || item.id} style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 0',
                  borderBottom: '1px solid #f1f5f9'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '8px',
                      background: '#f8fafc',
                      overflow: 'hidden',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: '1px solid #f1f5f9'
                    }}>
                      {products.find(p => p.id === (item.productId || item.id))?.imageUrl ? (
                        <img 
                          src={products.find(p => p.id === (item.productId || item.id))?.imageUrl} 
                          alt={item.name} 
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                        />
                      ) : (
                        <Package size={16} style={{ color: '#cbd5e1' }} />
                      )}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#1f2937' }}>
                        {item.name}
                      </span>
                      <span style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: 500 }}>
                        ₹{Number(item.price).toFixed(0)}
                      </span>
                    </div>
                  </div>

                  {/* Controls or static Qty */}
                  {settlementBill?.isNew ? (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      background: '#eff6ff',
                      borderRadius: '8px',
                      padding: '2px'
                    }}>
                      <button
                        type="button"
                        onClick={() => handleUpdateQty(item.productId, item.quantity - 1)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: '#2563eb',
                          width: '24px',
                          height: '24px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer'
                        }}
                      >
                        <Minus size={10} strokeWidth={3} />
                      </button>
                      <span style={{
                        fontSize: '0.8rem',
                        fontWeight: 'bold',
                        color: '#2563eb',
                        minWidth: '20px',
                        textAlign: 'center'
                      }}>
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleUpdateQty(item.productId, item.quantity + 1)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: '#2563eb',
                          width: '24px',
                          height: '24px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer'
                        }}
                      >
                        <Plus size={10} strokeWidth={3} />
                      </button>
                    </div>
                  ) : (
                    <div style={{
                      fontSize: '0.8rem',
                      fontWeight: 'bold',
                      color: '#475569',
                      background: '#f1f5f9',
                      padding: '4px 10px',
                      borderRadius: '6px'
                    }}>
                      Qty: {item.quantity}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Totals & Payments Box (Light blue background) */}
            <div style={{
              background: '#eff6ff',
              borderRadius: '16px',
              padding: '12px 14px',
              border: '1px solid #bfdbfe',
              marginBottom: '14px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              flexShrink: 0
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#6b7280' }}>
                <span>Subtotal</span>
                <span style={{ fontWeight: 600, color: '#1f2937' }}>₹{subtotal.toFixed(0)}</span>
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>Discount (₹)</span>
                <input
                  type="number"
                  min="0"
                  value={discount}
                  onChange={(e) => {
                    const val = Math.max(0, Number(e.target.value));
                    setDiscount(val);
                    setSettlementBill(prev => prev ? { ...prev, discount: val, grandTotal: Math.max(0, subtotal + gstAmount - val) } : null);
                  }}
                  style={{
                    width: '80px',
                    textAlign: 'center',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    padding: '4px',
                    fontSize: '0.8rem',
                    background: '#ffffff',
                    color: '#0f172a',
                    outline: 'none'
                  }}
                />
              </div>

              {/* Payment Methods */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', margin: '4px 0' }}>
                {[
                  { id: 'Cash', label: 'Cash', icon: <Banknote size={14} /> },
                  { id: 'UPI', label: 'UPI', icon: <Sparkles size={14} /> },
                  { id: 'Card', label: 'Card', icon: <CreditCard size={14} /> }
                ].map(mode => {
                  const isSelected = selectedPaymentMethod === mode.id;
                  return (
                    <button
                      key={mode.id}
                      type="button"
                      onClick={() => setSelectedPaymentMethod(mode.id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        padding: '8px 0',
                        borderRadius: '10px',
                        border: isSelected ? '2px solid #2563eb' : '1px solid #cbd5e1',
                        background: isSelected ? '#eff6ff' : '#ffffff',
                        color: isSelected ? '#2563eb' : '#475569',
                        fontWeight: 600,
                        fontSize: '0.75rem',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {mode.icon} {mode.label}
                    </button>
                  );
                })}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px dashed #bfdbfe', paddingTop: '8px' }}>
                <span style={{ fontSize: '0.9rem', fontWeight: 'bold', color: '#1f2937' }}>Grand Total</span>
                <span style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#2563eb' }}>₹{grandTotal.toFixed(0)}</span>
              </div>
            </div>

            {/* Printer widget */}
            <div style={{
              border: '1px solid #fee2e2',
              background: '#fef2f2',
              borderRadius: '12px',
              padding: '10px 12px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '16px',
              flexShrink: 0
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#b91c1c' }}>
                <Printer size={16} style={{ opacity: 0.8 }} />
                <span style={{ fontSize: '0.78rem', fontWeight: 600 }}>
                  {printerCharacteristic ? 'Printer connected' : 'Printer disconnected'}
                </span>
              </div>
              {!printerCharacteristic && (
                <button
                  type="button"
                  onClick={handleConnectPrinter}
                  disabled={printerConnecting}
                  style={{
                    background: '#dc2626',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '5px 12px',
                    fontSize: '0.75rem',
                    fontWeight: 'bold',
                    cursor: 'pointer'
                  }}
                >
                  {printerConnecting ? 'Connecting...' : 'Connect'}
                </button>
              )}
            </div>

            {/* Settle / Cancel */}
            <div style={{ display: 'flex', gap: '10px', flexShrink: 0 }}>
              <button
                type="button"
                onClick={() => setShowMobileCheckoutSheet(false)}
                style={{
                  flex: 1,
                  background: '#f1f5f9',
                  border: 'none',
                  color: '#475569',
                  padding: '12px',
                  borderRadius: '12px',
                  fontWeight: 'bold',
                  fontSize: '0.85rem',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={(e) => {
                  if (!customerName.trim() || !customerPhone.trim()) {
                    alert('Customer is mandatory. Please search for an existing customer or add a new customer first.');
                    return;
                  }
                  handleExecuteSettlement(e);
                }}
                disabled={settleLoading}
                style={{
                  flex: 2,
                  background: settleLoading ? '#93c5fd' : '#2563eb',
                  border: 'none',
                  color: '#ffffff',
                  padding: '12px',
                  borderRadius: '12px',
                  fontWeight: 'bold',
                  fontSize: '0.85rem',
                  cursor: settleLoading ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  transition: 'background-color 0.2s ease, transform 0.1s ease'
                }}
              >
                {settleLoading ? (
                  <><Loader2 className="animate-spin" size={16} /> Settling...</>
                ) : (
                  'Settle Bill'
                )}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Scan line laser vertical shift animation */}
      <style>{`
        @keyframes scanLineMove {
          0%, 100% { top: 15%; }
          50% { top: 85%; }
        }
        @keyframes slideUp {
          from { transform: translateY(100px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes slideUpSheet {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>

    </div>
  );
}

export default POS;
