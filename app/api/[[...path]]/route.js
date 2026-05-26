import { MongoClient } from 'mongodb';
import { tenantConfig } from '../../../lib/tenant-config.js';
import { connectToTenantDatabase } from '../../../lib/connectTenantDatabase.js';
import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';

const uri = process.env.MONGO_URL;
const dbName = process.env.DB_NAME || 'kasir_app';

let cachedClient = null;
let cachedDb = null;

// Simple session storage
const sessions = new Map();

function createSession(userId, userData) {
  const sessionId = Array.from({ length: 32 }, () => 
    Math.floor(Math.random() * 16).toString(16)
  ).join('');
  
  sessions.set(sessionId, {
    userId,
    ...userData,
    createdAt: new Date(),
    lastAccess: new Date()
  });
  
  setTimeout(() => sessions.delete(sessionId), 24 * 60 * 60 * 1000);
  return sessionId;
}

function getSession(sessionId) {
  const session = sessions.get(sessionId);
  if (session) {
    session.lastAccess = new Date();
    return session;
  }
  return null;
}

function deleteSession(sessionId) {
  return sessions.delete(sessionId);
}

async function connectToDatabase() {
  if (cachedClient && cachedDb) {
    return { client: cachedClient, db: cachedDb };
  }

  // Ensure we have a valid MongoDB connection string. Fallback to localhost if not set.
  const connectionString = uri || process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017';
  const client = await MongoClient.connect(connectionString, {
    maxPoolSize: 10,
    minPoolSize: 5,
  });

  const db = client.db(dbName);

  // Check if system needs initialization
  try {
    const usersCount = await db.collection('users').countDocuments().catch(() => 0);
    if (usersCount === 0) {
      console.log('🚀 Database empty! Auto-initializing system...');
      const { initializeSystem } = await import('../../../lib/init-system.js');
      await initializeSystem();
      console.log('✅ System auto-initialized successfully!');
    }
  } catch (e) {
    console.error('❌ Auto-initialization failed:', e);
  }

  cachedClient = client;
  cachedDb = db;

  return { client, db };
}

