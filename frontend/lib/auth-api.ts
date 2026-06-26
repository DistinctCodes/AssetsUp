import { api } from './api';

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
}

export interface AuthResponse {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
}

export interface TwoFactorRequiredResponse {
  requiresTwoFactor: true;
  tempToken: string;
}

export type LoginResponse = AuthResponse | TwoFactorRequiredResponse;

export interface RegisterPayload {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface ResetPasswordPayload {
  token: string;
  newPassword: string;
}

export interface VerifyTwoFactorPayload {
  tempToken: string;
  code: string;
}

export const authApi = {
  register: (data: RegisterPayload) =>
    api.post<AuthResponse>('/auth/register', data).then((r) => r.data),

  login: (data: LoginPayload) =>
    api.post<LoginResponse>('/auth/login', data).then((r) => r.data),

  logout: () => api.post('/auth/logout'),

  me: () => api.get<AuthUser>('/auth/me').then((r) => r.data),

  resetPassword: (data: ResetPasswordPayload) =>
    api.post('/auth/reset-password', data).then((r) => r.data),

  verifyTwoFactor: (data: VerifyTwoFactorPayload) =>
    api.post<AuthResponse>('/auth/2fa/verify', data).then((r) => r.data),
};