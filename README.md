# 🛒 Aplikasi Kasir Pro

Aplikasi kasir modern dan lengkap dengan fitur manajemen penjualan, laporan bulanan, dan sistem closing yang kompleks.

## ✨ Fitur Utama

### 1. 📊 Dashboard
- **Statistik Real-time**: Penjualan hari ini, bulan ini, dan tahun berjalan
- **Monitoring Produk**: Total produk dan peringatan stok menipis
- **Riwayat Transaksi**: 10 transaksi terakhir ditampilkan
- **Alert Stok**: Notifikasi otomatis untuk produk dengan stok ≤ 10

### 2. 💰 Kasir (POS)
- **Interface User-Friendly**: Tampilan grid produk yang mudah dipilih
- **Keranjang Belanja**: Kelola item dengan mudah (tambah, kurangi, hapus)
- **Filter Kategori**: Cari produk berdasarkan kategori
- **Multiple Payment Methods**: 
  - Tunai (dengan kalkulasi kembalian otomatis)
  - Kartu
  - E-Wallet
- **Update Stok Otomatis**: Stok berkurang secara otomatis setelah checkout

### 3. 📦 Manajemen Produk
- **CRUD Lengkap**: Create, Read, Update, Delete produk
- **Informasi Detail**:
  - Nama produk
  - SKU (Stock Keeping Unit)
  - Harga
  - Stok
  - Kategori
  - Deskripsi
- **Tabel Interaktif**: Sortir dan cari produk dengan mudah
- **Badge Stok**: Visual indicator untuk status stok (hijau/merah)

### 4. 📈 Laporan Pemasukan Bulanan
- **Statistik Komprehensif**:
  - Total pemasukan
  - Total transaksi
  - Rata-rata per transaksi
- **Analisis Pembayaran**: Breakdown berdasarkan metode pembayaran
- **Produk Terlaris**: Top 10 produk dengan penjualan tertinggi
- **Grafik Penjualan Harian**: Visualisasi penjualan per hari
- **Filter Bulan & Tahun**: Lihat laporan periode tertentu

### 5. 🔒 Closing Bulanan (Fitur Kompleks)
- **Lock Sistem**: Kunci bulan tertentu agar tidak dapat diubah
- **Proteksi Data**: Transaksi baru pada bulan tertutup akan ditolak
- **Riwayat Closing**: Daftar lengkap bulan yang sudah ditutup
- **Snapshot Permanent**: Data closing tersimpan permanen
- **Visual Indicator**: Badge dan warning untuk bulan tertutup

### 6. 📝 Riwayat Transaksi
- **Daftar Lengkap**: Semua transaksi dengan detail item
- **Informasi Detail**:
  - Tanggal dan waktu transaksi
  - Daftar item yang dibeli
  - Metode pembayaran
  - Total pembayaran
- **Pencarian & Filter**: Cari transaksi berdasarkan periode

## 🎨 Desain & UX

- **Modern UI**: Menggunakan Tailwind CSS dengan gradient colors
- **Responsive**: Bekerja sempurna di desktop, tablet, dan mobile
- **Icon System**: Lucide React icons untuk visual yang jelas
- **Toast Notifications**: Feedback real-time untuk setiap aksi
- **Color Coding**: 
  - Biru: Transaksi harian
  - Hijau: Pemasukan bulanan
  - Ungu: Produk
  - Orange: Peringatan stok
  - Kuning: Bulan tertutup
- **Smooth Animations**: Transisi halus dengan Tailwind animate
- **Card-based Layout**: Organisasi informasi yang jelas

## 🛠️ Teknologi

- **Frontend**: Next.js 14 + React 18
- **Styling**: Tailwind CSS + shadcn/ui components
- **Database**: MongoDB
- **Backend**: Next.js API Routes
- **Icons**: Lucide React
- **Notifications**: Sonner (toast)
- **Forms**: React Hook Form + Zod validation
- **Date Handling**: date-fns

## 📋 Struktur Database

### Collections:

#### 1. products
```javascript
{
  id: "uuid",
  name: "string",
  price: number,
  stock: number,
  category: "string",
  description: "string",
  sku: "string",
  createdAt: "ISO date",
  updatedAt: "ISO date"
}
```

#### 2. transactions
```javascript
{
  id: "uuid",
  items: [
    {
      productId: "uuid",
      name: "string",
      price: number,
      quantity: number
    }
  ],
  total: number,
  paymentMethod: "cash" | "card" | "e-wallet",
  cashReceived: number (nullable),
  change: number (nullable),
  date: "ISO date",
  createdAt: "ISO date"
}
```

