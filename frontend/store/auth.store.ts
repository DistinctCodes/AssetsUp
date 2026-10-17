import { create } from 'zustand';
import { authApi, AuthUser, LoginPayload, RegisterPayload } from '@/lib/auth-api';

/**
 * Token handling has moved from localStorage to httpOnly cookies.
 * The backend sets `HttpOnly; Secure; SameSite=Lax` cookies for both
 * access and refresh tokens. The client sends `withCredentials` on
 * all requests so the browser attaches them automatically.
 */

interface AuthState {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (payload: LoginPayload) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => Promise<void>;
  loadUser: () => Promise<void>;
  setUser: (user: AuthUser | null) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: false,
  isAuthenticated: false,
  setUser: (user) => set({ user, isAuthenticated: !!user }),

  login: async (payload) => {
    set({ isLoading: true });
    try {
      const data = await authApi.login(payload);
      set({ user: data.user, isAuthenticated: true });
    } finally { set({ isLoading: false }); }
  },

  register: async (payload) => {
    set({ isLoading: true });
    try {
      const data = await authApi.register(payload);
      set({ user: data.user, isAuthenticated: true });
    } finally { set({ isLoading: false }); }
  },

  logout: async () => {
    try { await authApi.logout(); }
    finally { set({ user: null, isAuthenticated: false }); }
  },

  loadUser: async () => {
    set({ isLoading: true });
    try {
      const user = await authApi.me();
      set({ user, isAuthenticated: true });
    } catch { set({ user: null, isAuthenticated: false }); }
    finally { set({ isLoading: false }); }
  },
}));