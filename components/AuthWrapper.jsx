'use client';

import { useState, useEffect, createContext, useContext } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { ShoppingCart, LogOut, Users } from 'lucide-react';

// Create auth context
const AuthContext = createContext(null);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthWrapper');
  }
  return context;
}

export function AuthWrapper({ children }) {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    // Real auth implementation
    try {
      const response = await fetch('/api/auth/me');
      const data = await response.json();
      
      if (data.success) {
        setUser(data.data);
        setLoading(false);
      } else {
        setLoading(false);
        router.push('/login');
      }
    } catch (error) {
      setLoading(false);
      router.push('/login');
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      toast.success('Logout berhasil');
      router.push('/login');
    } catch (error) {
      toast.error('Logout gagal');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <AuthContext.Provider value={{ user, logout: handleLogout }}>
      {/* Auth Header Bar */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-2 px-4">
        <div className="container mx-auto flex items-center justify-between text-sm">
          <div className="flex items-center gap-4">
            <span className="font-medium">{user.name}</span>
            <Badge variant="secondary" className="text-xs capitalize">
              {user.role}
            </Badge>
            {user.tenantName && (
              <span className="text-blue-100 text-xs">{user.tenantName}</span>
            )}
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleLogout}
            className="text-white hover:bg-white/20 h-8 gap-1"
          >
            <LogOut className="h-3 w-3" />
            Logout
          </Button>
        </div>
      </div>
      
      {/* Pass user context to children */}
      {children}
    </AuthContext.Provider>
  );
}
