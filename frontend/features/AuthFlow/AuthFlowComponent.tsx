import React from "react";
import { useAuthFlow } from "./useAuthFlow";
export const AuthFlowComponent: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuthFlow();
  if (!isAuthenticated) return <div>Please log in</div>;
  return (
    <div className="p-4">
      <h2>Welcome, {user?.email}</h2>
      <button
        onClick={logout}
        className="mt-2 bg-red-500 text-white px-4 py-2 rounded"
      >
        Logout
      </button>
    </div>
  );
};
