export interface AuthUser {
  id: string;
  email: string;
  token: string;
}
export interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
}
