import axios, { AxiosInstance, AxiosError } from 'axios';
import { RegisterInput, LoginInput, AuthResponse } from '@/lib/query/types';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:6003/api';

// Separate auth client without interceptors (prevents circular refresh loops)
export const authApiClient: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Main API client with JWT interceptors
const apiClient: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Track refresh attempts to avoid infinite loops
let isRefreshing = false;
let failedQueue: Array<{
  onSuccess: (token: string) => void;
  onError: (error: unknown) => void;
}> = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.onError(error);
    } else {
      prom.onSuccess(token || '');
    }
  });

  failedQueue = [];
};

// Request interceptor: attach JWT token
apiClient.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: handle 401 with refresh
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as any;

    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      if (isRefreshing) {
        // Queue request to retry after refresh completes
        return new Promise((onSuccess, onError) => {
          failedQueue.push({ onSuccess, onError });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return apiClient(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const response = await authApiClient.post<AuthResponse>('/auth/refresh');
        const { accessToken } = response.data;

        // Store new token
        if (typeof window !== 'undefined') {
          localStorage.setItem('token', accessToken);
        }

        // Update authorization header and retry original request
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        processQueue(null, accessToken);

        return apiClient(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        isRefreshing = false;

        // Logout on refresh failure
        if (typeof window !== 'undefined') {
          const { useAuthStore } = await import('@/store/auth.store');
          useAuthStore.getState().logout();
        }

        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;

export const authApi = {
  register(data: RegisterInput): Promise<AuthResponse> {
    return authApiClient
      .post<AuthResponse>('/auth/register', data)
      .then((res) => res.data);
  },

  login(data: LoginInput): Promise<AuthResponse> {
    return authApiClient
      .post<AuthResponse>('/auth/login', data)
      .then((res) => res.data);
  },
};