#### 3. monthly_closings
```javascript
{
  id: "uuid",
  month: number (1-12),
  year: number,
  totalIncome: number,
  totalTransactions: number,
  closedAt: "ISO date",
  createdAt: "ISO date"
}
```

## 🚀 Cara Menggunakan

### Setup Awal
1. Aplikasi sudah running di: https://xisy-kasir.vercel.app
2. Database MongoDB sudah terkonfigurasi otomatis
3. Tidak perlu instalasi tambahan

### Workflow Harian

1. **Mulai Hari**:
   - Buka Dashboard untuk cek statistik
   - Periksa stok yang menipis
   - Review transaksi kemarin

2. **Proses Penjualan**:
   - Masuk ke tab "Kasir"
   - Pilih produk dengan klik card
   - Item otomatis masuk keranjang
   - Atur quantity dengan tombol +/-
   - Pilih metode pembayaran
   - Jika tunai, masukkan uang diterima
   - Klik "Checkout"

3. **Kelola Produk**:
   - Masuk ke tab "Produk"
   - Klik "Tambah Produk" untuk produk baru
   - Klik icon edit untuk update
   - Klik icon hapus untuk menghapus

4. **Lihat Laporan**:
   - Masuk ke tab "Laporan"
   - Pilih bulan dan tahun
   - Review statistik pemasukan
   - Lihat produk terlaris
   - Analisis metode pembayaran

5. **Akhir Bulan**:
   - Masuk ke tab "Laporan"
   - Review laporan bulan tersebut
   - Klik "Tutup Bulan" untuk lock sistem
   - Konfirmasi penutupan
   - Bulan tersebut tidak dapat diubah lagi

### Tips Penggunaan

- **Stok Otomatis**: Stok akan berkurang otomatis setelah transaksi
- **Filter Kategori**: Gunakan filter di POS untuk cari produk lebih cepat
- **Closing Bulan**: Tutup bulan hanya jika yakin data sudah final
- **Backup Data**: Data closing tersimpan permanent di riwayat
- **Low Stock**: Perhatikan produk dengan badge merah untuk restock

## 🔐 Fitur Keamanan

- **Validasi Input**: Semua input divalidasi sebelum disimpan
- **Proteksi Closing**: Bulan tertutup tidak dapat dimodifikasi
- **Error Handling**: Semua error ditangani dengan graceful
- **Transaction Safety**: Update stok dalam transaksi atomik
- **Data Integrity**: UUID untuk mencegah collision

## 📊 Laporan yang Tersedia

1. **Dashboard Stats**:
   - Penjualan hari ini
   - Penjualan bulan ini
   - Penjualan tahun ini
   - Total produk
   - Stok menipis

2. **Monthly Report**:
   - Total pemasukan
   - Total transaksi
   - Rata-rata per transaksi
   - Breakdown payment methods
   - Top 10 produk terlaris
   - Daily sales chart

3. **Transaction History**:
   - Semua transaksi
   - Detail item per transaksi
   - Filter by date range

## 🎯 Keunggulan Sistem

1. **User-Friendly**: Interface intuitif, mudah dipelajari
2. **Real-time**: Data update langsung tanpa refresh
3. **Responsive**: Bekerja di semua device
4. **Reliable**: Error handling yang robust
5. **Scalable**: Arsitektur yang dapat dikembangkan
6. **Beautiful**: Design modern dengan UX terbaik
7. **Complete**: Semua fitur yang dibutuhkan toko
8. **Fast**: Performance optimal dengan caching

## 🔄 Future Enhancements (Opsional)

Fitur yang dapat ditambahkan di masa depan:
- Multi-user/multi-kasir support
- Print receipt/struk
- Barcode scanner integration
- Export laporan ke PDF/Excel
- Backup & restore database
- Dashboard analytics lebih detail
- Integrasi payment gateway
- Loyalty program
- Diskon & promo system
- Supplier management
- Purchase orders

## 📞 Support

Aplikasi ini siap digunakan untuk bisnis retail, toko, cafe, atau usaha sejenis yang membutuhkan sistem kasir yang reliable dan lengkap.

---

**Dibuat dengan menggunakan Next.js & MongoDB**

Aplikasi Kasir Pro - Sistem Manajemen Penjualan Modern
