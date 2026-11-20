import axios from 'axios';

import { env } from './env';
import { redirectToLogin } from './auth-redirect';

const API_BASE = env.NEXT_PUBLIC_API_URL;

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
        redirectToLogin();
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
          // The backend reads the refresh token from the body (not a Bearer
          // header) and wraps the answer in a { success, data } envelope. This
          // call bypasses the `api` instance, so unwrap it here.
          const { data: body } = await axios.post(`${API_BASE}/auth/refresh`, {
            refreshToken,
          });
          const tokens = body && body.success === true && body.data ? body.data : body;
          localStorage.setItem('accessToken', tokens.accessToken);
          localStorage.setItem('refreshToken', tokens.refreshToken);
          resolve({
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
          });
        } catch (refreshError) {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          redirectToLogin();
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