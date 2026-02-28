import { create } from 'zustand';
import { authApi, AuthUser, LoginPayload, RegisterPayload } from '@/lib/auth-api';

// Cookie helpers for middleware access (middleware runs on Edge, can't read localStorage)
function setAuthCookie(token: string) {
  document.cookie = `accessToken=${token}; path=/; max-age=${15 * 60}; SameSite=Lax`;
}

function clearAuthCookie() {
  document.cookie = 'accessToken=; path=/; max-age=0';
}

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
      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken);
      setAuthCookie(data.accessToken);
      set({ user: data.user, isAuthenticated: true });
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
      set({ user: null, isAuthenticated: false });
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
