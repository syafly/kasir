'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { AuthWrapper, useAuth } from '@/components/AuthWrapper';
import {
  ShoppingCart,
  Package,
  TrendingUp,
  DollarSign,
  Calendar,
  Plus,
  Minus,
  Trash2,
  Edit,
  Lock,
  AlertTriangle,
  FileText,
  BarChart3,
  Home,
  Ticket,
  Building2,
  Users,
  Printer,
  Upload
} from 'lucide-react';

export default function App() {
  return (
    <AuthWrapper>
      <MainApp />
    </AuthWrapper>
  );
}

function MainApp() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState(user.role === 'user' ? 'pos' : 'dashboard');
  const [products, setProducts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [stats, setStats] = useState(null);
  const [cart, setCart] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [cashReceived, setCashReceived] = useState('');
  const [closings, setClosings] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [monthlyReport, setMonthlyReport] = useState(null);
  const [isClosedMonth, setIsClosedMonth] = useState(false);

  // Voucher states
  const [vouchers, setVouchers] = useState([]);
  const [voucherCode, setVoucherCode] = useState('');
  const [appliedVoucher, setAppliedVoucher] = useState(null);
  const [voucherForm, setVoucherForm] = useState({
    code: '',
    discountAmount: '',
    description: '',
    isActive: true,
    usageLimit: '',
    expiryDate: ''
  });
  const [isEditVoucherMode, setIsEditVoucherMode] = useState(false);
  const [editVoucherId, setEditVoucherId] = useState(null);
  const [showVoucherDialog, setShowVoucherDialog] = useState(false);

  // Tenant & User management states (super admin)
  const [tenants, setTenants] = useState([]);
  const [users, setUsers] = useState([]);
  const [showTenantDialog, setShowTenantDialog] = useState(false);
  const [showUserDialog, setShowUserDialog] = useState(false);
  const [tenantForm, setTenantForm] = useState({
    name: '',
    adminUsername: '',
    adminPassword: '',
    adminName: ''
  });
  const [userForm, setUserForm] = useState({
    username: '',
    password: '',
    name: '',
    role: 'user',
    tenantId: ''
  });

  // Receipt settings states
  const [receiptSettings, setReceiptSettings] = useState({
    logo: '',
    storeName: '',
    address: '',
    phone: '',
    headerText: '',
    footerText: '',
    paperSize: '58mm',
    fontSize: 'normal'
  });
  const [lastTransaction, setLastTransaction] = useState(null);
  const [showPrintDialog, setShowPrintDialog] = useState(false);
  const [receiptForm, setReceiptForm] = useState({
    logo: '',
    storeName: '',
    address: '',
    phone: '',
    headerText: '',
    footerText: '',
    paperSize: '58mm',
    fontSize: 'normal'
  });

  // Helper function to check if user can see a tab
  const canAccessTab = (tabName) => {
    if (user.role === 'superadmin') {
      // Super admin only sees management tabs, not operational tabs
      return ['dashboard', 'tenants', 'users'].includes(tabName);
    }
    if (user.role === 'admin') {
      // Admin sees all operational tabs
      return ['dashboard', 'pos', 'products', 'vouchers', 'reports', 'transactions', 'receipt-settings'].includes(tabName);
    }
    if (user.role === 'user') {
      // User sees dashboard, POS, and transaksi
      return ['dashboard', 'pos', 'transactions'].includes(tabName);
    }
    return false;
  };

  // Product form state
  const [productForm, setProductForm] = useState({
    name: '',
    price: '',
    stock: '',
    category: '',
    description: '',
    sku: ''
  });
  const [isEditMode, setIsEditMode] = useState(false);
  const [editProductId, setEditProductId] = useState(null);
  const [showProductDialog, setShowProductDialog] = useState(false);

  useEffect(() => {
    fetchProducts();
    fetchCategories();
    fetchStats();
    fetchTransactions();
    fetchClosings();
    fetchVouchers();
    fetchReceiptSettings();
  }, []);

  useEffect(() => {
    if (activeTab === 'reports') {
      fetchMonthlyReport();
      checkMonthClosed();
    }
    if (activeTab === 'tenants' && user.role === 'superadmin') {
      fetchTenants();
    }
    if (activeTab === 'users' && (user.role === 'superadmin' || user.role === 'admin')) {
      fetchUsers();
      if (user.role === 'superadmin') {
        fetchTenants(); // Need tenants list for dropdown
      }
    }
    if (activeTab === 'receipt-settings') {
      fetchReceiptSettings();
    }
  }, [activeTab, selectedMonth, selectedYear]);

  const fetchProducts = async () => {
    try {
      const response = await fetch('/api/products');
      const data = await response.json();
      if (data.success) {
        setProducts(data.data);
      }
    } catch (error) {
      toast.error('Gagal memuat produk');
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/categories');
      const data = await response.json();
      if (data.success) {
        setCategories(data.data);
      }
    } catch (error) {
      toast.error('Gagal memuat kategori');
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/dashboard/stats');
      const data = await response.json();
      if (data.success) {
        setStats(data.data);
      }
    } catch (error) {
      toast.error('Gagal memuat statistik');
    }
  };

  const fetchTransactions = async () => {
    try {
      const response = await fetch('/api/transactions');
      const data = await response.json();
      if (data.success) {
        setTransactions(data.data);
      }
    } catch (error) {
      toast.error('Gagal memuat transaksi');
    }
  };

  const fetchClosings = async () => {
    try {
      const response = await fetch('/api/closings');
      const data = await response.json();
      if (data.success) {
        setClosings(data.data);
      }
    } catch (error) {
      toast.error('Gagal memuat data closing');
    }
  };

  const fetchVouchers = async () => {
    try {
      const response = await fetch('/api/vouchers');
      const data = await response.json();
      if (data.success) {
        setVouchers(data.data);
      }
    } catch (error) {
      toast.error('Gagal memuat voucher');
    }
  };

  const fetchTenants = async () => {
    if (user.role !== 'superadmin') return;
    try {
      const response = await fetch('/api/tenants');
      const data = await response.json();
      if (data.success) {
        setTenants(data.data);
      }
    } catch (error) {
      toast.error('Gagal memuat tenants');
    }
  };

  const fetchUsers = async () => {
    if (user.role !== 'superadmin' && user.role !== 'admin') return;
    try {
      const response = await fetch('/api/users');
      const data = await response.json();
      if (data.success) {
        setUsers(data.data);
      }
    } catch (error) {
      toast.error('Gagal memuat users');
    }
  };

  const fetchMonthlyReport = async () => {
    try {
      const response = await fetch(`/api/reports/monthly?month=${selectedMonth}&year=${selectedYear}`);
      const data = await response.json();
      if (data.success) {
        setMonthlyReport(data.data);
      }
    } catch (error) {
      toast.error('Gagal memuat laporan bulanan');
    }
  };

  const checkMonthClosed = async () => {
    try {
      const response = await fetch(`/api/closings/check?month=${selectedMonth}&year=${selectedYear}`);
      const data = await response.json();
      if (data.success) {
        setIsClosedMonth(data.data.isClosed);
      }
    } catch (error) {
      console.error('Gagal cek status closing');
    }
  };

  const fetchReceiptSettings = async () => {
    if (user.role === 'superadmin') return;
    try {
      const response = await fetch('/api/receipt-settings');
      const data = await response.json();
      if (data.success && data.data) {
        setReceiptSettings(data.data);
        setReceiptForm(data.data);
      }
    } catch (error) {
      console.error('Gagal memuat pengaturan struk:', error);
    }
  };

  const handleSaveReceiptSettings = async (e) => {
    if (e) e.preventDefault();
    try {
      const response = await fetch('/api/receipt-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(receiptForm)
      });
      const data = await response.json();
      if (data.success) {
        toast.success('Pengaturan struk berhasil disimpan');
        const updated = data.data;
        if (updated) {
          setReceiptSettings(updated);
          setReceiptForm(updated);
        }
      } else {
        toast.error(data.error || 'Gagal menyimpan pengaturan struk');
      }
    } catch (error) {
      toast.error('Terjadi kesalahan saat menyimpan pengaturan struk');
    }
  };

  const handlePrintReceipt = (tx) => {
    const transaction = tx || lastTransaction;
    if (!transaction) return;

    const paperWidth = receiptSettings.paperSize === '80mm' ? '300px' : '220px';
    const fontClass = receiptSettings.fontSize === 'kecil' ? 'font-kecil' : receiptSettings.fontSize === 'besar' ? 'font-besar' : 'font-normal';
    
    const formattedDate = new Date(transaction.date || transaction.createdAt).toLocaleString('id-ID', {
      year: 'numeric', month: 'numeric', day: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    });

    const itemsHtml = transaction.items.map(item => `
      <div class="item-row">
        <div>${item.name}</div>
        <div class="text-right">${item.quantity} x ${formatCurrency(item.price).replace('Rp', '').trim()}</div>
      </div>
      <div class="item-total-row text-right">
        ${formatCurrency(item.price * item.quantity)}
      </div>
    `).join('');

    const logoHtml = receiptSettings.logo 
      ? `<div class="text-center"><img class="logo" src="${receiptSettings.logo}" alt="Logo" /></div>` 
      : '';

    const headerHtml = receiptSettings.headerText 
      ? `<div class="text-center header-text">${receiptSettings.headerText}</div><div class="divider"></div>` 
      : '';

    const footerHtml = receiptSettings.footerText 
      ? `<div class="divider"></div><div class="text-center footer-text">${receiptSettings.footerText}</div>` 
      : '';

    const storeInfoHtml = `
      <div class="text-center bold store-name">${receiptSettings.storeName || user.tenantName || 'NAMA TOKO'}</div>
      ${receiptSettings.address ? `<div class="text-center address-text">${receiptSettings.address}</div>` : ''}
      ${receiptSettings.phone ? `<div class="text-center phone-text">Telp: ${receiptSettings.phone}</div>` : ''}
    `;

    const discountHtml = transaction.voucherDiscount > 0 
      ? `
        <div class="item-row text-sm">
          <div>Diskon (${transaction.voucherCode || 'Voucher'})</div>
          <div class="text-right">-${formatCurrency(transaction.voucherDiscount)}</div>
        </div>
      `
      : '';

    const cashHtml = transaction.cashReceived !== null && transaction.cashReceived !== undefined
      ? `
        <div class="item-row text-sm">
          <div>Tunai Diterima</div>
          <div class="text-right">${formatCurrency(transaction.cashReceived)}</div>
        </div>
        <div class="item-row text-sm">
          <div>Kembalian</div>
          <div class="text-right">${formatCurrency(transaction.change || 0)}</div>
        </div>
      `
      : '';

    const printWindow = window.open('', '_blank', 'width=350,height=600');
    if (!printWindow) {
      toast.error('Gagal membuka jendela cetak. Pastikan pop-up browser tidak diblokir.');
      return;
    }
    
    printWindow.document.write(`
      <html>
        <head>
          <title>Print Receipt</title>
          <style>
            @page {
              margin: 0;
            }
            body {
              font-family: 'Courier New', Courier, monospace;
              padding: 10px;
              margin: 0;
              width: ${paperWidth};
              color: #000;
              background: #fff;
            }
            .text-center { text-align: center; }
            .text-right { text-align: right; }
            .bold { font-weight: bold; }
            .divider { border-top: 1px dashed #000; margin: 6px 0; }
            .item-row { display: flex; justify-content: space-between; font-weight: bold; }
            .item-total-row { font-size: 0.9em; margin-bottom: 4px; color: #333; }
            img.logo { max-width: 100px; max-height: 100px; object-fit: contain; margin: 4px auto; display: block; }
            .store-name { font-size: 1.1em; margin-bottom: 2px; }
            .address-text, .phone-text, .header-text, .footer-text { font-size: 0.85em; margin-top: 2px; }
            
            .font-kecil { font-size: 10px; }
            .font-normal { font-size: 12px; }
            .font-besar { font-size: 14px; }
            
            .font-kecil .store-name { font-size: 12px; }
            .font-besar .store-name { font-size: 16px; }
          </style>
        </head>
        <body class="${fontClass}">
          ${logoHtml}
          ${storeInfoHtml}
          <div class="divider"></div>
          ${headerHtml}
          <div class="text-sm" style="font-size: 0.85em; margin-bottom: 6px;">
            <div>ID Transaksi: ${transaction.id.substring(0, 8)}...</div>
            <div>Tanggal: ${formattedDate}</div>
            <div>Metode: ${transaction.paymentMethod === 'cash' ? 'Tunai' : transaction.paymentMethod === 'card' ? 'Kartu' : 'E-Wallet'}</div>
          </div>
          <div class="divider"></div>
          <div style="margin: 6px 0;">
            ${itemsHtml}
          </div>
          <div class="divider"></div>
          <div class="item-row">
            <div>Subtotal</div>
            <div class="text-right">${formatCurrency(transaction.subtotal || transaction.total + transaction.voucherDiscount)}</div>
          </div>
          ${discountHtml}
          <div class="item-row bold" style="font-size: 1.1em; margin: 4px 0;">
            <div>TOTAL</div>
            <div class="text-right">${formatCurrency(transaction.total)}</div>
          </div>
          ${cashHtml}
          ${footerHtml}
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleProductSubmit = async (e) => {
    e.preventDefault();

    try {
      const url = isEditMode ? `/api/products/${editProductId}` : '/api/products';
      const method = isEditMode ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(productForm)
      });

      const data = await response.json();

      if (data.success) {
        toast.success(isEditMode ? 'Produk berhasil diperbarui' : 'Produk berhasil ditambahkan');
        setShowProductDialog(false);
        resetProductForm();
        fetchProducts();
        fetchCategories();
        fetchStats();
      } else {
        toast.error(data.error || 'Terjadi kesalahan');
      }
    } catch (error) {
      toast.error('Gagal menyimpan produk');
    }
  };

  const handleDeleteTransaction = async (transactionId) => {
    if (!confirm('Apakah Anda yakin ingin membatalkan transaksi ini?')) return;
    
    try {
      const response = await fetch(`/api/transactions/${transactionId}`, {
        method: 'DELETE'
      });
      const data = await response.json();
      if (data.success) {
        toast.success('Transaksi berhasil dibatalkan');
        fetchTransactions();
      } else {
        toast.error(data.error || 'Gagal membatalkan transaksi');
      }
    } catch (error) {
      toast.error('Terjadi kesalahan');
    }
  };

  const handleDeleteProduct = async (productId) => {
    if (!confirm('Apakah Anda yakin ingin menghapus produk ini?')) return;

    try {
      const response = await fetch(`/api/products/${productId}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Produk berhasil dihapus');
        fetchProducts();
        fetchCategories();
        fetchStats();
      } else {
        toast.error(data.error || 'Terjadi kesalahan');
      }
    } catch (error) {
      toast.error('Gagal menghapus produk');
    }
  };

  const handleEditProduct = (product) => {
    setIsEditMode(true);
    setEditProductId(product.id);
    setProductForm({
      name: product.name,
      price: product.price.toString(),
      stock: product.stock.toString(),
      category: product.category,
      description: product.description || '',
      sku: product.sku || ''
    });
    setShowProductDialog(true);
  };

  const resetProductForm = () => {
    setProductForm({
      name: '',
      price: '',
      stock: '',
      category: '',
      description: '',
      sku: ''
    });
    setIsEditMode(false);
    setEditProductId(null);
  };

  // Voucher Management Functions
  const handleVoucherSubmit = async (e) => {
    e.preventDefault();

    try {
      const url = isEditVoucherMode ? `/api/vouchers/${editVoucherId}` : '/api/vouchers';
      const method = isEditVoucherMode ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(voucherForm)
      });

      const data = await response.json();

      if (data.success) {
        toast.success(isEditVoucherMode ? 'Voucher berhasil diperbarui' : 'Voucher berhasil ditambahkan');
        setShowVoucherDialog(false);
        resetVoucherForm();
        fetchVouchers();
      } else {
        toast.error(data.error || 'Terjadi kesalahan');
      }
    } catch (error) {
      toast.error('Gagal menyimpan voucher');
    }
  };

  const handleDeleteVoucher = async (voucherId) => {
    if (!confirm('Apakah Anda yakin ingin menghapus voucher ini?')) return;

    try {
      const response = await fetch(`/api/vouchers/${voucherId}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Voucher berhasil dihapus');
        fetchVouchers();
      } else {
        toast.error(data.error || 'Terjadi kesalahan');
      }
    } catch (error) {
      toast.error('Gagal menghapus voucher');
    }
  };

  const handleEditVoucher = (voucher) => {
    setIsEditVoucherMode(true);
    setEditVoucherId(voucher.id);
    setVoucherForm({
      code: voucher.code,
      discountAmount: voucher.discountAmount.toString(),
      description: voucher.description || '',
      isActive: voucher.isActive,
      usageLimit: voucher.usageLimit?.toString() || '',
      expiryDate: voucher.expiryDate || ''
    });
    setShowVoucherDialog(true);
  };

  const resetVoucherForm = () => {
    setVoucherForm({
      code: '',
      discountAmount: '',
      description: '',
      isActive: true,
      usageLimit: '',
      expiryDate: ''
    });
    setIsEditVoucherMode(false);
    setEditVoucherId(null);
  };

  const handleApplyVoucher = async () => {
    if (!voucherCode.trim()) {
      toast.error('Masukkan kode voucher');
      return;
    }

    try {
      const response = await fetch(`/api/vouchers/validate/${voucherCode.trim()}`);
      const data = await response.json();

      if (data.success) {
        setAppliedVoucher(data.data);
        toast.success(`Voucher ${data.data.code} berhasil diterapkan! Diskon ${formatCurrency(data.data.discountAmount)}`);
      } else {
        toast.error(data.error || 'Voucher tidak valid');
        setAppliedVoucher(null);
      }
    } catch (error) {
      toast.error('Gagal memvalidasi voucher');
      setAppliedVoucher(null);
    }
  };

  const handleRemoveVoucher = () => {
    setAppliedVoucher(null);
    setVoucherCode('');
    toast.info('Voucher dihapus');
  };

  // Tenant Management Handlers
  const handleTenantSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/tenants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tenantForm)
      });
      const data = await response.json();
      if (data.success) {
        toast.success('Tenant dan Admin berhasil dibuat!');
        setShowTenantDialog(false);
        setTenantForm({ name: '', adminUsername: '', adminPassword: '', adminName: '' });
        fetchTenants();
      } else {
        toast.error(data.error || 'Gagal membuat tenant');
      }
    } catch (error) {
      toast.error('Terjadi kesalahan');
    }
  };

  // User Management Handlers
  const handleUserSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userForm)
      });
      const data = await response.json();
      if (data.success) {
        toast.success('User berhasil dibuat!');
        setShowUserDialog(false);
        setUserForm({ username: '', password: '', name: '', role: 'user', tenantId: '' });
        fetchUsers();
      } else {
        toast.error(data.error || 'Gagal membuat user');
      }
    } catch (error) {
      toast.error('Terjadi kesalahan');
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!confirm('Apakah Anda yakin ingin menghapus user ini?')) return;
    try {
      const response = await fetch(`/api/users/${userId}`, { method: 'DELETE' });
      const data = await response.json();
      if (data.success) {
        toast.success('User berhasil dihapus');
        fetchUsers();
      } else {
        toast.error(data.error || 'Gagal menghapus user');
      }
    } catch (error) {
      toast.error('Terjadi kesalahan');
    }
  };

  const addToCart = (product) => {
    const existingItem = cart.find(item => item.productId === product.id);

    if (existingItem) {
      if (existingItem.quantity >= product.stock) {
        toast.error('Stok tidak mencukupi');
        return;
      }
      setCart(cart.map(item =>
        item.productId === product.id
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      if (product.stock < 1) {
        toast.error('Stok habis');
        return;
      }
      setCart([...cart, {
        productId: product.id,
        name: product.name,
        price: product.price,
        quantity: 1
      }]);
    }
    toast.success(`${product.name} ditambahkan ke keranjang`);
  };

  const updateCartQuantity = (productId, change) => {
    const product = products.find(p => p.id === productId);
    const cartItem = cart.find(item => item.productId === productId);

    if (change > 0 && cartItem.quantity >= product.stock) {
      toast.error('Stok tidak mencukupi');
      return;
    }

    setCart(cart.map(item => {
      if (item.productId === productId) {
        const newQuantity = item.quantity + change;
        if (newQuantity <= 0) {
          return null;
        }
        return { ...item, quantity: newQuantity };
      }
      return item;
    }).filter(Boolean));
  };

  const removeFromCart = (productId) => {
    setCart(cart.filter(item => item.productId !== productId));
  };

  const calculateTotal = () => {
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const discount = appliedVoucher ? appliedVoucher.discountAmount : 0;
    return Math.max(0, subtotal - discount);
  };

  const calculateSubtotal = () => {
    return cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  };

  const calculateChange = () => {
    if (paymentMethod !== 'cash' || !cashReceived) return 0;
    const total = calculateTotal();
    const received = parseFloat(cashReceived);
    return received - total;
  };

  const handleCheckout = async () => {
    if (cart.length === 0) {
      toast.error('Keranjang kosong');
      return;
    }

    const subtotal = calculateSubtotal();
    const total = calculateTotal();
    const discount = appliedVoucher ? appliedVoucher.discountAmount : 0;
    
    if (paymentMethod === 'cash') {
      if (!cashReceived || parseFloat(cashReceived) < total) {
        toast.error('Uang yang diterima kurang');
        return;
      }
    }

    try {
      const transactionData = {
        items: cart,
        paymentMethod,
        subtotal,
        total,
        totalAmount: total,
        voucherCode: appliedVoucher?.code || null,
        voucherDiscount: discount,
        cashReceived: paymentMethod === 'cash' ? parseFloat(cashReceived) : null,
        change: paymentMethod === 'cash' ? calculateChange() : null,
        date: new Date().toISOString(),
        createdAt: new Date().toISOString()
      };

      const response = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(transactionData)
      });
      const data = await response.json();
      if (data.success) {
        toast.success('Transaksi berhasil!');
        setLastTransaction(data.data);
        setShowPrintDialog(true);
        setCart([]);
        setCashReceived('');
        setPaymentMethod('cash');
        setVoucherCode('');
        setAppliedVoucher(null);
        fetchProducts();
        fetchStats();
        fetchTransactions();
        fetchVouchers();
      } else {
        toast.error(data.error || 'Transaksi gagal');
      }
    } catch (error) {
      toast.error('Terjadi kesalahan saat checkout');
    }
  };

  const handleMonthlyClosing = async () => {
    if (!confirm(`Apakah Anda yakin ingin menutup bulan ${selectedMonth}/${selectedYear}? Tindakan ini tidak dapat dibatalkan.`)) {
      return;
    }

    try {
      const response = await fetch('/api/closings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          month: selectedMonth,
          year: selectedYear
        })
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Bulan berhasil ditutup');
        fetchClosings();
        checkMonthClosed();
      } else {
        toast.error(data.error || 'Gagal menutup bulan');
      }
    } catch (error) {
      toast.error('Terjadi kesalahan');
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getMonthName = (month) => {
    const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    return months[month - 1];
  };

  const filteredProducts = selectedCategory === 'all'
    ? products
    : products.filter(p => p.category === selectedCategory);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-blue-600 to-purple-600 p-2 rounded-lg">
                <ShoppingCart className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Kasir Aplikasi
                </h1>
                <p className="text-sm text-gray-500">Sistem Manajemen Penjualan</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-sm">
                {new Date().toLocaleDateString('id-ID', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </Badge>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="flex flex-wrap w-full lg:w-auto lg:inline-flex bg-white shadow-sm h-auto p-1 gap-1">
            {canAccessTab('dashboard') && (
              <TabsTrigger value="dashboard" className="gap-2">
                <Home className="h-4 w-4" />
                <span className="hidden sm:inline">Dashboard</span>
              </TabsTrigger>
            )}
            {canAccessTab('pos') && (
              <TabsTrigger value="pos" className="gap-2">
                <ShoppingCart className="h-4 w-4" />
                <span className="hidden sm:inline">Kasir</span>
              </TabsTrigger>
            )}
            {canAccessTab('products') && (
              <TabsTrigger value="products" className="gap-2">
                <Package className="h-4 w-4" />
                <span className="hidden sm:inline">Produk</span>
              </TabsTrigger>
            )}
            {canAccessTab('vouchers') && (
              <TabsTrigger value="vouchers" className="gap-2">
                <Ticket className="h-4 w-4" />
                <span className="hidden sm:inline">Voucher</span>
              </TabsTrigger>
            )}
            {canAccessTab('reports') && (
              <TabsTrigger value="reports" className="gap-2">
                <BarChart3 className="h-4 w-4" />
                <span className="hidden sm:inline">Laporan</span>
              </TabsTrigger>
            )}
            {canAccessTab('transactions') && (
              <TabsTrigger value="transactions" className="gap-2">
                <FileText className="h-4 w-4" />
                <span className="hidden sm:inline">Transaksi</span>
              </TabsTrigger>
            )}
            {canAccessTab('receipt-settings') && (
              <TabsTrigger value="receipt-settings" className="gap-2">
                <Printer className="h-4 w-4" />
                <span className="hidden sm:inline">Setting Print</span>
              </TabsTrigger>
            )}
            {canAccessTab('tenants') && (
              <TabsTrigger value="tenants" className="gap-2">
                <Building2 className="h-4 w-4" />
                <span className="hidden sm:inline">Tenants</span>
              </TabsTrigger>
            )}
            {canAccessTab('users') && (
              <TabsTrigger value="users" className="gap-2">
                <Users className="h-4 w-4" />
                <span className="hidden sm:inline">Users</span>
              </TabsTrigger>
            )}
          </TabsList>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard" className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Penjualan Hari Ini</CardTitle>
                  <DollarSign className="h-5 w-5 opacity-75" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(stats?.todaySales || 0)}</div>
                  <p className="text-xs opacity-75 mt-1">
                    {stats?.todayTransactions || 0} transaksi
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white shadow-lg">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Penjualan Bulan Ini</CardTitle>
                  <TrendingUp className="h-5 w-5 opacity-75" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(stats?.monthSales || 0)}</div>
                  <p className="text-xs opacity-75 mt-1">
                    {stats?.monthTransactions || 0} transaksi
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white shadow-lg">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Total Produk</CardTitle>
                  <Package className="h-5 w-5 opacity-75" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats?.productCount || 0}</div>
                  <p className="text-xs opacity-75 mt-1">produk tersedia</p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white shadow-lg">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Stok Menipis</CardTitle>
                  <AlertTriangle className="h-5 w-5 opacity-75" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats?.lowStockCount || 0}</div>
                  <p className="text-xs opacity-75 mt-1">produk perlu restock</p>
                </CardContent>
              </Card>
            </div>

            {/* Low Stock Alert */}
            {stats?.lowStockProducts && stats.lowStockProducts.length > 0 && (
              <Card className="border-orange-200 bg-orange-50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-orange-800">
                    <AlertTriangle className="h-5 w-5" />
                    Peringatan Stok Menipis
                  </CardTitle>
                  <CardDescription>Produk-produk berikut perlu segera direstock</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {stats.lowStockProducts.map((product) => (
                      <div key={product.id} className="flex items-center justify-between p-3 bg-white rounded-lg">
                        <div>
                          <p className="font-medium">{product.name}</p>
                          <p className="text-sm text-gray-500">{product.category}</p>
                        </div>
                        <Badge variant="destructive">
                          Stok: {product.stock}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Recent Transactions */}
            <Card>
              <CardHeader>
                <CardTitle>Transaksi Terbaru</CardTitle>
                <CardDescription>10 transaksi terakhir</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[300px]">
                  <div className="space-y-3">
                    {transactions.slice(0, 10).map((transaction) => (
                      <div key={transaction.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                        <div>
                          <p className="font-medium">{formatCurrency(transaction.total)}</p>
                          <p className="text-sm text-gray-500">
                            {transaction.items.length} item • {transaction.paymentMethod === 'cash' ? 'Tunai' : 'Kartu'}
                          </p>
                          <p className="text-xs text-gray-400">{formatDate(transaction.date)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* POS Tab */}
          <TabsContent value="pos" className="space-y-4">
            <div className="grid lg:grid-cols-3 gap-6">
              {/* Products Section */}
              <div className="lg:col-span-2 space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Pilih Produk</CardTitle>
                    <div className="flex gap-2 mt-2">
                      <Button
                        size="sm"
                        variant={selectedCategory === 'all' ? 'default' : 'outline'}
                        onClick={() => setSelectedCategory('all')}
                      >
                        Semua
                      </Button>
                      {categories.map((category) => (
                        <Button
                          key={category}
                          size="sm"
                          variant={selectedCategory === category ? 'default' : 'outline'}
                          onClick={() => setSelectedCategory(category)}
                        >
                          {category}
                        </Button>
                      ))}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[500px]">
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {filteredProducts.map((product) => (
                          <Card
                            key={product.id}
                            className="cursor-pointer hover:shadow-lg transition-shadow border-2 hover:border-blue-400"
                            onClick={() => addToCart(product)}
                          >
                            <CardContent className="p-4">
                              <div className="aspect-square bg-gradient-to-br from-blue-100 to-purple-100 rounded-lg mb-3 flex items-center justify-center">
                                <Package className="h-12 w-12 text-blue-600" />
                              </div>
                              <h3 className="font-semibold text-sm mb-1 truncate">{product.name}</h3>
                              <p className="text-lg font-bold text-blue-600 mb-1">
                                {formatCurrency(product.price)}
                              </p>
                              <div className="flex items-center justify-between">
                                <Badge variant={product.stock > 10 ? 'default' : 'destructive'} className="text-xs">
                                  Stok: {product.stock}
                                </Badge>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </div>

              {/* Cart Section */}
              <div className="space-y-4">
                <Card className="sticky top-24">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <ShoppingCart className="h-5 w-5" />
                      Keranjang
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <ScrollArea className="h-[300px]">
                      {cart.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                          <ShoppingCart className="h-12 w-12 mx-auto mb-2 opacity-50" />
                          <p>Keranjang kosong</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {cart.map((item) => (
                            <div key={item.productId} className="p-3 border rounded-lg space-y-2">
                              <div className="flex justify-between items-start">
                                <div className="flex-1">
                                  <p className="font-medium text-sm">{item.name}</p>
                                  <p className="text-sm text-gray-600">
                                    {formatCurrency(item.price)}
                                  </p>
                                </div>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-6 w-6"
                                  onClick={() => removeFromCart(item.productId)}
                                >
                                  <Trash2 className="h-4 w-4 text-red-500" />
                                </Button>
                              </div>
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <Button
                                    size="icon"
                                    variant="outline"
                                    className="h-7 w-7"
                                    onClick={() => updateCartQuantity(item.productId, -1)}
                                  >
                                    <Minus className="h-3 w-3" />
                                  </Button>
                                  <span className="w-8 text-center font-medium">{item.quantity}</span>
                                  <Button
                                    size="icon"
                                    variant="outline"
                                    className="h-7 w-7"
                                    onClick={() => updateCartQuantity(item.productId, 1)}
                                  >
                                    <Plus className="h-3 w-3" />
                                  </Button>
                                </div>
                                <p className="font-bold text-blue-600">
                                  {formatCurrency(item.price * item.quantity)}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </ScrollArea>

                    <Separator />

                    <div className="space-y-3">
                      {/* Voucher Section */}
                      <div className="space-y-2">
                        <Label className="flex items-center gap-2">
                          <Ticket className="h-4 w-4" />
                          Kode Voucher
                        </Label>
                        {!appliedVoucher ? (
                          <div className="flex gap-2">
                            {vouchers.length > 0 ? (
  <div className="flex flex-wrap gap-2">
    {vouchers.map((v) => (
      <Button key={v.id} variant="secondary" onClick={() => { setVoucherCode(v.code); handleApplyVoucher(); }}>
        {v.code}
      </Button>
    ))}
  </div>
) : null}
                          </div>
                        ) : (
                          <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-medium text-green-800">{appliedVoucher.code}</p>
                                <p className="text-sm text-green-600">
                                  Diskon: {formatCurrency(appliedVoucher.discountAmount)}
                                </p>
                              </div>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7"
                                onClick={handleRemoveVoucher}
                              >
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>

                      <Separator />

                      {/* Price Breakdown */}
                      {appliedVoucher && (
                        <div className="space-y-1">
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-600">Subtotal:</span>
                            <span>{formatCurrency(calculateSubtotal())}</span>
                          </div>
                          <div className="flex justify-between items-center text-sm text-green-600">
                            <span>Diskon Voucher:</span>
                            <span>-{formatCurrency(appliedVoucher.discountAmount)}</span>
                          </div>
                          <Separator />
                        </div>
                      )}

                      <div className="flex justify-between items-center text-lg font-bold">
                        <span>Total:</span>
                        <span className="text-blue-600">{formatCurrency(calculateTotal())}</span>
                      </div>

                      <div className="space-y-2">
                        <Label>Metode Pembayaran</Label>
                        <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="cash">Tunai</SelectItem>
                            <SelectItem value="card">Kartu</SelectItem>
                            <SelectItem value="e-wallet">E-Wallet</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {paymentMethod === 'cash' && (
                        <div className="space-y-2">
                          <Label>Uang Diterima</Label>
                          <Input
                            type="number"
                            placeholder="0"
                            value={cashReceived}
                            onChange={(e) => setCashReceived(e.target.value)}
                          />
                          {cashReceived && parseFloat(cashReceived) >= calculateTotal() && (
                            <div className="p-2 bg-green-50 border border-green-200 rounded">
                              <p className="text-sm text-green-800">
                                Kembalian: <span className="font-bold">{formatCurrency(calculateChange())}</span>
                              </p>
                            </div>
                          )}
                        </div>
                      )}

                      <Button
                        className="w-full"
                        size="lg"
                        onClick={handleCheckout}
                        disabled={cart.length === 0}
                      >
                        Checkout
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Products Tab */}
          <TabsContent value="products" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Manajemen Produk</CardTitle>
                    <CardDescription>Kelola semua produk Anda</CardDescription>
                  </div>
                  <Dialog open={showProductDialog} onOpenChange={setShowProductDialog}>
                    <DialogTrigger asChild>
                      <Button onClick={resetProductForm}>
                        <Plus className="h-4 w-4 mr-2" />
                        Tambah Produk
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>{isEditMode ? 'Edit Produk' : 'Tambah Produk Baru'}</DialogTitle>
                        <DialogDescription>
                          {isEditMode ? 'Perbarui informasi produk' : 'Masukkan detail produk baru'}
                        </DialogDescription>
                      </DialogHeader>
                      <form onSubmit={handleProductSubmit} className="space-y-4">
                        <div className="space-y-2">
                          <Label>Nama Produk</Label>
                          <Input
                            required
                            value={productForm.name}
                            onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                            placeholder="Contoh: Kopi Susu"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Harga</Label>
                            <Input
                              type="number"
                              required
                              value={productForm.price}
                              onChange={(e) => setProductForm({ ...productForm, price: e.target.value })}
                              placeholder="15000"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Stok</Label>
                            <Input
                              type="number"
                              required
                              value={productForm.stock}
                              onChange={(e) => setProductForm({ ...productForm, stock: e.target.value })}
                              placeholder="100"
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>Kategori</Label>
                          <Input
                            required
                            value={productForm.category}
                            onChange={(e) => setProductForm({ ...productForm, category: e.target.value })}
                            placeholder="Contoh: Minuman"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>SKU (Opsional)</Label>
                          <Input
                            value={productForm.sku}
                            onChange={(e) => setProductForm({ ...productForm, sku: e.target.value })}
                            placeholder="SKU-001"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Deskripsi (Opsional)</Label>
                          <Input
                            value={productForm.description}
                            onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                            placeholder="Deskripsi produk"
                          />
                        </div>
                        <div className="flex gap-2">
                          <Button type="submit" className="flex-1">
                            {isEditMode ? 'Update' : 'Simpan'}
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                              setShowProductDialog(false);
                              resetProductForm();
                            }}
                          >
                            Batal
                          </Button>
                        </div>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[600px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>SKU</TableHead>
                        <TableHead>Nama</TableHead>
                        <TableHead>Kategori</TableHead>
                        <TableHead>Harga</TableHead>
                        <TableHead>Stok</TableHead>
                        <TableHead className="text-right">Aksi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {products.map((product) => (
                        <TableRow key={product.id}>
                          <TableCell className="font-mono text-sm">{product.sku}</TableCell>
                          <TableCell className="font-medium">{product.name}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{product.category}</Badge>
                          </TableCell>
                          <TableCell>{formatCurrency(product.price)}</TableCell>
                          <TableCell>
                            <Badge variant={product.stock > 10 ? 'default' : 'destructive'}>
                              {product.stock}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => handleEditProduct(product)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => handleDeleteProduct(product.id)}
                              >
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Vouchers Tab */}
          <TabsContent value="vouchers" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Manajemen Voucher</CardTitle>
                    <CardDescription>Kelola voucher potongan harga</CardDescription>
                  </div>
                  <Dialog open={showVoucherDialog} onOpenChange={setShowVoucherDialog}>
                    <DialogTrigger asChild>
                      <Button onClick={resetVoucherForm}>
                        <Plus className="h-4 w-4 mr-2" />
                        Tambah Voucher
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>{isEditVoucherMode ? 'Edit Voucher' : 'Tambah Voucher Baru'}</DialogTitle>
                        <DialogDescription>
                          Buat voucher dengan potongan harga Rp 1.000 - Rp 20.000
                        </DialogDescription>
                      </DialogHeader>
                      <form onSubmit={handleVoucherSubmit} className="space-y-4">
                        <div className="space-y-2">
                          <Label>Kode Voucher</Label>
                          <Input
                            required
                            value={voucherForm.code}
                            onChange={(e) => setVoucherForm({ ...voucherForm, code: e.target.value.toUpperCase() })}
                            placeholder="Contoh: DISKON5K"
                            maxLength={20}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Jumlah Diskon (Rp)</Label>
                          <Input
                            type="number"
                            required
                            min="1000"
                            max="20000"
                            step="1000"
                            value={voucherForm.discountAmount}
                            onChange={(e) => setVoucherForm({ ...voucherForm, discountAmount: e.target.value })}
                            placeholder="5000"
                          />
                          <p className="text-xs text-gray-500">Minimum Rp 1.000, Maximum Rp 20.000</p>
                        </div>
                        <div className="space-y-2">
                          <Label>Deskripsi</Label>
                          <Input
                            value={voucherForm.description}
                            onChange={(e) => setVoucherForm({ ...voucherForm, description: e.target.value })}
                            placeholder="Deskripsi voucher"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Batas Penggunaan</Label>
                            <Input
                              type="number"
                              min="1"
                              value={voucherForm.usageLimit}
                              onChange={(e) => setVoucherForm({ ...voucherForm, usageLimit: e.target.value })}
                              placeholder="Unlimited"
                            />
                            <p className="text-xs text-gray-500">Kosongkan untuk unlimited</p>
                          </div>
                          <div className="space-y-2">
                            <Label>Tanggal Kadaluarsa</Label>
                            <Input
                              type="date"
                              value={voucherForm.expiryDate}
                              onChange={(e) => setVoucherForm({ ...voucherForm, expiryDate: e.target.value })}
                            />
                            <p className="text-xs text-gray-500">Opsional</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id="isActive"
                            checked={voucherForm.isActive}
                            onChange={(e) => setVoucherForm({ ...voucherForm, isActive: e.target.checked })}
                            className="rounded"
                          />
                          <Label htmlFor="isActive">Voucher Aktif</Label>
                        </div>
                        <div className="flex gap-2">
                          <Button type="submit" className="flex-1">
                            {isEditVoucherMode ? 'Update' : 'Simpan'}
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                              setShowVoucherDialog(false);
                              resetVoucherForm();
                            }}
                          >
                            Batal
                          </Button>
                        </div>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[600px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Kode</TableHead>
                        <TableHead>Diskon</TableHead>
                        <TableHead>Deskripsi</TableHead>
                        <TableHead>Penggunaan</TableHead>
                        <TableHead>Kadaluarsa</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Aksi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {vouchers.map((voucher) => (
                        <TableRow key={voucher.id}>
                          <TableCell className="font-mono font-bold">{voucher.code}</TableCell>
                          <TableCell className="font-bold text-green-600">
                            {formatCurrency(voucher.discountAmount)}
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate">
                            {voucher.description || '-'}
                          </TableCell>
                          <TableCell>
                            <span className="text-sm">
                              {voucher.usageCount} / {voucher.usageLimit || '∞'}
                            </span>
                          </TableCell>
                          <TableCell>
                            {voucher.expiryDate ? (
                              <span className="text-sm">
                                {new Date(voucher.expiryDate).toLocaleDateString('id-ID')}
                              </span>
                            ) : (
                              <span className="text-gray-400 text-sm">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant={voucher.isActive ? 'default' : 'secondary'}>
                              {voucher.isActive ? 'Aktif' : 'Nonaktif'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => handleEditVoucher(voucher)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => handleDeleteVoucher(voucher.id)}
                              >
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Reports Tab */}
          <TabsContent value="reports" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div>
                    <CardTitle>Laporan Pemasukan Bulanan</CardTitle>
                    <CardDescription>Analisis penjualan per bulan</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Select value={selectedMonth.toString()} onValueChange={(v) => setSelectedMonth(parseInt(v))}>
                      <SelectTrigger className="w-[140px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                          <SelectItem key={month} value={month.toString()}>
                            {getMonthName(month)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v))}>
                      <SelectTrigger className="w-[100px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(year => (
                          <SelectItem key={year} value={year.toString()}>
                            {year}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {isClosedMonth && (
                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex items-center gap-3">
                    <Lock className="h-5 w-5 text-yellow-600" />
                    <div>
                      <p className="font-medium text-yellow-800">Bulan Ini Sudah Ditutup</p>
                      <p className="text-sm text-yellow-700">Periode ini telah dikunci dan tidak dapat diubah</p>
                    </div>
                  </div>
                )}

                {monthlyReport && (
                  <>
                    <div className="grid gap-4 md:grid-cols-3">
                      <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm font-medium">Total Pemasukan</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-3xl font-bold">
                            {formatCurrency(monthlyReport.totalIncome)}
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm font-medium">Total Transaksi</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-3xl font-bold">
                            {monthlyReport.totalTransactions}
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm font-medium">Rata-rata per Transaksi</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-3xl font-bold">
                            {formatCurrency(monthlyReport.totalIncome / monthlyReport.totalTransactions || 0)}
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Payment Methods */}
                    <Card>
                      <CardHeader>
                        <CardTitle>Metode Pembayaran</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {Object.entries(monthlyReport.paymentMethods).map(([method, data]) => (
                            <div key={method} className="flex items-center justify-between p-3 border rounded-lg">
                              <div>
                                <p className="font-medium capitalize">
                                  {method === 'cash' ? 'Tunai' : method === 'card' ? 'Kartu' : 'E-Wallet'}
                                </p>
                                <p className="text-sm text-gray-500">{data.count} transaksi</p>
                              </div>
                              <p className="font-bold text-blue-600">{formatCurrency(data.total)}</p>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>

                    {/* Top Products */}
                    <Card>
                      <CardHeader>
                        <CardTitle>Produk Terlaris</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ScrollArea className="h-[300px]">
                          <div className="space-y-3">
                            {monthlyReport.topProducts.map((product, index) => (
                              <div key={product.productId} className="flex items-center gap-4 p-3 border rounded-lg">
                                <div className="flex items-center justify-center w-8 h-8 bg-blue-100 text-blue-600 font-bold rounded-full text-sm">
                                  {index + 1}
                                </div>
                                <div className="flex-1">
                                  <p className="font-medium">{product.name}</p>
                                  <p className="text-sm text-gray-500">{product.quantity} terjual</p>
                                </div>
                                <p className="font-bold text-blue-600">{formatCurrency(product.total)}</p>
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                      </CardContent>
                    </Card>

                    {/* Monthly Closing Button */}
                    {!isClosedMonth && (
                      <Card className="border-blue-200 bg-blue-50">
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2 text-blue-800">
                            <Lock className="h-5 w-5" />
                            Tutup Bulan
                          </CardTitle>
                          <CardDescription>
                            Setelah bulan ditutup, tidak ada transaksi yang dapat ditambahkan untuk periode ini
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <Button onClick={handleMonthlyClosing} className="w-full" variant="default">
                            Tutup Bulan {getMonthName(selectedMonth)} {selectedYear}
                          </Button>
                        </CardContent>
                      </Card>
                    )}
                  </>
                )}
              </CardContent>
            </Card>

            {/* Closing History */}
            <Card>
              <CardHeader>
                <CardTitle>Riwayat Penutupan Bulan</CardTitle>
                <CardDescription>Daftar bulan yang sudah ditutup</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[300px]">
                  <div className="space-y-3">
                    {closings.length === 0 ? (
                      <p className="text-center text-gray-500 py-8">Belum ada bulan yang ditutup</p>
                    ) : (
                      closings.map((closing) => (
                        <div key={closing.id} className="flex items-center justify-between p-4 border rounded-lg bg-gray-50">
                          <div>
                            <p className="font-medium flex items-center gap-2">
                              <Lock className="h-4 w-4 text-blue-600" />
                              {getMonthName(closing.month)} {closing.year}
                            </p>
                            <p className="text-sm text-gray-500">
                              Ditutup: {formatDate(closing.closedAt)}
                            </p>
                            <p className="text-sm text-gray-600 mt-1">
                              {closing.totalTransactions} transaksi
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-2xl font-bold text-green-600">
                              {formatCurrency(closing.totalIncome)}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Transactions Tab */}
          <TabsContent value="transactions" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Riwayat Transaksi</CardTitle>
                <CardDescription>Semua transaksi penjualan</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[600px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tanggal</TableHead>
                        <TableHead>Items</TableHead>
                        <TableHead>Metode</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead className="text-right">Aksi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {transactions.map((transaction) => (
                        <TableRow key={transaction.id}>
                          <TableCell className="text-sm">
                            {formatDate(transaction.date)}
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              {transaction.items.map((item, idx) => (
                                <p key={idx} className="text-sm">
                                  {item.name} x{item.quantity}
                                </p>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="capitalize">
                              {transaction.paymentMethod === 'cash' ? 'Tunai' :
                                transaction.paymentMethod === 'card' ? 'Kartu' : 'E-Wallet'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-bold text-blue-600">
                            {formatCurrency(transaction.total)}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => handlePrintReceipt(transaction)}
                                title="Cetak Ulang Struk"
                              >
                                <Printer className="h-4 w-4 text-blue-600" />
                              </Button>
                              {user.role === 'admin' && (
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => handleDeleteTransaction(transaction.id)}
                                  title="Hapus Transaksi"
                                >
                                  <Trash2 className="h-4 w-4 text-red-500" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Receipt Settings Tab */}
          <TabsContent value="receipt-settings" className="space-y-4">
            <div className="grid gap-6 md:grid-cols-12">
              {/* Form Section */}
              <Card className="md:col-span-7 shadow-sm">
                <CardHeader>
                  <CardTitle>Pengaturan Cetak Struk</CardTitle>
                  <CardDescription>Sesuaikan tampilan struk belanja untuk printer thermal Anda</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSaveReceiptSettings} className="space-y-4">
                    <div className="space-y-2">
                      <Label>Logo Toko (Maksimal 1MB)</Label>
                      <div className="flex items-center gap-4">
                        {receiptForm.logo ? (
                          <div className="relative border rounded-lg p-2 bg-gray-50 flex items-center justify-center h-20 w-20">
                            <img src={receiptForm.logo} alt="Logo Toko" className="max-h-full max-w-full object-contain" />
                            <button
                              type="button"
                              onClick={() => setReceiptForm({ ...receiptForm, logo: '' })}
                              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow hover:bg-red-600 transition"
                              title="Hapus Logo"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        ) : (
                          <div className="border border-dashed rounded-lg h-20 w-20 flex flex-col items-center justify-center text-gray-400 bg-gray-50">
                            <Upload className="h-6 w-6" />
                            <span className="text-[10px] mt-1">Belum ada</span>
                          </div>
                        )}
                        <div className="flex-1">
                          <Input
                            type="file"
                            accept="image/png, image/jpeg, image/jpg"
                            onChange={(e) => {
                              const file = e.target.files[0];
                              if (file) {
                                if (file.size > 1024 * 1024) {
                                  toast.error('Ukuran file logo maksimal 1MB');
                                  e.target.value = '';
                                  return;
                                }
                                const reader = new FileReader();
                                reader.onloadend = () => {
                                  setReceiptForm({ ...receiptForm, logo: reader.result });
                                };
                                reader.readAsDataURL(file);
                              }
                            }}
                          />
                          <p className="text-xs text-gray-500 mt-1">Gunakan file PNG atau JPG dengan latar belakang transparan/putih untuk hasil cetak terbaik.</p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Nama Toko</Label>
                      <Input
                        value={receiptForm.storeName}
                        onChange={(e) => setReceiptForm({ ...receiptForm, storeName: e.target.value })}
                        placeholder={user.tenantName || 'Nama Toko Anda'}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>No. Telepon</Label>
                        <Input
                          value={receiptForm.phone}
                          onChange={(e) => setReceiptForm({ ...receiptForm, phone: e.target.value })}
                          placeholder="Contoh: 081234567890"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Ukuran Kertas</Label>
                        <Select
                          value={receiptForm.paperSize}
                          onValueChange={(val) => setReceiptForm({ ...receiptForm, paperSize: val })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Pilih ukuran kertas" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="58mm">58mm (Thermal Standar)</SelectItem>
                            <SelectItem value="80mm">80mm (Thermal Lebar)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Ukuran Font</Label>
                        <Select
                          value={receiptForm.fontSize}
                          onValueChange={(val) => setReceiptForm({ ...receiptForm, fontSize: val })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Pilih ukuran font" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="kecil">Kecil</SelectItem>
                            <SelectItem value="normal">Normal</SelectItem>
                            <SelectItem value="besar">Besar</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Alamat Toko</Label>
                      <Input
                        value={receiptForm.address}
                        onChange={(e) => setReceiptForm({ ...receiptForm, address: e.target.value })}
                        placeholder="Alamat lengkap toko Anda"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Catatan Atas (Header Note)</Label>
                      <Input
                        value={receiptForm.headerText}
                        onChange={(e) => setReceiptForm({ ...receiptForm, headerText: e.target.value })}
                        placeholder="Contoh: Wifi: KopiMajuPass / Selamat Belanja"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Catatan Bawah (Footer Note)</Label>
                      <Input
                        value={receiptForm.footerText}
                        onChange={(e) => setReceiptForm({ ...receiptForm, footerText: e.target.value })}
                        placeholder="Contoh: Barang yang sudah dibeli tidak dapat ditukar"
                      />
                    </div>

                    <Button type="submit" className="w-full">
                      Simpan Perubahan
                    </Button>
                  </form>
                </CardContent>
              </Card>

              {/* Preview Section */}
              <Card className="md:col-span-5 shadow-sm bg-gray-50 flex flex-col">
                <CardHeader>
                  <CardTitle className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Live Preview Struk</CardTitle>
                </CardHeader>
                <CardContent className="flex-1 flex items-center justify-center p-6 overflow-auto">
                  <div
                    className={`bg-white p-4 border border-gray-200 rounded shadow-md font-mono text-black leading-tight ${
                      receiptForm.fontSize === 'kecil' ? 'text-[10px]' : receiptForm.fontSize === 'besar' ? 'text-sm' : 'text-xs'
                    }`}
                    style={{
                      width: receiptForm.paperSize === '80mm' ? '280px' : '200px',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)'
                    }}
                  >
                    {/* Logo Preview */}
                    {receiptForm.logo && (
                      <div className="flex justify-center mb-2">
                        <img src={receiptForm.logo} alt="Logo Preview" className="max-h-12 max-w-[80px] object-contain" />
                      </div>
                    )}

                    {/* Store Info */}
                    <div className="text-center bold text-sm uppercase font-bold tracking-wide">
                      {receiptForm.storeName || user.tenantName || 'NAMA TOKO'}
                    </div>
                    {receiptForm.address && <div className="text-center mt-1">{receiptForm.address}</div>}
                    {receiptForm.phone && <div className="text-center">Telp: {receiptForm.phone}</div>}

                    <div className="border-t border-dashed border-black my-2"></div>

                    {/* Header Text */}
                    {receiptForm.headerText && (
                      <>
                        <div className="text-center my-1">{receiptForm.headerText}</div>
                        <div className="border-t border-dashed border-black my-2"></div>
                      </>
                    )}

                    {/* Transaction Details */}
                    <div>
                      <div>ID: TX-MOCK123</div>
                      <div>Tgl: {new Date().toLocaleDateString('id-ID')} {new Date().toLocaleTimeString('id-ID')}</div>
                      <div>Metode: Tunai</div>
                    </div>

                    <div className="border-t border-dashed border-black my-2"></div>

                    {/* Items List */}
                    <div className="space-y-1">
                      <div className="flex justify-between font-semibold">
                        <span>Kopi Susu Gula Aren</span>
                        <span>2 x 15.000</span>
                      </div>
                      <div className="text-right text-[10px] text-gray-500">Rp30.000</div>
                      
                      <div className="flex justify-between font-semibold">
                        <span>Roti Bakar Cokelat</span>
                        <span>1 x 12.000</span>
                      </div>
                      <div className="text-right text-[10px] text-gray-500">Rp12.000</div>
                    </div>

                    <div className="border-t border-dashed border-black my-2"></div>

                    {/* Calculations */}
                    <div className="space-y-1 font-semibold">
                      <div className="flex justify-between">
                        <span>Subtotal</span>
                        <span>Rp42.000</span>
                      </div>
                      <div className="flex justify-between text-gray-700">
                        <span>Diskon (PROMO5K)</span>
                        <span>-Rp5.000</span>
                      </div>
                      <div className="flex justify-between font-bold text-sm border-t border-dotted border-black pt-1">
                        <span>TOTAL</span>
                        <span>Rp37.000</span>
                      </div>
                      <div className="flex justify-between pt-1">
                        <span>Tunai Diterima</span>
                        <span>Rp50.000</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Kembalian</span>
                        <span>Rp13.000</span>
                      </div>
                    </div>

                    {/* Footer Text */}
                    {receiptForm.footerText && (
                      <>
                        <div className="border-t border-dashed border-black my-2"></div>
                        <div className="text-center mt-1 text-[10px] whitespace-pre-wrap">{receiptForm.footerText}</div>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Tenants Tab - Super Admin Only */}
          <TabsContent value="tenants" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Tenant Management</CardTitle>
                    <CardDescription>Kelola semua tenant/organisasi dalam sistem</CardDescription>
                  </div>
                  <Dialog open={showTenantDialog} onOpenChange={setShowTenantDialog}>
                    <DialogTrigger asChild>
                      <Button>
                        <Plus className="h-4 w-4 mr-2" />
                        Tambah Tenant
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Buat Tenant & Admin Baru</DialogTitle>
                        <DialogDescription>
                          Tenant baru akan otomatis dibuatkan akun admin
                        </DialogDescription>
                      </DialogHeader>
                      <form onSubmit={handleTenantSubmit} className="space-y-4">
                        <div className="space-y-2">
                          <Label>Nama Tenant/Organisasi</Label>
                          <Input
                            required
                            value={tenantForm.name}
                            onChange={(e) => setTenantForm({ ...tenantForm, name: e.target.value })}
                            placeholder="Contoh: Toko Makmur"
                          />
                        </div>
                        <Separator />
                        <p className="text-sm font-medium">Data Admin:</p>
                        <div className="space-y-2">
                          <Label>Username Admin</Label>
                          <Input
                            required
                            value={tenantForm.adminUsername}
                            onChange={(e) => setTenantForm({ ...tenantForm, adminUsername: e.target.value })}
                            placeholder="admin_toko"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Password Admin</Label>
                          <Input
                            type="password"
                            required
                            value={tenantForm.adminPassword}
                            onChange={(e) => setTenantForm({ ...tenantForm, adminPassword: e.target.value })}
                            placeholder="Min 8 karakter, huruf besar, simbol"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Nama Lengkap Admin</Label>
                          <Input
                            required
                            value={tenantForm.adminName}
                            onChange={(e) => setTenantForm({ ...tenantForm, adminName: e.target.value })}
                            placeholder="Nama Admin"
                          />
                        </div>
                        <div className="flex gap-2">
                          <Button type="submit" className="flex-1">Buat Tenant</Button>
                          <Button type="button" variant="outline" onClick={() => setShowTenantDialog(false)}>Batal</Button>
                        </div>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nama Tenant</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Dibuat</TableHead>
                      <TableHead>ID</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tenants.map((tenant) => (
                      <TableRow key={tenant.id}>
                        <TableCell className="font-medium">{tenant.name}</TableCell>
                        <TableCell>
                          <Badge variant={tenant.isActive ? 'default' : 'secondary'}>
                            {tenant.isActive ? 'Aktif' : 'Nonaktif'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-gray-500">
                          {new Date(tenant.createdAt).toLocaleDateString('id-ID')}
                        </TableCell>
                        <TableCell className="font-mono text-xs">{tenant.id.substring(0, 8)}...</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Users Tab - Super Admin Only */}
          <TabsContent value="users" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>User Management</CardTitle>
                    <CardDescription>Kelola semua users dalam sistem</CardDescription>
                  </div>
                  <Dialog open={showUserDialog} onOpenChange={setShowUserDialog}>
                    <DialogTrigger asChild>
                      <Button>
                        <Plus className="h-4 w-4 mr-2" />
                        Tambah User
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Buat User Baru</DialogTitle>
                        <DialogDescription>
                          Tambahkan admin atau user (kasir) untuk tenant
                        </DialogDescription>
                      </DialogHeader>
                      <form onSubmit={handleUserSubmit} className="space-y-4">
                        <div className="space-y-2">
                          <Label>Username</Label>
                          <Input
                            required
                            value={userForm.username}
                            onChange={(e) => setUserForm({ ...userForm, username: e.target.value })}
                            placeholder="username"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Password</Label>
                          <Input
                            type="password"
                            required
                            value={userForm.password}
                            onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                            placeholder="Min 8 karakter, huruf besar, simbol"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Nama Lengkap</Label>
                          <Input
                            required
                            value={userForm.name}
                            onChange={(e) => setUserForm({ ...userForm, name: e.target.value })}
                            placeholder="Nama lengkap"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Role</Label>
                          <Select value={userForm.role} onValueChange={(v) => setUserForm({ ...userForm, role: v })}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="admin">Admin</SelectItem>
                              <SelectItem value="user">User (Kasir)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Tenant</Label>
                          <Select value={userForm.tenantId} onValueChange={(v) => setUserForm({ ...userForm, tenantId: v })}>
                            <SelectTrigger>
                              <SelectValue placeholder="Pilih tenant" />
                            </SelectTrigger>
                            <SelectContent>
                              {tenants.map((tenant) => (
                                <SelectItem key={tenant.id} value={tenant.id}>
                                  {tenant.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex gap-2">
                          <Button type="submit" className="flex-1">Buat User</Button>
                          <Button type="button" variant="outline" onClick={() => setShowUserDialog(false)}>Batal</Button>
                        </div>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Username</TableHead>
                      <TableHead>Nama</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Tenant</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((u) => (
                      <TableRow key={u.id}>
                        <TableCell className="font-mono text-sm">{u.username}</TableCell>
                        <TableCell className="font-medium">{u.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">{u.role}</Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          {u.tenantId ? (
                            tenants.find(t => t.id === u.tenantId)?.name || 'Unknown'
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={u.isActive ? 'default' : 'secondary'}>
                            {u.isActive ? 'Aktif' : 'Nonaktif'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleDeleteUser(u.id)}
                            disabled={u.id === user.id}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Print Receipt Dialog */}
          <Dialog open={showPrintDialog} onOpenChange={setShowPrintDialog}>
            <DialogContent className="max-w-[400px]">
              <DialogHeader>
                <DialogTitle>Transaksi Berhasil</DialogTitle>
                <DialogDescription>
                  Struk pembelian telah dibuat. Anda dapat langsung mencetaknya sekarang.
                </DialogDescription>
              </DialogHeader>
              
              {/* Receipt Preview */}
              {lastTransaction && (
                <div className="flex flex-col items-center justify-center py-4 bg-gray-50 border rounded-lg max-h-[400px] overflow-y-auto">
                  <div
                    className={`bg-white p-4 border rounded shadow-sm font-mono text-black leading-tight text-left ${
                      receiptSettings.fontSize === 'kecil' ? 'text-[10px]' : receiptSettings.fontSize === 'besar' ? 'text-sm' : 'text-xs'
                    }`}
                    style={{
                      width: receiptSettings.paperSize === '80mm' ? '280px' : '200px',
                    }}
                  >
                    {/* Logo Preview */}
                    {receiptSettings.logo && (
                      <div className="flex justify-center mb-2">
                        <img src={receiptSettings.logo} alt="Logo" className="max-h-12 max-w-[80px] object-contain" />
                      </div>
                    )}

                    {/* Store Info */}
                    <div className="text-center bold text-sm uppercase font-bold">
                      {receiptSettings.storeName || user.tenantName || 'NAMA TOKO'}
                    </div>
                    {receiptSettings.address && <div className="text-center mt-0.5">{receiptSettings.address}</div>}
                    {receiptSettings.phone && <div className="text-center">Telp: {receiptSettings.phone}</div>}

                    <div className="border-t border-dashed border-black my-2"></div>

                    {/* Header Text */}
                    {receiptSettings.headerText && (
                      <>
                        <div className="text-center my-1">{receiptSettings.headerText}</div>
                        <div className="border-t border-dashed border-black my-2"></div>
                      </>
                    )}

                    {/* Transaction Details */}
                    <div>
                      <div>ID: {lastTransaction.id.substring(0, 8)}...</div>
                      <div>Tgl: {new Date(lastTransaction.date || lastTransaction.createdAt).toLocaleString('id-ID')}</div>
                      <div className="capitalize font-bold">Metode: {lastTransaction.paymentMethod === 'cash' ? 'Tunai' : lastTransaction.paymentMethod === 'card' ? 'Kartu' : 'E-Wallet'}</div>
                    </div>

                    <div className="border-t border-dashed border-black my-2"></div>

                    {/* Items List */}
                    <div className="space-y-1">
                      {lastTransaction.items.map((item, idx) => (
                        <div key={idx}>
                          <div className="flex justify-between font-semibold">
                            <span>{item.name}</span>
                            <span>{item.quantity} x {formatCurrency(item.price).replace('Rp', '').trim()}</span>
                          </div>
                          <div className="text-right text-[10px] text-gray-500">{formatCurrency(item.price * item.quantity)}</div>
                        </div>
                      ))}
                    </div>

                    <div className="border-t border-dashed border-black my-2"></div>

                    {/* Calculations */}
                    <div className="space-y-0.5 font-semibold">
                      <div className="flex justify-between">
                        <span>Subtotal</span>
                        <span>{formatCurrency(lastTransaction.subtotal || lastTransaction.total + lastTransaction.voucherDiscount)}</span>
                      </div>
                      {lastTransaction.voucherDiscount > 0 && (
                        <div className="flex justify-between text-gray-700">
                          <span>Diskon ({lastTransaction.voucherCode || 'Voucher'})</span>
                          <span>-{formatCurrency(lastTransaction.voucherDiscount)}</span>
                        </div>
                      )}
                      <div className="flex justify-between font-bold text-sm border-t border-dotted border-black pt-1">
                        <span>TOTAL</span>
                        <span>{formatCurrency(lastTransaction.total)}</span>
                      </div>
                      {lastTransaction.cashReceived !== null && lastTransaction.cashReceived !== undefined && (
                        <>
                          <div className="flex justify-between pt-1">
                            <span>Tunai Diterima</span>
                            <span>{formatCurrency(lastTransaction.cashReceived)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Kembalian</span>
                            <span>{formatCurrency(lastTransaction.change || 0)}</span>
                          </div>
                        </>
                      )}
                    </div>

                    {/* Footer Text */}
                    {receiptSettings.footerText && (
                      <>
                        <div className="border-t border-dashed border-black my-2"></div>
                        <div className="text-center mt-1 text-[10px] whitespace-pre-wrap">{receiptSettings.footerText}</div>
                      </>
                    )}
                  </div>
                </div>
              )}

              <div className="flex gap-2 mt-4">
                <Button onClick={() => handlePrintReceipt(lastTransaction)} className="flex-1 gap-2">
                  <Printer className="h-4 w-4" /> Cetak Bill
                </Button>
                <Button onClick={() => setShowPrintDialog(false)} variant="outline" className="flex-1">
                  Tutup
                </Button>
              </div>
            </DialogContent>
          </Dialog>

        </Tabs>
      </div>
    </div>
  );
}