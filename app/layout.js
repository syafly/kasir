import { Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from '@/components/ui/sonner';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'Aplikasi Kasir Pro - Sistem Manajemen Penjualan',
  description: 'Aplikasi kasir modern dengan fitur lengkap untuk manajemen penjualan, laporan bulanan, dan closing',
};

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <body className={inter.className}>
        {children}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}