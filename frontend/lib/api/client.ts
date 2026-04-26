import { api } from '../api';
import type { AuthResponse, LoginInput, RegisterInput } from '../query/types';

// Generic request method for fetch-style calls used in existing query hooks
async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const method = (init?.method ?? 'GET').toLowerCase() as
    | 'get'
    | 'post'
    | 'put'
    | 'patch'
    | 'delete';
  const body = init?.body ? JSON.parse(init.body as string) : undefined;
  const response = await api[method]<T>(path, body);
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
