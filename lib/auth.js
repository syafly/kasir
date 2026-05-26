import bcrypt from 'bcryptjs';

// Password validation: min 8 chars, uppercase, symbol
export function validatePassword(password) {
  if (!password || password.length < 8) {
    return { valid: false, message: 'Password minimal 8 karakter' };
  }
  
  if (!/[A-Z]/.test(password)) {
    return { valid: false, message: 'Password harus mengandung huruf besar' };
  }
  
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    return { valid: false, message: 'Password harus mengandung simbol (!@#$%^&*...)' };
  }
  
  return { valid: true };
}

// Hash password
export async function hashPassword(password) {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

// Compare password
export async function comparePassword(password, hashedPassword) {
  return bcrypt.compare(password, hashedPassword);
}

// Simple session storage (in-memory for now)
// In production, use Redis or database-backed sessions
const sessions = new Map();

export function createSession(userId, userData) {
  const sessionId = generateSessionId();
  sessions.set(sessionId, {
    userId,
    ...userData,
    createdAt: new Date(),
    lastAccess: new Date()
  });
  
  // Auto-cleanup old sessions after 24 hours
  setTimeout(() => {
    sessions.delete(sessionId);
  }, 24 * 60 * 60 * 1000);
  
  return sessionId;
}

export function getSession(sessionId) {
  const session = sessions.get(sessionId);
  if (session) {
    session.lastAccess = new Date();
    return session;
  }
  return null;
}

export function deleteSession(sessionId) {
  return sessions.delete(sessionId);
}

function generateSessionId() {
  return Array.from({ length: 32 }, () => 
    Math.floor(Math.random() * 16).toString(16)
  ).join('');
}

// Check if user has permission for action
export function hasPermission(user, action) {
  if (!user) return false;
  
  const { role } = user;
  
  // Super admin can do everything
  if (role === 'superadmin') return true;
  
  // Define permissions per role
  const permissions = {
    admin: [
      'view_dashboard',
      'view_pos',
      'manage_products',
      'manage_vouchers',
      'view_reports',
      'manage_closings',
      'view_transactions',
      'edit_users', // can edit but not create
      'delete_users' // can delete but not create
    ],
    user: [
      'view_pos' // only POS access
    ]
  };
  
  return permissions[role]?.includes(action) || false;
}
