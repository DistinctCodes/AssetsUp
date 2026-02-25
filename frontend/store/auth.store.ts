import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  name?: string;
}

interface AuthStore {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isInitialized: boolean;
  setAuth: (token: string, user: User) => void;
  logout: () => void;
  initialize: () => void;
  loadAuthFromStorage: () => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isInitialized: false,
      
      setAuth: (token: string, user: User) => {
        // Store token in localStorage for API calls
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
        
        // Set cookie for middleware
        document.cookie = `auth-token=${token}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Strict; ${typeof window !== 'undefined' && window.location.protocol === 'https:' ? 'Secure;' : ''}`;
        
        set({
          token,
          user,
          isAuthenticated: true,
        });
      },
      
      logout: () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        document.cookie = 'auth-token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT';
        set({
          token: null,
          user: null,
          isAuthenticated: false,
        });
      },
      
      initialize: () => {
        const { isInitialized } = get();
        if (isInitialized) return;
        
        const token = localStorage.getItem('token');
        if (token) {
          const user = JSON.parse(localStorage.getItem('user') || 'null');
          if (user) {
            set({
              token,
              user,
              isAuthenticated: true,
              isInitialized: true,
            });
            return;
          }
        }
        set({ isInitialized: true });
      },
      
      loadAuthFromStorage: () => {
        const token = localStorage.getItem('token');
        if (token) {
          const user = JSON.parse(localStorage.getItem('user') || 'null');
          if (user) {
            set({
              token,
              user,
              isAuthenticated: true,
            });
          }
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
        isInitialized: state.isInitialized,
      }),
    }
  )
);
