import { create } from 'zustand';
import { authApi, AuthUser, LoginPayload, RegisterPayload } from '@/lib/auth-api';
import { clearTokens, persistTokens } from '@/lib/auth-tokens';

/**
 * Token handling: the backend returns `accessToken`/`refreshToken` in the JSON
 * body and sets no cookies. The client therefore stores both tokens in
 * localStorage (read by the axios request interceptor) and writes the
 * `accessToken` cookie that `middleware.ts` checks. See `lib/auth-tokens.ts`.
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
      persistTokens(data);
      set({ user: data.user, isAuthenticated: true });
    } finally { set({ isLoading: false }); }
  },

  register: async (payload) => {
    set({ isLoading: true });
    try {
      const data = await authApi.register(payload);
      persistTokens(data);
      set({ user: data.user, isAuthenticated: true });
    } finally { set({ isLoading: false }); }
  },

  logout: async () => {
    try { await authApi.logout(); }
    finally {
      clearTokens();
      set({ user: null, isAuthenticated: false });
    }
  },

  loadUser: async () => {
    set({ isLoading: true });
    try {
      const user = await authApi.me();
      set({ user, isAuthenticated: true });
    } catch {
      clearTokens();
      set({ user: null, isAuthenticated: false });
    }
    finally { set({ isLoading: false }); }
  },
}));