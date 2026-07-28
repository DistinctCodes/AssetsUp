import { useState } from "react";
import { AuthUser } from "./AuthFlowTypes";
export const useAuthFlow = () => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const login = (u: AuthUser) => setUser(u);
  const logout = () => setUser(null);
  return { user, isAuthenticated: !!user, login, logout };
};
