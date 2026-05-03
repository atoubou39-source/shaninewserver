/**
 * useAuth.tsx
 * JWT-based auth hook (Firebase-free replacement)
 * Reads user from localStorage and validates session with backend on mount.
 */

import { useEffect, useState } from 'react';
import { AuthUser, getStoredUser, verifySession, clearSession } from '../auth';

export interface AuthState {
  user: AuthUser | null;
  loading: boolean;
  isOdooCustomer: boolean;
  isActivated: boolean;
  isAdmin: boolean;
}

export function useAuth(): AuthState {
  const [state, setState] = useState<AuthState>({
    user: null,
    loading: true,
    isOdooCustomer: false,
    isActivated: false,
    isAdmin: false,
  });

  useEffect(() => {
    // 1. Immediately load from localStorage for instant render
    const storedUser = getStoredUser();
    if (storedUser) {
      setState({
        user: storedUser,
        loading: false,
        isOdooCustomer: true,
        isActivated: storedUser.accountActivated,
        isAdmin: storedUser.isAdmin,
      });
    }

    // 2. Verify session with server in background (refresh user data)
    verifySession().then(freshUser => {
      if (freshUser) {
        setState({
          user: freshUser,
          loading: false,
          isOdooCustomer: true,
          isActivated: freshUser.accountActivated,
          isAdmin: freshUser.isAdmin,
        });
      } else if (!storedUser) {
        // No local + no server = not logged in
        setState({
          user: null,
          loading: false,
          isOdooCustomer: false,
          isActivated: false,
          isAdmin: false,
        });
      }
    }).catch(() => {
      if (!storedUser) {
        setState(prev => ({ ...prev, loading: false }));
      }
    });
  }, []);

  return state;
}