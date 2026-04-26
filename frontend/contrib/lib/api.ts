import axios, {
  AxiosError,
  AxiosHeaders,
  InternalAxiosRequestConfig,
} from 'axios';

interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

interface RetriableRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:6003/api';
const ACCESS_TOKEN_KEY = 'accessToken';
const REFRESH_TOKEN_KEY = 'refreshToken';

export const authApiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

let refreshRequest: Promise<string | null> | null = null;

function isBrowser() {
  return typeof window !== 'undefined';
}

function getStoredToken(key: string) {
  if (!isBrowser()) {
    return null;
  }

  return window.localStorage.getItem(key);
}

function storeTokens(tokens: TokenPair) {
  if (!isBrowser()) {
    return;
  }

  window.localStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken);
  window.localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
}

function clearTokens() {
  if (!isBrowser()) {
    return;
  }

  window.localStorage.removeItem(ACCESS_TOKEN_KEY);
  window.localStorage.removeItem(REFRESH_TOKEN_KEY);
}

function redirectToLogin() {
  if (!isBrowser()) {
    return;
  }

  if (window.location.pathname !== '/login') {
    window.location.assign('/login');
  }
}

function applyBearerToken(
  config: InternalAxiosRequestConfig,
  token: string,
): InternalAxiosRequestConfig {
  const headers = AxiosHeaders.from(config.headers);
  headers.set('Authorization', `Bearer ${token}`);
  config.headers = headers;
  return config;
}

async function refreshAccessToken() {
  if (!refreshRequest) {
    refreshRequest = (async () => {
      const refreshToken = getStoredToken(REFRESH_TOKEN_KEY);

      if (!refreshToken) {
        clearTokens();
        redirectToLogin();
        return null;
      }

      try {
        const { data } = await authApiClient.post<TokenPair>('/auth/refresh', undefined, {
          headers: {
            Authorization: `Bearer ${refreshToken}`,
          },
        });

        storeTokens(data);
        return data.accessToken;
      } catch {
        clearTokens();
        redirectToLogin();
        return null;
      } finally {
        refreshRequest = null;
      }
    })();
  }

  return refreshRequest;
}

api.interceptors.request.use((config) => {
  const accessToken = getStoredToken(ACCESS_TOKEN_KEY);

  if (!accessToken) {
    return config;
  }

  return applyBearerToken(config, accessToken);
});

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as RetriableRequestConfig | undefined;

    if (!originalRequest || error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }

    if (originalRequest.url?.includes('/auth/refresh')) {
      clearTokens();
      redirectToLogin();
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    const accessToken = await refreshAccessToken();

    if (!accessToken) {
      return Promise.reject(error);
    }

    return api(applyBearerToken(originalRequest, accessToken));
  },
);
