import type { AxiosRequestConfig, Method } from 'axios';
import { api } from '../api';
import type { AuthResponse, LoginInput, RegisterInput } from '../query/types';

// Generic request method for fetch-style calls used in existing query hooks
async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const method = (init?.method ?? 'GET').toLowerCase() as Method;
  const body = init?.body ? JSON.parse(init.body as string) : undefined;

  // `api.get(path, x)` and `api.delete(path, x)` take a *config* as the second
  // argument, so passing the parsed body there made its keys override `params`,
  // `headers` and so on, and dropped DELETE bodies. `api.request` keeps the
  // body in `data` for every method.
  const config: AxiosRequestConfig = { method, url: path };
  if (body !== undefined && method !== 'get' && method !== 'head') {
    config.data = body;
  }
  const response = await api.request<T>(config);
  return response.data;
}

export const apiClient = {
  request,

  register: (data: RegisterInput): Promise<AuthResponse> =>
    api.post<AuthResponse>('/auth/register', data).then((r) => r.data),

  login: (data: LoginInput): Promise<AuthResponse> =>
    api.post<AuthResponse>('/auth/login', data).then((r) => r.data),

  logout: () => api.post('/auth/logout'),
};
