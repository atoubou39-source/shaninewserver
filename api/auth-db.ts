/**
 * auth-db.ts
 * Local user database using a JSON file stored on the server.
 * This replaces Firebase Auth + Firestore for user management.
 * Data is persisted in /data/users.json on the server filesystem.
 */

const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

// Store users in a JSON file (persists across restarts)
const DATA_DIR = path.join(process.cwd(), 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');

// In-memory cache
let usersCache: Record<string, UserRecord> = {};
let cacheLoaded = false;

export interface UserRecord {
  uid: string;           // unique id = phone number (e.g. 966501234567)
  phone: string;         // sanitized phone
  email: string;         // constructed email or custom email
  passwordHash: string;  // bcrypt hash
  name: string;          // display name
  role: 'customer' | 'admin';
  isAdmin: boolean;
  accountActivated: boolean;
  odooPartnerId?: number;
  status?: 'active' | 'blocked';
  createdAt: string;
  updatedAt: string;
}

// ── Persistence ──────────────────────────────────────────────

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function loadUsers(): Record<string, UserRecord> {
  if (cacheLoaded) return usersCache;
  try {
    ensureDataDir();
    if (fs.existsSync(USERS_FILE)) {
      const raw = fs.readFileSync(USERS_FILE, 'utf-8');
      usersCache = JSON.parse(raw);
    } else {
      usersCache = {};
      saveUsers();
    }
    cacheLoaded = true;
    console.log(`[AuthDB] Loaded ${Object.keys(usersCache).length} users from disk`);
  } catch (e: any) {
    console.error('[AuthDB] Failed to load users file:', e.message);
    usersCache = {};
  }
  return usersCache;
}

function saveUsers() {
  try {
    ensureDataDir();
    fs.writeFileSync(USERS_FILE, JSON.stringify(usersCache, null, 2), 'utf-8');
  } catch (e: any) {
    console.error('[AuthDB] Failed to save users file:', e.message);
  }
}

// ── CRUD ─────────────────────────────────────────────────────

export function getAllUsers(): UserRecord[] {
  return Object.values(loadUsers());
}

export function findUserByPhone(phone: string): UserRecord | null {
  const users = loadUsers();
  return Object.values(users).find(u => u.phone === phone) || null;
}

export function findUserByEmail(email: string): UserRecord | null {
  const users = loadUsers();
  return Object.values(users).find(u => u.email.toLowerCase() === email.toLowerCase()) || null;
}

export function findUserByUid(uid: string): UserRecord | null {
  const users = loadUsers();
  return users[uid] || null;
}

export function createUser(data: {
  phone: string;
  email: string;
  password: string;
  name: string;
  role?: 'customer' | 'admin';
  odooPartnerId?: number;
}): UserRecord {
  const users = loadUsers();
  
  // Check if user already exists
  const existing = findUserByPhone(data.phone) || findUserByEmail(data.email);
  if (existing) throw new Error('User already exists with this phone or email');
  
  const uid = data.phone; // use phone as uid
  const passwordHash = bcrypt.hashSync(data.password, 10);
  const adminEmails = (process.env.ADMIN_EMAIL || 'atoubou39@gmail.com').split(',');
  const isAdmin = adminEmails.includes(data.email) || data.role === 'admin';
  
  const user: UserRecord = {
    uid,
    phone: data.phone,
    email: data.email,
    passwordHash,
    name: data.name,
    role: isAdmin ? 'admin' : 'customer',
    isAdmin,
    accountActivated: true, // Auto-activated on registration
    odooPartnerId: data.odooPartnerId,
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  
  users[uid] = user;
  usersCache = users;
  saveUsers();
  
  console.log(`[AuthDB] Created user: ${uid} (${data.name})`);
  return user;
}

export async function verifyPassword(user: UserRecord, password: string): Promise<boolean> {
  return bcrypt.compare(password, user.passwordHash);
}

export function updateUser(uid: string, updates: Partial<UserRecord>): UserRecord | null {
  const users = loadUsers();
  if (!users[uid]) return null;
  
  users[uid] = {
    ...users[uid],
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  usersCache = users;
  saveUsers();
  return users[uid];
}

export function updatePassword(uid: string, newPassword: string): boolean {
  const users = loadUsers();
  if (!users[uid]) return false;
  
  users[uid].passwordHash = bcrypt.hashSync(newPassword, 10);
  users[uid].updatedAt = new Date().toISOString();
  usersCache = users;
  saveUsers();
  return true;
}

export function deleteUser(uid: string): boolean {
  const users = loadUsers();
  if (!users[uid]) return false;
  delete users[uid];
  usersCache = users;
  saveUsers();
  return true;
}

export function activateUser(uid: string): boolean {
  return !!updateUser(uid, { accountActivated: true });
}
