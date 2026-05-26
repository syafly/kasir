// Auth API Routes
// This will be integrated into main route.js

import { MongoClient } from 'mongodb';
import { NextResponse } from 'next/server';
import { 
  validatePassword, 
  hashPassword, 
  comparePassword,
  createSession,
  getSession,
  deleteSession 
} from '../../lib/auth.js';
import { v4 as uuidv4 } from 'uuid';

const uri = process.env.MONGO_URL;
const dbName = process.env.DB_NAME || 'kasir_app';

let cachedClient = null;
let cachedDb = null;

async function connectToDatabase() {
  if (cachedClient && cachedDb) {
    return { client: cachedClient, db: cachedDb };
  }

  const client = await MongoClient.connect(uri, {
    maxPoolSize: 10,
    minPoolSize: 5,
  });

  const db = client.db(dbName);
  cachedClient = client;
  cachedDb = db;

  return { client, db };
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Session-ID',
};

// POST /api/auth/login
export async function handleLogin(request) {
  try {
    const { db } = await connectToDatabase();
    const { username, password } = await request.json();
    
    if (!username || !password) {
      return NextResponse.json(
        { success: false, error: 'Username dan password wajib diisi' },
        { status: 400, headers: corsHeaders }
      );
    }
    
    // Find user
    const user = await db.collection('users').findOne({ 
      username: username.toLowerCase(),
      isActive: true 
    });
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Username atau password salah' },
        { status: 401, headers: corsHeaders }
      );
    }
    
    // Compare password
    const isValidPassword = await comparePassword(password, user.password);
    if (!isValidPassword) {
      return NextResponse.json(
        { success: false, error: 'Username atau password salah' },
        { status: 401, headers: corsHeaders }
      );
    }
    
    // Get tenant info if user has tenantId
    let tenant = null;
    if (user.tenantId) {
      tenant = await db.collection('tenants').findOne({ id: user.tenantId });
    }
    
    // Create session
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
    
    // Set session cookie
    response.cookies.set('session_id', sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60, // 24 hours
      path: '/'
    });
    
    return response;
    
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan saat login' },
      { status: 500, headers: corsHeaders }
    );
  }
}

// POST /api/auth/logout
export async function handleLogout(request) {
  try {
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
    
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan saat logout' },
      { status: 500, headers: corsHeaders }
    );
  }
}

// GET /api/auth/me
export async function handleGetCurrentUser(request) {
  try {
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
    
  } catch (error) {
    console.error('Get current user error:', error);
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan' },
      { status: 500, headers: corsHeaders }
    );
  }
}

// POST /api/auth/change-password
export async function handleChangePassword(request) {
  try {
    const { db } = await connectToDatabase();
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
    
    const { currentPassword, newPassword } = await request.json();
    
    // Validate new password
    const validation = validatePassword(newPassword);
    if (!validation.valid) {
      return NextResponse.json(
        { success: false, error: validation.message },
        { status: 400, headers: corsHeaders }
      );
    }
    
    // Get user
    const user = await db.collection('users').findOne({ id: session.id });
    
    // Verify current password
    const isValid = await comparePassword(currentPassword, user.password);
    if (!isValid) {
      return NextResponse.json(
        { success: false, error: 'Password lama salah' },
        { status: 401, headers: corsHeaders }
      );
    }
    
    // Hash and update new password
    const hashedPassword = await hashPassword(newPassword);
    await db.collection('users').updateOne(
      { id: session.id },
      { 
        $set: { 
          password: hashedPassword,
          updatedAt: new Date().toISOString()
        }
      }
    );
    
    return NextResponse.json({
      success: true,
      message: 'Password berhasil diubah'
    }, { headers: corsHeaders });
    
  } catch (error) {
    console.error('Change password error:', error);
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan' },
      { status: 500, headers: corsHeaders }
    );
  }
}

// Helper to get session from request
export function getSessionFromRequest(request) {
  const sessionId = request.cookies.get('session_id')?.value;
  if (!sessionId) return null;
  return getSession(sessionId);
}
