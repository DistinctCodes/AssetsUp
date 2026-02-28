// frontend/components/layout/topbar.tsx
"use client";

import { useRouter } from "next/navigation";
import { LogOut, User } from "lucide-react";
import { useAuthStore } from "@/store/auth.store";

export function Topbar() {
  const router = useRouter();
  const { user, logout } = useAuthStore();

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  const initials = user
    ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()
    : "?";

  return (
    <header className="fixed top-0 left-60 right-0 h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6 z-20">
      <div />

      <div className="flex items-center gap-3">
        {/* User info */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
            {user ? (
              <span className="text-xs font-semibold text-gray-700">
                {initials}
              </span>
            ) : (
              <User size={15} className="text-gray-500" />
            )}
          </div>
          {user && (
            <div className="hidden sm:block">
              <p className="text-sm font-medium text-gray-900 leading-none">
                {user.firstName} {user.lastName}
              </p>
              <p className="text-xs text-gray-400 mt-0.5 capitalize">
                {user.role}
              </p>
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="h-5 w-px bg-gray-200" />

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors"
        >
          <LogOut size={16} />
          <span className="hidden sm:block">Logout</span>
        </button>
      </div>
    </header>
  );
}
