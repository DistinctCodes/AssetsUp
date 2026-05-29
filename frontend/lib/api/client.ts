import axios, {
  AxiosInstance,
  AxiosRequestConfig,
  InternalAxiosRequestConfig,
  AxiosError,
} from 'axios';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface RefreshResponse {
  accessToken: string;
}

interface QueueEntry {
  resolve: (token: string) => void;
  reject: (err: unknown) => void;
}

// ---------------------------------------------------------------------------
// Cookie helper (mirrors auth.store — needed for middleware)
// ---------------------------------------------------------------------------

function setAuthCookie(token: string) {
  if (typeof document === 'undefined') return;
  document.cookie = `accessToken=${token}; path=/; max-age=${15 * 60}; SameSite=Lax`;
}

function clearAuthStorage() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  document.cookie = 'accessToken=; path=/; max-age=0';
}

// ---------------------------------------------------------------------------
// Module-level refresh state
// ---------------------------------------------------------------------------

let isRefreshing = false;
let failedQueue: QueueEntry[] = [];

function processQueue(error: unknown, token: string | null) {
  failedQueue.forEach((entry) => {
    if (error) {
      entry.reject(error);
    } else {
      entry.resolve(token!);
    }
  });
  failedQueue = [];
}

// ---------------------------------------------------------------------------
// Axios instance
// ---------------------------------------------------------------------------

export const apiClient: AxiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? '/api',
  headers: { 'Content-Type': 'application/json' },
});

// ---------------------------------------------------------------------------
// Request interceptor — attach access token from localStorage
// ---------------------------------------------------------------------------

apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token =
    typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;

  if (token && config.headers) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }

  return config;
});

// ---------------------------------------------------------------------------
// Response interceptor — handle 401 / token refresh
// ---------------------------------------------------------------------------

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };

    // Only attempt refresh on 401 and only once per request
    if (error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }

    // If a refresh is already in-flight, queue this request until it resolves
    if (isRefreshing) {
      return new Promise<string>((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      })
        .then((newToken) => {
          if (originalRequest.headers) {
            (originalRequest.headers as Record<string, string>)['Authorization'] =
              `Bearer ${newToken}`;
          }
          return apiClient(originalRequest);
        })
        .catch(Promise.reject.bind(Promise));
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      const refreshToken =
        typeof window !== 'undefined' ? localStorage.getItem('refreshToken') : null;

      const { data } = await axios.post<RefreshResponse>(
        `${process.env.NEXT_PUBLIC_API_URL ?? '/api'}/auth/refresh`,
        { refreshToken },
      );

      const newToken = data.accessToken;

      // Persist new token — same pattern as auth.store
      localStorage.setItem('accessToken', newToken);
      setAuthCookie(newToken);

      if (originalRequest.headers) {
        (originalRequest.headers as Record<string, string>)['Authorization'] =
          `Bearer ${newToken}`;
      }

      processQueue(null, newToken);
      return apiClient(originalRequest);
    } catch (refreshError) {
      processQueue(refreshError, null);

      // Refresh failed — wipe everything and redirect to login
      clearAuthStorage();

      // Update Zustand state so UI reflects signed-out status
      // Lazy require avoids circular dep at module init time
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { useAuthStore } = require('@/store/auth.store');
      useAuthStore.getState().setUser(null);

      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }

      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  },
);