import { createContext } from "react";
import { AuthState, AuthUser } from "./AuthFlowTypes";
export interface AuthStore extends AuthState {
  login: (user: AuthUser) => void;
  logout: () => void;
}
export const AuthFlowContext = createContext<AuthStore | undefined>(undefined);
