import { create } from 'zustand';
import {
  authApi,
  AuthUser,
  LoginPayload,
  RegisterPayload,
  TwoFactorRequiredResponse,
} from '@/lib/auth-api';

// Cookie helpers for middleware access (middleware runs on Edge, can't read localStorage)
function setAuthCookie(token: string) {
  document.cookie = `accessToken=${token}; path=/; max-age=${15 * 60}; SameSite=Lax`;
}

function clearAuthCookie() {
  document.cookie = 'accessToken=; path=/; max-age=0';
}

// Discriminated union type guard
function isTwoFactorRequired(data: unknown): data is TwoFactorRequiredResponse {
  return (
    typeof data === 'object' &&
    data !== null &&
    'requiresTwoFactor' in data &&
    (data as TwoFactorRequiredResponse).requiresTwoFactor === true
  );
}

export interface TwoFactorPending {
  tempToken: string;
}

interface AuthState {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  twoFactorPending: TwoFactorPending | null;

  login: (payload: LoginPayload) => Promise<{ requiresTwoFactor: boolean }>;
  verifyTwoFactor: (code: string) => Promise<void>;
  clearTwoFactorPending: () => void;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => Promise<void>;
  loadUser: () => Promise<void>;
  setUser: (user: AuthUser | null) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isLoading: false,
  isAuthenticated: false,
  twoFactorPending: null,

  setUser: (user) => set({ user, isAuthenticated: !!user }),

  clearTwoFactorPending: () => set({ twoFactorPending: null }),

  login: async (payload) => {
    set({ isLoading: true });
    try {
      const data = await authApi.login(payload);

      // 2FA intermediate state — backend returns tempToken instead of full session
      if (isTwoFactorRequired(data)) {
        set({ twoFactorPending: { tempToken: data.tempToken } });
        return { requiresTwoFactor: true };
      }

      // Normal login flow — data is AuthResponse here (narrowed by type guard)
      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken);
      setAuthCookie(data.accessToken);
      set({ user: data.user, isAuthenticated: true, twoFactorPending: null });
      return { requiresTwoFactor: false };
    } finally {
      set({ isLoading: false });
    }
  },

  verifyTwoFactor: async (code: string) => {
    const { twoFactorPending } = get();
    if (!twoFactorPending) throw new Error('No 2FA session in progress');

    set({ isLoading: true });
    try {
      const data = await authApi.verifyTwoFactor({
        tempToken: twoFactorPending.tempToken,
        code,
      });

      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken);
      setAuthCookie(data.accessToken);
      set({ user: data.user, isAuthenticated: true, twoFactorPending: null });
    } finally {
      set({ isLoading: false });
    }
  },

  register: async (payload) => {
    set({ isLoading: true });
    try {
      const data = await authApi.register(payload);
      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken);
      setAuthCookie(data.accessToken);
      set({ user: data.user, isAuthenticated: true });
    } finally {
      set({ isLoading: false });
    }
  },

  logout: async () => {
    try {
      await authApi.logout();
    } finally {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      clearAuthCookie();
      set({ user: null, isAuthenticated: false, twoFactorPending: null });
    }
  },

  loadUser: async () => {
    const token = localStorage.getItem('accessToken');
    if (!token) return;
    set({ isLoading: true });
    try {
      const user = await authApi.me();
      set({ user, isAuthenticated: true });
    } catch {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      clearAuthCookie();
      set({ user: null, isAuthenticated: false });
    } finally {
      set({ isLoading: false });
    }
  },
}));