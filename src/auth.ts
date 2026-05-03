/**
 * auth.ts
 * Local JWT-based authentication helper (Firebase-free)
 * Stores token in localStorage and provides helper functions.
 */

export interface AuthUser {
  uid: string;
  phone: string;
  email: string;
  name: string;
  isAdmin: boolean;
  role: 'customer' | 'admin';
  accountActivated: boolean;
  odooPartnerId?: number;
}

const TOKEN_KEY = 'hakkal_auth_token';
const USER_KEY = 'hakkal_auth_user';

// ── Token Storage ──────────────────────────────────────────────

export function saveSession(token: string, user: AuthUser) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function getStoredUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function isLoggedIn(): boolean {
  return !!getToken() && !!getStoredUser();
}

// ── API Helper ─────────────────────────────────────────────────

const API_BASE = (import.meta as any).env?.VITE_API_BASE_URL || (typeof window !== 'undefined' ? window.location.origin : 'https://shaninewserver.onrender.com');

function apiUrl(path: string) {
  return `${API_BASE.replace(/\/$/, '')}${path}`;
}

function authHeaders() {
  const token = getToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function apiPost(path: string, body: object) {
  const res = await fetch(apiUrl(path), {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok && !data.success) throw new Error(data.error || 'Request failed');
  return data;
}

async function apiGet(path: string) {
  const res = await fetch(apiUrl(path), { headers: authHeaders() });
  const data = await res.json();
  if (!res.ok && !data.success) throw new Error(data.error || 'Request failed');
  return data;
}

// ── Auth Actions ───────────────────────────────────────────────

export async function login(phone: string, password: string): Promise<AuthUser> {
  const data = await apiPost('/api/auth/login', { phone, password });
  saveSession(data.token, data.user);
  return data.user;
}

export async function register(phone: string, password: string, name: string, email?: string): Promise<AuthUser> {
  const data = await apiPost('/api/auth/register', { phone, password, name, email });
  saveSession(data.token, data.user);
  return data.user;
}

export async function verifySession(): Promise<AuthUser | null> {
  if (!getToken()) return null;
  try {
    const data = await apiGet('/api/auth/me');
    // Update stored user with fresh data from server
    saveSession(getToken()!, data.user);
    return data.user;
  } catch {
    clearSession();
    return null;
  }
}

export function logout() {
  clearSession();
  window.location.href = '/login';
}

export async function changePassword(currentPassword: string, newPassword: string) {
  return apiPost('/api/auth/change-password', { currentPassword, newPassword });
}

export async function deleteAccount(uid: string) {
  const res = await fetch(apiUrl(`/api/auth/user/${uid}`), {
    method: 'DELETE',
    headers: authHeaders(),
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Delete failed');
  clearSession();
  return data;
}