// Helper function to parse request body
async function getRequestBody(request) {
  try {
    return await request.json();
  } catch (error) {
    return null;
  }
}

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function GET(request) {
  try {
    const { db } = await connectToDatabase();
    const { pathname, searchParams } = new URL(request.url);
    const path = pathname.replace('/api/', '');

    // Auth endpoint: GET /api/auth/me
    if (path === 'auth/me') {
      const sessionId = request.cookies.get('session_id')?.value;
      if (!sessionId) {
        return NextResponse.json(
          { success: false, error: 'Not authenticated' },
          { status: 401, headers: corsHeaders }
        );
      }
      
      const session = getSession(sessionId);
      if (!session) {
        return NextResponse.json(
          { success: false, error: 'Session expired' },
          { status: 401, headers: corsHeaders }
        );
      }
      
      return NextResponse.json({
        success: true,
        data: {
          id: session.id,
          username: session.username,
          name: session.name,
          role: session.role,
          tenantId: session.tenantId,
          tenantName: session.tenantName
        }
      }, { headers: corsHeaders });
    }

    // Get all tenants (super admin only)
    if (path === 'tenants') {
      const sessionId = request.cookies.get('session_id')?.value;
      if (!sessionId) {
        return NextResponse.json(
          { success: false, error: 'Not authenticated' },
          { status: 401, headers: corsHeaders }
        );
      }
      
      const session = getSession(sessionId);
      if (!session || session.role !== 'superadmin') {
        return NextResponse.json(
          { success: false, error: 'Unauthorized' },
          { status: 403, headers: corsHeaders }
        );
      }
      
      const tenants = await db.collection('tenants')
        .find({})
        .sort({ createdAt: -1 })
        .toArray();
      return NextResponse.json({ success: true, data: tenants }, { headers: corsHeaders });
    }

    // Get all users (super admin sees all, admin sees their tenant)
    if (path === 'users') {
      const sessionId = request.cookies.get('session_id')?.value;
      if (!sessionId) {
        return NextResponse.json(
          { success: false, error: 'Not authenticated' },
          { status: 401, headers: corsHeaders }
        );
      }
      
      const session = getSession(sessionId);
      if (!session) {
        return NextResponse.json(
          { success: false, error: 'Session expired' },
          { status: 401, headers: corsHeaders }
        );
      }
      
      let query = {};
      if (session.role === 'admin') {
        // Admin only sees users in their tenant
        query.tenantId = session.tenantId;
      } else if (session.role !== 'superadmin') {
        // Regular users cannot access this
        return NextResponse.json(
          { success: false, error: 'Unauthorized' },
          { status: 403, headers: corsHeaders }
        );
      }
      // Super admin sees all users (no query filter)
      
      const users = await db.collection('users')
        .find(query)
        .sort({ createdAt: -1 })
        .toArray();
      
      // Remove password from response
      const sanitizedUsers = users.map(u => {
        const { password, ...userWithoutPassword } = u;
        return userWithoutPassword;
      });
      
      return NextResponse.json({ success: true, data: sanitizedUsers }, { headers: corsHeaders });
    }

    // Get all products
    if (path === 'products') {
      const sessionId = request.cookies.get('session_id')?.value;
      const session = getSession(sessionId);

      if (!session) {
        return NextResponse.json(
          { success: false, error: 'Not authenticated' },
          { status: 401, headers: corsHeaders }
        );
      }

      const { db: tenantDb } = await connectToTenantDatabase(session.tenantId);

      const category = searchParams.get('category');
      let query = {};

      if (category && category !== 'all') {
        query.category = category;
      }

      const products = await tenantDb.collection('products')
        .find(query)
        .sort({ name: 1 })
        .toArray();
      return NextResponse.json({ success: true, data: products }, { headers: corsHeaders });
    }

    // Get all categories
    if (path === 'categories') {
      const sessionId = request.cookies.get('session_id')?.value;
      const session = getSession(sessionId);

      if (!session) {
        return NextResponse.json(
          { success: false, error: 'Not authenticated' },
          { status: 401, headers: corsHeaders }
        );
      }

      const { db: tenantDb } = await connectToTenantDatabase(session.tenantId);
      const categories = await tenantDb.collection('products').distinct('category', {});
      return NextResponse.json({ success: true, data: categories }, { headers: corsHeaders });
    }

    // Get all vouchers
    if (path === 'vouchers') {
      const sessionId = request.cookies.get('session_id')?.value;
      const session = getSession(sessionId);

      if (!session) {
        return NextResponse.json(
          { success: false, error: 'Not authenticated' },
          { status: 401, headers: corsHeaders }
        );
      }

      const { db: tenantDb } = await connectToTenantDatabase(session.tenantId);
      const vouchers = await tenantDb.collection('vouchers')
        .find({})
        .sort({ createdAt: -1 })
        .toArray();
      return NextResponse.json({ success: true, data: vouchers }, { headers: corsHeaders });
    }

    // Validate voucher
    if (path.startsWith('vouchers/validate/')) {
      const voucherCode = path.replace('vouchers/validate/', '');
      
      const sessionId = request.cookies.get('session_id')?.value;
      const session = getSession(sessionId);

      if (!session || !session.tenantId) {
        return NextResponse.json(
          { success: false, error: 'Not authenticated' },
          { status: 401, headers: corsHeaders }
        );
      }

      const { db: tenantDb } = await connectToTenantDatabase(session.tenantId);
      const voucher = await tenantDb.collection('vouchers').findOne({ code: voucherCode.toUpperCase() });
      
      if (!voucher) {
        return NextResponse.json(
          { success: false, error: 'Voucher tidak ditemukan' },
          { status: 404, headers: corsHeaders }
        );
      }

      if (!voucher.isActive) {
        return NextResponse.json(
          { success: false, error: 'Voucher tidak aktif' },
          { status: 400, headers: corsHeaders }
        );
      }

      if (voucher.expiryDate && new Date(voucher.expiryDate) < new Date()) {
        return NextResponse.json(
          { success: false, error: 'Voucher sudah kadaluarsa' },
          { status: 400, headers: corsHeaders }
        );
      }

      if (voucher.usageLimit && voucher.usageCount >= voucher.usageLimit) {
        return NextResponse.json(
          { success: false, error: 'Voucher sudah mencapai batas penggunaan' },
          { status: 400, headers: corsHeaders }
        );
      }

      return NextResponse.json({
        success: true,
        data: {
          code: voucher.code,
          discountAmount: voucher.discountAmount,
          description: voucher.description
        }
      }, { headers: corsHeaders });
    }

    // Get all transactions
    if (path === 'transactions') {
      const sessionId = request.cookies.get('session_id')?.value;
      const session = getSession(sessionId);

      if (!session) {
        return NextResponse.json(
          { success: false, error: 'Not authenticated' },
          { status: 401, headers: corsHeaders }
        );
      }

      const month = searchParams.get('month');
      const year = searchParams.get('year');

      let query = {};

      if (month && year) {
        const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
        const endDate = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59);
        query.date = { $gte: startDate.toISOString(), $lte: endDate.toISOString() };
      }

      // Get tenant-specific DB connection
      const tenantConn = await connectToTenantDatabase(session.tenantId);
      const tenantDb = tenantConn.db;
      const transactions = await tenantDb.collection('transactions')
        .find(query)
        .sort({ date: -1 })
        .limit(100)
        .toArray();
      return NextResponse.json({ success: true, data: transactions }, { headers: corsHeaders });
    }

    // Get dashboard stats
    if (path === 'dashboard/stats') {
      const sessionId = request.cookies.get('session_id')?.value;
      const session = getSession(sessionId);

      if (!session) {
        return NextResponse.json(
          { success: false, error: 'Not authenticated' },
          { status: 401, headers: corsHeaders }
        );
      }

      const { db: tenantDb } = await connectToTenantDatabase(session.tenantId);
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const startOfYear = new Date(today.getFullYear(), 0, 1);

      // Today's sales
      const todaySales = await tenantDb.collection('transactions')
        .find({ date: { $gte: startOfDay.toISOString() } })
        .toArray();
      const todayTotal = todaySales.reduce((sum, t) => sum + t.total, 0);

      // This month's sales
      const monthSales = await tenantDb.collection('transactions')
        .find({ date: { $gte: startOfMonth.toISOString() } })
        .toArray();
      const monthTotal = monthSales.reduce((sum, t) => sum + t.total, 0);

      // This year's sales
      const yearSales = await tenantDb.collection('transactions')
        .find({ date: { $gte: startOfYear.toISOString() } })
        .toArray();
      const yearTotal = yearSales.reduce((sum, t) => sum + t.total, 0);

      // Product count
      const productCount = await tenantDb.collection('products').countDocuments();

      // Low stock products
      const lowStockProducts = await tenantDb.collection('products')
        .find({ stock: { $lte: 10 } })
        .toArray();

      return NextResponse.json({
        success: true,
        data: {
          todaySales: todayTotal,
          todayTransactions: todaySales.length,
          monthSales: monthTotal,
          monthTransactions: monthSales.length,
          yearSales: yearTotal,
          productCount,
          lowStockCount: lowStockProducts.length,
          lowStockProducts
        }
      }, { headers: corsHeaders });
    }

    // Get monthly report
    if (path === 'reports/monthly') {
      const sessionId = request.cookies.get('session_id')?.value;
      const session = getSession(sessionId);

      if (!session) {
        return NextResponse.json(
          { success: false, error: 'Not authenticated' },
          { status: 401, headers: corsHeaders }
        );
      }

      const { db: tenantDb } = await connectToTenantDatabase(session.tenantId);
      const month = searchParams.get('month');
      const year = searchParams.get('year');
      
      if (!month || !year) {
        return NextResponse.json(
          { success: false, error: 'Month and year are required' },
          { status: 400, headers: corsHeaders }
        );
      }

      const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
      const endDate = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59);

      const transactions = await tenantDb.collection('transactions')
        .find({
          date: { $gte: startDate.toISOString(), $lte: endDate.toISOString() }
        })
        .sort({ date: 1 })
        .toArray();

      const totalIncome = transactions.reduce((sum, t) => sum + t.total, 0);
      const totalTransactions = transactions.length;

      // Group by payment method
      const paymentMethods = {};
      transactions.forEach(t => {
        if (!paymentMethods[t.paymentMethod]) {
          paymentMethods[t.paymentMethod] = { count: 0, total: 0 };
        }
        paymentMethods[t.paymentMethod].count++;
        paymentMethods[t.paymentMethod].total += t.total;
      });

      // Top products
      const productSales = {};
      transactions.forEach(t => {
        t.items.forEach(item => {
          if (!productSales[item.productId]) {
            productSales[item.productId] = {
              name: item.name,
              quantity: 0,
              total: 0
            };
          }
          productSales[item.productId].quantity += item.quantity;
          productSales[item.productId].total += item.quantity * item.price;
        });
      });

      const topProducts = Object.entries(productSales)
        .map(([id, data]) => ({ productId: id, ...data }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 10);

      // Daily sales chart data
      const dailySales = {};
      transactions.forEach(t => {
        const date = new Date(t.date).toISOString().split('T')[0];
        if (!dailySales[date]) {
          dailySales[date] = 0;
        }
        dailySales[date] += t.total;
      });

      return NextResponse.json({
        success: true,
        data: {
          month: parseInt(month),
          year: parseInt(year),
          totalIncome,
          totalTransactions,
          paymentMethods,
          topProducts,
          dailySales,
          transactions
        }
      }, { headers: corsHeaders });
    }

    // Get monthly closings
    if (path === 'closings') {
      const sessionId = request.cookies.get('session_id')?.value;
      const session = getSession(sessionId);

      if (!session) {
        return NextResponse.json(
          { success: false, error: 'Not authenticated' },
          { status: 401, headers: corsHeaders }
        );
      }

      const { db: tenantDb } = await connectToTenantDatabase(session.tenantId);

      const closings = await tenantDb.collection('monthly_closings')
        .find({})
        .sort({ year: -1, month: -1 })
        .toArray();
      return NextResponse.json({ success: true, data: closings }, { headers: corsHeaders });
    }

    // Check if month is closed
    if (path === 'closings/check') {
      const month = searchParams.get('month');
      const year = searchParams.get('year');
      
      if (!month || !year) {
        return NextResponse.json(
          { success: false, error: 'Month and year are required' },
          { status: 400, headers: corsHeaders }
        );
      }

      const sessionId = request.cookies.get('session_id')?.value;
      const session = getSession(sessionId);
      if (!session || !session.tenantId) {
        return NextResponse.json(
          { success: false, error: 'Not authenticated' },
          { status: 401, headers: corsHeaders }
        );
      }

      const { db: tenantDb } = await connectToTenantDatabase(session.tenantId);
      const closing = await tenantDb.collection('monthly_closings').findOne({
        month: parseInt(month),
        year: parseInt(year)
      });

      return NextResponse.json({
        success: true,
        data: { isClosed: !!closing, closing }
      }, { headers: corsHeaders });
    }

    // Get receipt settings
    if (path === 'receipt-settings') {
      const sessionId = request.cookies.get('session_id')?.value;
      const session = getSession(sessionId);

      if (!session || !session.tenantId) {
        return NextResponse.json(
          { success: false, error: 'Not authenticated' },
          { status: 401, headers: corsHeaders }
        );
      }

      const { db: tenantDb } = await connectToTenantDatabase(session.tenantId);
      const settings = await tenantDb.collection('receipt_settings').findOne({ id: 'default' });

      if (!settings) {
        return NextResponse.json({
          success: true,
          data: {
            logo: '',
            storeName: session.tenantName || 'Nama Toko',
            address: '',
            phone: '',
            headerText: '',
            footerText: 'Terima kasih atas kunjungan Anda!',
            paperSize: '58mm',
            fontSize: 'normal'
          }
        }, { headers: corsHeaders });
      }

      return NextResponse.json({ success: true, data: settings }, { headers: corsHeaders });
    }

    return NextResponse.json(
      { success: false, error: 'Endpoint not found' },
      { status: 404, headers: corsHeaders }
    );

  } catch (error) {
    console.error('GET Error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function POST(request) {
  try {
    const { db } = await connectToDatabase();
    const { pathname } = new URL(request.url);
    const path = pathname.replace('/api/', '');
    const body = await getRequestBody(request);

    // Auth endpoint: POST /api/auth/login
    if (path === 'auth/login') {
      const { username, password } = body;
      
      console.log('Login attempt:', username);
      
      if (!username || !password) {
        return NextResponse.json(
          { success: false, error: 'Username dan password wajib diisi' },
          { status: 400, headers: corsHeaders }
        );
      }
      
      let user = await db.collection('users').findOne({
          username: username.toLowerCase(),
          isActive: true
        });
        if (!user) {
          // Search in tenant databases
          for (const tenantId of Object.keys(tenantConfig)) {
            const { db: tenantDb } = await connectToTenantDatabase(tenantId);
            const found = await tenantDb.collection('users').findOne({
              username: username.toLowerCase(),
              isActive: true
            });
            if (found) {
              user = found;
              break;
            }
          }
        }
      
      console.log('User found:', !!user);
      
      if (!user) {
        return NextResponse.json(
          { success: false, error: 'Username atau password salah' },
          { status: 401, headers: corsHeaders }
        );
      }
      
      console.log('Comparing password...');
      const isValid = await bcrypt.compare(password, user.password);
      console.log('Password valid:', isValid);
      
      if (!isValid) {
        return NextResponse.json(
          { success: false, error: 'Username atau password salah' },
          { status: 401, headers: corsHeaders }
        );
      }
      
      let tenant = null;
        if (user.tenantId) {
          // Retrieve tenant info from appropriate DB
          const { db: tenantDb } = await connectToTenantDatabase(user.tenantId);
          tenant = await tenantDb.collection('tenants').findOne({ id: user.tenantId });
        }
      
      const sessionData = {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
        tenantId: user.tenantId,
        tenantName: tenant?.name || null
      };
      
      const sessionId = createSession(user.id, sessionData);
      
      const response = NextResponse.json({
        success: true,
        data: sessionData
      }, { headers: corsHeaders });
      
      response.cookies.set('session_id', sessionId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 24 * 60 * 60,
        path: '/'
      });
      
      return response;
    }

    // Auth endpoint: POST /api/auth/logout
    if (path === 'auth/logout') {
      const sessionId = request.cookies.get('session_id')?.value;
      if (sessionId) {
        deleteSession(sessionId);
      }
      
      const response = NextResponse.json({
        success: true,
        message: 'Logout berhasil'
      }, { headers: corsHeaders });
      
      response.cookies.delete('session_id', { path: '/' });
      return response;
    }

    // Create tenant (super admin only)
    if (path === 'tenants') {
      const sessionId = request.cookies.get('session_id')?.value;
      const session = getSession(sessionId);
      
      if (!session || session.role !== 'superadmin') {
        return NextResponse.json(
          { success: false, error: 'Unauthorized' },
          { status: 403, headers: corsHeaders }
        );
      }
      
      const { name, adminUsername, adminPassword, adminName } = body;
      
      if (!name || !adminUsername || !adminPassword || !adminName) {
        return NextResponse.json(
          { success: false, error: 'Semua field wajib diisi' },
          { status: 400, headers: corsHeaders }
        );
      }
      
      // Validate password
      if (adminPassword.length < 8) {
        return NextResponse.json(
          { success: false, error: 'Password minimal 8 karakter' },
          { status: 400, headers: corsHeaders }
        );
      }
      
      if (!/[A-Z]/.test(adminPassword)) {
        return NextResponse.json(
          { success: false, error: 'Password harus mengandung huruf besar' },
          { status: 400, headers: corsHeaders }
        );
      }
      
      if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(adminPassword)) {
        return NextResponse.json(
          { success: false, error: 'Password harus mengandung simbol' },
          { status: 400, headers: corsHeaders }
        );
      }
      
      // Check if username already exists
      const existingUser = await db.collection('users').findOne({ 
        username: adminUsername.toLowerCase() 
      });
      
      if (existingUser) {
        return NextResponse.json(
          { success: false, error: 'Username sudah digunakan' },
          { status: 400, headers: corsHeaders }
        );
      }
      
      // Create tenant
      const tenantId = uuidv4();
        // Generate connection info for the new tenant
        const tenantUri = process.env.MONGO_URL || 'mongodb://127.0.0.1:27017';
        const tenantDbName = `${tenantId}_db`;
        const tenant = {
          id: tenantId,
          name,
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          uri: tenantUri,
          dbName: tenantDbName
        };
      
      await db.collection('tenants').insertOne(tenant);
      
      // Create admin user for this tenant
      const hashedPassword = await bcrypt.hash(adminPassword, 10);
      const admin = {
        id: uuidv4(),
        username: adminUsername.toLowerCase(),
        password: hashedPassword,
        name: adminName,
        role: 'admin',
        tenantId: tenantId,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      await db.collection('users').insertOne(admin);
      
      return NextResponse.json({ 
        success: true, 
        data: { tenant, admin: { ...admin, password: undefined } } 
      }, { headers: corsHeaders });
    }

    // Create user (super admin only)
    if (path === 'users') {
      const sessionId = request.cookies.get('session_id')?.value;
      const session = getSession(sessionId);
      
      if (!session || session.role !== 'superadmin') {
        return NextResponse.json(
          { success: false, error: 'Unauthorized - Only super admin can create users' },
          { status: 403, headers: corsHeaders }
        );
      }
      
      const { username, password, name, role, tenantId } = body;
      
      if (!username || !password || !name || !role) {
        return NextResponse.json(
          { success: false, error: 'Semua field wajib diisi' },
          { status: 400, headers: corsHeaders }
        );
      }
      
      if (role !== 'admin' && role !== 'user') {
        return NextResponse.json(
          { success: false, error: 'Role harus admin atau user' },
          { status: 400, headers: corsHeaders }
        );
      }
      
      if (!tenantId) {
        return NextResponse.json(
          { success: false, error: 'TenantId wajib diisi' },
          { status: 400, headers: corsHeaders }
        );
      }
      
      // Validate password
      if (password.length < 8 || !/[A-Z]/.test(password) || !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
        return NextResponse.json(
          { success: false, error: 'Password minimal 8 karakter, harus ada huruf besar dan simbol' },
          { status: 400, headers: corsHeaders }
        );
      }
      
      // Check if username exists
      const existingUser = await db.collection('users').findOne({ 
        username: username.toLowerCase() 
      });
      
      if (existingUser) {
        return NextResponse.json(
          { success: false, error: 'Username sudah digunakan' },
          { status: 400, headers: corsHeaders }
        );
      }
      
      // Check if tenant exists
      const tenant = await db.collection('tenants').findOne({ id: tenantId });
      if (!tenant) {
        return NextResponse.json(
          { success: false, error: 'Tenant tidak ditemukan' },
          { status: 400, headers: corsHeaders }
        );
      }
      
      const hashedPassword = await bcrypt.hash(password, 10);
      const user = {
        id: uuidv4(),
        username: username.toLowerCase(),
        password: hashedPassword,
        name,
        role,
        tenantId,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      await db.collection('users').insertOne(user);
      
      const { password: _, ...userWithoutPassword } = user;
      return NextResponse.json({ success: true, data: userWithoutPassword }, { headers: corsHeaders });
    }

    // Create product
    if (path === 'products') {
      // Get session to get tenantId
      const sessionId = request.cookies.get('session_id')?.value;
      const session = getSession(sessionId);

      if (!session || !session.tenantId) {
        return NextResponse.json({ success: false, error: 'Not authenticated or no tenant' }, { status: 401, headers: corsHeaders });
      }

      const { name, price, stock, category, description, sku } = body;

      if (!name || !price || stock === undefined || !category) {
        return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400, headers: corsHeaders });
      }

      const { db: tenantDb } = await connectToTenantDatabase(session.tenantId);

      const product = {
        id: uuidv4(),
        name,
        price: parseFloat(price),
        stock: parseInt(stock),
        category,
        description: description || '',
        sku: sku || `SKU-${Date.now()}`,
      };

      await tenantDb.collection('products').insertOne(product);
      return NextResponse.json({ success: true, data: product }, { headers: corsHeaders });
    }

      // Create voucher
    if (path === 'vouchers') {
      // Get session to get tenantId
      const sessionId = request.cookies.get('session_id')?.value;
      const session = getSession(sessionId);
      
      if (!session || !session.tenantId) {
        return NextResponse.json(
          { success: false, error: 'Not authenticated or no tenant' },
          { status: 401, headers: corsHeaders }
        );
      }
      
      const { code, discountAmount, description, isActive, usageLimit, expiryDate } = body;
      
      if (!code || !discountAmount) {
        return NextResponse.json(
          { success: false, error: 'Kode dan jumlah diskon wajib diisi' },
          { status: 400, headers: corsHeaders }
        );
      }

      if (discountAmount < 1000 || discountAmount > 20000) {
        return NextResponse.json(
          { success: false, error: 'Jumlah diskon harus antara Rp 1.000 - Rp 20.000' },
          { status: 400, headers: corsHeaders }
        );
      }

      // Create voucher (tenant‑aware, tanpa tenantId)
      const { db: tenantDb } = await connectToTenantDatabase(session.tenantId);
      const voucher = {
        id: uuidv4(),
        code: code.toUpperCase(),
        discountAmount: parseFloat(discountAmount),
        description: description || '',
        isActive: isActive !== false,
        usageLimit: usageLimit ? parseInt(usageLimit) : null,
        usageCount: 0,
        expiryDate: expiryDate || null,
        // tenantId dihapus karena DB sudah terisolasi per tenant
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await tenantDb.collection('vouchers').insertOne(voucher);
      return NextResponse.json({ success: true, data: voucher }, { headers: corsHeaders });
    }

    // Create transaction
    if (path === 'transactions') {
      // Get session to get tenantId
      const sessionId = request.cookies.get('session_id')?.value;
      const session = getSession(sessionId);
      
      if (!session || !session.tenantId) {
        return NextResponse.json(
          { success: false, error: 'Not authenticated or no tenant' },
          { status: 401, headers: corsHeaders }
        );
      }
      
      const { items, paymentMethod, totalAmount, total, cashReceived, change, voucherCode, voucherDiscount, subtotal } = body;
      const actualTotalAmount = totalAmount !== undefined && totalAmount !== null ? totalAmount : total;
      
      if (!items || items.length === 0 || !paymentMethod || actualTotalAmount === undefined || actualTotalAmount === null) {
        return NextResponse.json(
          { success: false, error: 'Missing required fields' },
          { status: 400, headers: corsHeaders }
        );
      }

      // Create transaction (tenant‑aware, tanpa tenantId)
      const { db: tenantDb } = await connectToTenantDatabase(session.tenantId);

      // Check if current month is closed
      const now = new Date();
      const currentMonth = now.getMonth() + 1;
      const currentYear = now.getFullYear();
      
      const closing = await tenantDb.collection('monthly_closings').findOne({
        month: currentMonth,
        year: currentYear
      });

      if (closing) {
        return NextResponse.json(
          { success: false, error: 'Bulan ini sudah ditutup. Tidak dapat menambah transaksi.' },
          { status: 400, headers: corsHeaders }
        );
      }

      // Update product stock
      for (const item of items) {
        await tenantDb.collection('products').updateOne(
          { id: item.productId },
          { 
            $inc: { stock: -item.quantity },
            $set: { updatedAt: new Date().toISOString() }
          }
        );
      }

      // Update voucher usage count if voucher was used
      if (voucherCode) {
        await tenantDb.collection('vouchers').updateOne(
          { code: voucherCode.toUpperCase() },
          { 
            $inc: { usageCount: 1 },
            $set: { updatedAt: new Date().toISOString() }
          }
        );
      }

      const transaction = {
        id: uuidv4(),
        items,
        subtotal: subtotal ? parseFloat(subtotal) : parseFloat(actualTotalAmount),
        voucherCode: voucherCode || null,
        voucherDiscount: voucherDiscount ? parseFloat(voucherDiscount) : 0,
        total: parseFloat(actualTotalAmount),
        paymentMethod,
        cashReceived: cashReceived ? parseFloat(cashReceived) : null,
        change: change ? parseFloat(change) : null,
        // tenantId dihapus karena DB terisolasi per tenant
        date: new Date().toISOString(),
        createdAt: new Date().toISOString()
      };

      await tenantDb.collection('transactions').insertOne(transaction);
await db.collection('transactions').insertOne({ ...transaction, tenantId: session.tenantId });
return NextResponse.json({ success: true, data: transaction }, { headers: corsHeaders });
    }

    // Create monthly closing
    if (path === 'closings') {
      const sessionId = request.cookies.get('session_id')?.value;
      const session = getSession(sessionId);

      if (!session || !session.tenantId) {
        return NextResponse.json(
          { success: false, error: 'Not authenticated' },
          { status: 401, headers: corsHeaders }
        );
      }

      const { db: tenantDb } = await connectToTenantDatabase(session.tenantId);
      const { month, year } = body;
      
      if (!month || !year) {
        return NextResponse.json(
          { success: false, error: 'Month and year are required' },
          { status: 400, headers: corsHeaders }
        );
      }

      // Check if already closed
      const existing = await tenantDb.collection('monthly_closings').findOne({
        month: parseInt(month),
        year: parseInt(year)
      });

      if (existing) {
        return NextResponse.json(
          { success: false, error: 'Bulan ini sudah ditutup sebelumnya' },
          { status: 400, headers: corsHeaders }
        );
      }

      // Get monthly report data
      const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
      const endDate = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59);

      const transactions = await tenantDb.collection('transactions')
        .find({
          date: { $gte: startDate.toISOString(), $lte: endDate.toISOString() }
        })
        .toArray();

      const totalIncome = transactions.reduce((sum, t) => sum + t.total, 0);
      const totalTransactions = transactions.length;

      const closing = {
        id: uuidv4(),
        month: parseInt(month),
        year: parseInt(year),
        totalIncome,
        totalTransactions,
        closedAt: new Date().toISOString(),
        createdAt: new Date().toISOString()
      };

      await tenantDb.collection('monthly_closings').insertOne(closing);
      return NextResponse.json({ success: true, data: closing }, { headers: corsHeaders });
    }

    return NextResponse.json(
      { success: false, error: 'Endpoint not found' },
      { status: 404, headers: corsHeaders }
    );

  } catch (error) {
    console.error('POST Error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function PUT(request) {
  try {
    const { db } = await connectToDatabase();
    const { pathname } = new URL(request.url);
    const path = pathname.replace('/api/', '');
    const body = await getRequestBody(request);

    // Update user
    if (path.startsWith('users/')) {
      const sessionId = request.cookies.get('session_id')?.value;
      const session = getSession(sessionId);
      
      if (!session || (session.role !== 'superadmin' && session.role !== 'admin')) {
        return NextResponse.json(
          { success: false, error: 'Unauthorized' },
          { status: 403, headers: corsHeaders }
        );
      }
      
      const userId = path.replace('users/', '');
      const { name, isActive, password } = body;
      
      const updateData = {
        updatedAt: new Date().toISOString()
      };
      
      if (name) updateData.name = name;
      if (isActive !== undefined) updateData.isActive = isActive;
      
      // If password is provided, hash it
      if (password) {
        if (password.length < 8 || !/[A-Z]/.test(password) || !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
          return NextResponse.json(
            { success: false, error: 'Password minimal 8 karakter, harus ada huruf besar dan simbol' },
            { status: 400, headers: corsHeaders }
          );
        }
        updateData.password = await bcrypt.hash(password, 10);
      }
      
      const result = await db.collection('users').findOneAndUpdate(
        { id: userId },
        { $set: updateData },
        { returnDocument: 'after' }
      );

      if (!result) {
        return NextResponse.json(
          { success: false, error: 'User not found' },
          { status: 404, headers: corsHeaders }
        );
      }

      const { password: _, ...userWithoutPassword } = result;
      return NextResponse.json({ success: true, data: userWithoutPassword }, { headers: corsHeaders });
    }

    // Update voucher
    if (path.startsWith('vouchers/')) {
      const sessionId = request.cookies.get('session_id')?.value;
      const session = getSession(sessionId);

      if (!session || !session.tenantId) {
        return NextResponse.json(
          { success: false, error: 'Not authenticated' },
          { status: 401, headers: corsHeaders }
        );
      }

      const { db: tenantDb } = await connectToTenantDatabase(session.tenantId);
      const voucherId = path.replace('vouchers/', '');
      const { code, discountAmount, description, isActive, usageLimit, expiryDate } = body;
      
      const updateData = {
        updatedAt: new Date().toISOString()
      };
      
      if (code) updateData.code = code.toUpperCase();
      if (discountAmount !== undefined) {
        if (discountAmount < 1000 || discountAmount > 20000) {
          return NextResponse.json(
            { success: false, error: 'Jumlah diskon harus antara Rp 1.000 - Rp 20.000' },
            { status: 400, headers: corsHeaders }
          );
        }
        updateData.discountAmount = parseFloat(discountAmount);
      }
      if (description !== undefined) updateData.description = description;
      if (isActive !== undefined) updateData.isActive = isActive;
      if (usageLimit !== undefined) updateData.usageLimit = usageLimit ? parseInt(usageLimit) : null;
      if (expiryDate !== undefined) updateData.expiryDate = expiryDate;

      const result = await tenantDb.collection('vouchers').findOneAndUpdate(
        { id: voucherId },
        { $set: updateData },
        { returnDocument: 'after' }
      );

      if (!result) {
        return NextResponse.json(
          { success: false, error: 'Voucher not found' },
          { status: 404, headers: corsHeaders }
        );
      }

      return NextResponse.json({ success: true, data: result }, { headers: corsHeaders });
    }

    // Update product
    if (path.startsWith('products/')) {
      const sessionId = request.cookies.get('session_id')?.value;
      const session = getSession(sessionId);

      if (!session || !session.tenantId) {
        return NextResponse.json(
          { success: false, error: 'Not authenticated' },
          { status: 401, headers: corsHeaders }
        );
      }

      const { db: tenantDb } = await connectToTenantDatabase(session.tenantId);
      const productId = path.replace('products/', '');
      const { name, price, stock, category, description, sku } = body;
      
      const updateData = {
        updatedAt: new Date().toISOString()
      };
      
      if (name) updateData.name = name;
      if (price !== undefined) updateData.price = parseFloat(price);
      if (stock !== undefined) updateData.stock = parseInt(stock);
      if (category) updateData.category = category;
      if (description !== undefined) updateData.description = description;
      if (sku) updateData.sku = sku;

      const result = await tenantDb.collection('products').findOneAndUpdate(
        { id: productId },
        { $set: updateData },
        { returnDocument: 'after' }
      );

      if (!result) {
        return NextResponse.json(
          { success: false, error: 'Product not found' },
          { status: 404, headers: corsHeaders }
        );
      }

      return NextResponse.json({ success: true, data: result }, { headers: corsHeaders });
    }

    // Update receipt settings
    if (path === 'receipt-settings') {
      const sessionId = request.cookies.get('session_id')?.value;
      const session = getSession(sessionId);

      if (!session || !session.tenantId) {
        return NextResponse.json(
          { success: false, error: 'Not authenticated' },
          { status: 401, headers: corsHeaders }
        );
      }

      if (session.role !== 'admin') {
        return NextResponse.json(
          { success: false, error: 'Unauthorized - Admin only' },
          { status: 403, headers: corsHeaders }
        );
      }

      const { db: tenantDb } = await connectToTenantDatabase(session.tenantId);
      const { logo, storeName, address, phone, headerText, footerText, paperSize, fontSize } = body;

      const updateData = {
        logo: logo || '',
        storeName: storeName || session.tenantName || 'Nama Toko',
        address: address || '',
        phone: phone || '',
        headerText: headerText || '',
        footerText: footerText || '',
        paperSize: paperSize || '58mm',
        fontSize: fontSize || 'normal',
        updatedAt: new Date().toISOString()
      };

      const result = await tenantDb.collection('receipt_settings').findOneAndUpdate(
        { id: 'default' },
        { $set: updateData },
        { upsert: true, returnDocument: 'after' }
      );

      return NextResponse.json({ success: true, data: result }, { headers: corsHeaders });
    }

    return NextResponse.json(
      { success: false, error: 'Endpoint not found' },
      { status: 404, headers: corsHeaders }
    );

  } catch (error) {
    console.error('PUT Error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function DELETE(request) {
  try {
    const { db } = await connectToDatabase();
    const { pathname } = new URL(request.url);
    const path = pathname.replace('/api/', '');

    // Delete user
    if (path.startsWith('users/')) {
      const sessionId = request.cookies.get('session_id')?.value;
      const session = getSession(sessionId);
      
      if (!session || (session.role !== 'superadmin' && session.role !== 'admin')) {
        return NextResponse.json(
          { success: false, error: 'Unauthorized' },
          { status: 403, headers: corsHeaders }
        );
      }
      
      const userId = path.replace('users/', '');
      
      // Prevent deleting yourself
      if (userId === session.id) {
        return NextResponse.json(
          { success: false, error: 'Cannot delete your own account' },
          { status: 400, headers: corsHeaders }
        );
      }
      
      const result = await db.collection('users').deleteOne({ id: userId });

      if (result.deletedCount === 0) {
        return NextResponse.json(
          { success: false, error: 'User not found' },
          { status: 404, headers: corsHeaders }
        );
      }

      return NextResponse.json(
        { success: true, message: 'User deleted successfully' },
        { headers: corsHeaders }
      );
    }

    // Delete voucher
    if (path.startsWith('vouchers/')) {
      const sessionId = request.cookies.get('session_id')?.value;
      const session = getSession(sessionId);

      if (!session || !session.tenantId) {
        return NextResponse.json(
          { success: false, error: 'Not authenticated' },
          { status: 401, headers: corsHeaders }
        );
      }

      const { db: tenantDb } = await connectToTenantDatabase(session.tenantId);
      const voucherId = path.replace('vouchers/', '');
      
      const result = await tenantDb.collection('vouchers').deleteOne({ id: voucherId });

      if (result.deletedCount === 0) {
        return NextResponse.json(
          { success: false, error: 'Voucher not found' },
          { status: 404, headers: corsHeaders }
        );
      }

      return NextResponse.json(
        { success: true, message: 'Voucher deleted successfully' },
        { headers: corsHeaders }
      );
    }

    // Delete transaction
    if (path.startsWith('transactions/')) {
        const transactionId = path.replace('transactions/', '');
        const sessionId = request.cookies.get('session_id')?.value;
        const session = getSession(sessionId);
        if (!session || (session.role !== 'superadmin' && session.role !== 'admin')) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403, headers: corsHeaders });
        }
        // Delete from tenant DB
        const tenantConn = await connectToTenantDatabase(session.tenantId);
        const tenantDb = tenantConn.db;
        const resultTenant = await tenantDb.collection('transactions').deleteOne({ id: transactionId });
        // Delete from shared DB
        const resultShared = await db.collection('transactions').deleteOne({ id: transactionId, tenantId: session.tenantId });
        if (resultTenant.deletedCount === 0) {
            return NextResponse.json({ success: false, error: 'Transaction not found' }, { status: 404, headers: corsHeaders });
        }
        return NextResponse.json({ success: true, message: 'Transaction deleted successfully' }, { headers: corsHeaders });
    }
    // Delete product
    if (path.startsWith('products/')) {
      const sessionId = request.cookies.get('session_id')?.value;
      const session = getSession(sessionId);

      if (!session || !session.tenantId) {
        return NextResponse.json(
          { success: false, error: 'Not authenticated' },
          { status: 401, headers: corsHeaders }
        );
      }

      const { db: tenantDb } = await connectToTenantDatabase(session.tenantId);
      const productId = path.replace('products/', '');
      
      const result = await tenantDb.collection('products').deleteOne({ id: productId });

      if (result.deletedCount === 0) {
        return NextResponse.json(
          { success: false, error: 'Product not found' },
          { status: 404, headers: corsHeaders }
        );
      }

      return NextResponse.json(
        { success: true, message: 'Product deleted successfully' },
        { headers: corsHeaders }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Endpoint not found' },
      { status: 404, headers: corsHeaders }
    );

  } catch (error) {
    console.error('DELETE Error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500, headers: corsHeaders }
    );
  }
}