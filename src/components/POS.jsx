import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import {
  Search, ShoppingBag, Trash2, Tag, CreditCard, Banknote,
  Landmark, Loader2, Sparkles, ReceiptText, Barcode, Eye,
  Plus, Minus, CheckCircle, Printer, AlertTriangle, Play, X, Wallet, RefreshCw,
  UserPlus, Camera, MapPin, ChevronDown, Package
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

function POS({ token, business, printerCharacteristic }) {
  // Navigation Tabs: 'barcode' | 'item' | 'history'
  const [activeTab, setActiveTab] = useState('barcode');

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

  // Tab 2: Item Billing Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');

  // Tab 3: Billing History State
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historySearch, setHistorySearch] = useState('');

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
            // Debounce matching barcode scans for 1.5 seconds
            if (decodedText === lastScannedText && now - lastScannedTime < 1500) {
              return;
            }
            lastScannedText = decodedText;
            lastScannedTime = now;

            const matched = products.find(p => p.barcode === decodedText.trim());
            if (matched) {
              handleAddToCart(matched);
              setScanFeedback(`Added: ${matched.name} x1`);
              setTimeout(() => setScanFeedback(''), 3000);
            } else {
              setScanFeedback(`⚠️ Barcode "${decodedText}" not found`);
              setTimeout(() => setScanFeedback(''), 3000);
            }
          },
          (errorMessage) => { }
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
  }, [cameraActive, products]);

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

  // Barcode Scanning Input handler
  const handleBarcodeSubmit = (e) => {
    e.preventDefault();
    if (!scanInput.trim()) return;

    const matched = products.find(p => p.barcode === scanInput.trim());
    if (matched) {
      handleAddToCart(matched);
      setScanInput('');
    } else {
      alert(`No product found matching barcode: "${scanInput}"`);
      setScanInput('');
    }

    // Maintain input focus
    setTimeout(() => scanInputRef.current?.focus(), 50);
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
  const filteredHistory = history.filter(inv =>
    inv.invoiceNumber.toLowerCase().includes(historySearch.toLowerCase()) ||
    inv.customerName.toLowerCase().includes(historySearch.toLowerCase()) ||
    (inv.customerPhone && inv.customerPhone.includes(historySearch))
  );

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
      <div className="pos-terminal-layout" style={{ display: 'flex', gap: '24px', flexGrow: 1, alignItems: 'stretch' }}>

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
                        padding: '8px 12px', borderRadius: '8px',
                        background: scanFeedback.startsWith('⚠️') ? '#fef2f2' : '#f0fdf4',
                        color: scanFeedback.startsWith('⚠️') ? '#ef4444' : '#15803d',
                        fontSize: '0.8rem', fontWeight: 600, textAlign: 'center', marginTop: '12px',
                        border: scanFeedback.startsWith('⚠️') ? '1px solid #fee2e2' : '1px solid #dcfce7',
                        animation: 'fadeIn 0.2s ease'
                      }}>
                        {scanFeedback}
                      </div>
                    )}
                  </div>
                ) : (
                  /* Manual input fallback fields when camera is stopped */
                  <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: '16px' }}>
                    <label htmlFor="scan-field" style={{ fontSize: '0.78rem', fontWeight: 500, color: '#4b5563', display: 'block', marginBottom: '6px' }}>
                      Or manually enter barcode number
                    </label>
                    <form onSubmit={handleBarcodeSubmit} style={{ display: 'flex', gap: '10px' }}>
                      <div style={{ position: 'relative', flex: 1 }}>
                        <Barcode size={16} style={{ position: 'absolute', left: '12px', top: '13px', color: '#9ca3af' }} />
                        <input
                          id="scan-field"
                          ref={scanInputRef}
                          type="text"
                          placeholder="Scan or type item barcode..."
                          value={scanInput}
                          onChange={(e) => setScanInput(e.target.value)}
                          autoFocus
                          style={{ paddingLeft: '38px', background: '#f9fafb', color: '#0f172a' }}
                        />
                      </div>
                      <button type="submit" className="btn-blue-primary" style={{ width: 'auto', padding: '10px 20px', fontSize: '0.85rem' }}>
                        Add Item
                      </button>
                    </form>
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
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '16px' }}>
                    {filteredProducts.map(p => {
                      const cartItem = cart.find(item => item.productId === p.id);
                      const isAdded = !!cartItem;
                      const isOutOfStock = p.stock <= 0;

                      return (
                        <div
                          key={p.id}
                          onClick={() => !isOutOfStock && handleAddToCart(p)}
                          style={{
                            background: '#ffffff', border: isAdded ? '2px solid #2563eb' : '1px solid #e5e7eb',
                            borderRadius: '12px', padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px',
                            transition: 'all 0.2s ease', position: 'relative', opacity: isOutOfStock ? 0.6 : 1,
                            cursor: isOutOfStock ? 'not-allowed' : 'pointer'
                          }}
                        >
                          {/* Image Placeholder */}
                          <div style={{ width: '100%', height: '80px', borderRadius: '8px', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                            {p.imageUrl ? (
                              <img src={p.imageUrl} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                              <Package size={24} style={{ color: '#cbd5e1' }} />
                            )}
                          </div>

                          <div>
                            <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#1f2937', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', height: '2.4em', lineHeight: '1.2' }}>
                              {p.name}
                            </div>
                            <span style={{ fontSize: '0.68rem', color: '#9ca3af' }}>{p.categoryName || 'General'}</span>
                          </div>

                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
                            <span style={{ fontWeight: 600, fontSize: '0.88rem', color: '#0f172a' }}>₹{Number(p.price).toFixed(2)}</span>
                            <span style={{ fontSize: '0.7rem', color: p.stock <= 5 ? '#ef4444' : '#6b7280', fontWeight: 500 }}>
                              {isOutOfStock ? 'No Stock' : `Qty: ${p.stock}`}
                            </span>
                          </div>

                          {/* Add/Plus/Minus buttons overlay */}
                          <div style={{ marginTop: '4px' }}>
                            {isOutOfStock ? (
                              <button disabled style={{ width: '100%', background: '#cbd5e1', border: 'none', color: '#ffffff', padding: '6px', borderRadius: '6px', fontSize: '0.72rem', cursor: 'not-allowed', fontWeight: 600 }}>
                                Out of Stock
                              </button>
                            ) : isAdded ? (
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '6px', padding: '4px' }}>
                                <button type="button" onClick={(e) => { e.stopPropagation(); handleUpdateQty(p.id, cartItem.quantity - 1); }} style={{ background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', padding: '2px', display: 'flex' }}>
                                  <Minus size={12} />
                                </button>
                                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#2563eb' }}>{cartItem.quantity} selected</span>
                                <button type="button" onClick={(e) => { e.stopPropagation(); handleUpdateQty(p.id, cartItem.quantity + 1); }} style={{ background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', padding: '2px', display: 'flex' }}>
                                  <Plus size={12} />
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); handleAddToCart(p); }}
                                style={{ width: '100%', background: '#2563eb', border: 'none', color: '#ffffff', padding: '6px', borderRadius: '6px', fontSize: '0.72rem', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                              >
                                <Plus size={11} /> Select Item
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
          )}

          {/* TAB 3: BILLING HISTORY */}
          {activeTab === 'history' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', flexGrow: 1 }}>

              {/* History Search bar */}
              <div style={{ display: 'flex', gap: '12px', background: '#ffffff', padding: '16px 20px', borderRadius: '12px', border: '1px solid #e5e7eb', alignItems: 'center' }}>
                <div style={{ position: 'relative', flex: 1 }}>
                  <Search size={14} style={{ position: 'absolute', left: '12px', top: '11px', color: '#9ca3af' }} />
                  <input
                    type="text"
                    placeholder="Search historical bills by Invoice No. or Client info..."
                    value={historySearch}
                    onChange={(e) => setHistorySearch(e.target.value)}
                    style={{ paddingLeft: '36px', background: '#f9fafb', color: '#0f172a', fontSize: '0.85rem', padding: '8px 12px 8px 36px', width: '100%' }}
                  />
                </div>
                <button
                  type="button"
                  onClick={fetchHistory}
                  style={{ background: 'none', border: '1px solid #cbd5e1', color: '#4b5563', padding: '8px 14px', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
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
        {activeTab !== 'history' && (
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
      {settlementBill && (
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

      {/* Scan line laser vertical shift animation */}
      <style>{`
        @keyframes scanLineMove {
          0%, 100% { top: 15%; }
          50% { top: 85%; }
        }
      `}</style>

    </div>
  );
}

export default POS;
