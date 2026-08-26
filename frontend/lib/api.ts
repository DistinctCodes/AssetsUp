import axios from 'axios';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:6003/api';

export const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
});

// Track if a refresh is in progress to de-duplicate concurrent refresh requests
let isRefreshing = false;
let refreshPromise: Promise<{ accessToken: string; refreshToken: string }> | null = null;

// Attach access token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// On 401, attempt a token refresh then retry the original request
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;

    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      const refreshToken = localStorage.getItem('refreshToken');

      if (!refreshToken) {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
        return Promise.reject(error);
      }

      // If a refresh is already in progress, wait for it to complete instead of starting a new one
      if (isRefreshing && refreshPromise) {
        try {
          const tokens = await refreshPromise;
          original.headers.Authorization = `Bearer ${tokens.accessToken}`;
          return api(original);
        } catch {
          return Promise.reject(error);
        }
      }

      // Start a new refresh process
      isRefreshing = true;
      refreshPromise = new Promise(async (resolve, reject) => {
        try {
          const { data } = await axios.post(
            `${API_BASE}/auth/refresh`,
            {},
            { headers: { Authorization: `Bearer ${refreshToken}` } },
          );
          localStorage.setItem('accessToken', data.accessToken);
          localStorage.setItem('refreshToken', data.refreshToken);
          resolve({ accessToken: data.accessToken, refreshToken: data.refreshToken });
        } catch (refreshError) {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          window.location.href = '/login';
          reject(refreshError);
        } finally {
          isRefreshing = false;
          refreshPromise = null;
        }
      });

      try {
        const tokens = await refreshPromise;
        original.headers.Authorization = `Bearer ${tokens.accessToken}`;
        return api(original);
      } catch {
        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  },
);