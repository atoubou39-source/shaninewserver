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

export const API_BASE = (import.meta as any).env?.VITE_API_BASE_URL || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000');

export function getApiUrl(path: string) {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE.replace(/\/$/, '')}${cleanPath}`;
}

function authHeaders() {
  const token = getToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function apiPost(path: string, body: object) {
  const res = await fetch(getApiUrl(path), {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok && !data.success) throw new Error(data.error || 'Request failed');
  return data;
}

async function apiGet(path: string) {
  const res = await fetch(getApiUrl(path), { headers: authHeaders() });
  const data = await res.json();
  if (!res.ok && !data.success) throw new Error(data.error || 'Request failed');
  return data;
}

// ── Auth Actions ───────────────────────────────────────────────

export async function login(phone: string, password: string): Promise<AuthUser> {
  const MAX_RETRIES = 2;
  const RETRY_DELAY_MS = 2500;
  let lastError: any;

  for (let attempt = 1; attempt <= MAX_RETRIES + 1; attempt++) {
    try {
      const res = await fetch(getApiUrl('/api/auth/login'), {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ phone, password }),
        signal: AbortSignal.timeout(15000), // 15 second timeout per attempt
      });
      const data = await res.json();

      // If credentials are wrong, do NOT retry – fail immediately
      if (res.status === 401) throw new Error(data.error || 'Invalid credentials');
      if (!res.ok && !data.success) throw new Error(data.error || 'Request failed');

      saveSession(data.token, data.user);
      return data.user;
    } catch (err: any) {
      lastError = err;
      // Only retry on network/timeout errors, not on auth errors
      const isAuthError = err.message?.includes('Invalid credentials') ||
                          err.message?.includes('pending activation');
      if (isAuthError || attempt > MAX_RETRIES) break;
      // Wait before retrying (server cold start wake-up time)
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
    }
  }
  throw lastError;
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
  const res = await fetch(getApiUrl(`/api/auth/user/${uid}`), {
    method: 'DELETE',
    headers: authHeaders(),
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Delete failed');
  clearSession();
  return data;
}
