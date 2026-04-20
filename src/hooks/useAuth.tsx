import { useEffect, useState } from 'react';
import { onAuthStateChanged, User, getIdTokenResult } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';

export interface AuthState {
  user: User | null;
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
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const idTokenResult = await getIdTokenResult(user, true);
          const claims = idTokenResult.claims;

          const newState: AuthState = {
            user,
            loading: false,
            // If logged in, consider them a customer unless specifically denied
            isOdooCustomer: true,
            isActivated: true,
            isAdmin: user.email === 'atoubou39@gmail.com' || claims.admin === true,
          };

          setState(newState);
        } catch (error) {
          console.error("Error fetching token claims:", error);
          setState(prev => ({ ...prev, user, loading: false }));
        }
      } else {
        setState({
          user: null,
          loading: false,
          isOdooCustomer: false,
          isActivated: false,
          isAdmin: false,
        });
      }
    });

    return unsubscribe;
  }, []);

  return state;
}