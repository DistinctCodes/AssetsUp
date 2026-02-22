// frontend/app/(dashboard)/layout.tsx
import { Sidebar } from '@/components/layout/sidebar';
import { Topbar } from '@/components/layout/topbar';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
return (
<div className="min-h-screen bg-gray-50">
<Sidebar />
<Topbar />
<main className="ml-60 pt-14 min-h-screen">
<div className="p-6">{children}</div>
</main>
</div>
);
}

// frontend/components/layout/topbar.tsx
'use client';

import { useRouter } from 'next/navigation';
import { LogOut, User } from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';

export function Topbar() {
const router = useRouter();
const { user, logout } = useAuthStore();

const handleLogout = async () => {
await logout();
router.push('/login');
};

const initials = user
? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()
: '?';

return (
<header className="fixed top-0 left-60 right-0 h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6 z-20">
<div />

      <div className="flex items-center gap-3">
        {/* User info */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
            {user ? (
              <span className="text-xs font-semibold text-gray-700">{initials}</span>
            ) : (
              <User size={15} className="text-gray-500" />
            )}
          </div>
          {user && (
            <div className="hidden sm:block">
              <p className="text-sm font-medium text-gray-900 leading-none">
                {user.firstName} {user.lastName}
              </p>
              <p className="text-xs text-gray-400 mt-0.5 capitalize">{user.role}</p>
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

// frontend/components/layout/sidebar.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import {
LayoutDashboard,
Package,
Users,
Building2,
BarChart3,
Settings,
} from "lucide-react";

const navItems = [
{ href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
{ href: "/assets", label: "Assets", icon: Package },
{ href: "/users", label: "Users", icon: Users },
{ href: "/departments", label: "Organisation", icon: Building2 },
{ href: "/reports", label: "Reports", icon: BarChart3 },
];

export function Sidebar() {
const pathname = usePathname();

return (
<aside className="fixed left-0 top-0 h-full w-60 bg-white border-r border-gray-200 flex flex-col z-30">
{/_ Logo _/}
<div className="flex items-center gap-2.5 px-5 py-5 border-b border-gray-100">
<div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gray-900">
<svg
            className="w-4 h-4 text-white"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
<path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
            />
</svg>
</div>
<span className="font-semibold text-gray-900 text-sm">AssetsUp</span>
</div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              className={clsx(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                active
                  ? "bg-gray-100 text-gray-900"
                  : "text-gray-500 hover:text-gray-900 hover:bg-gray-50",
              )}
            >
              <Icon size={17} />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Settings at bottom */}
      <div className="px-3 py-4 border-t border-gray-100">
        <Link
          href="/settings"
          className={clsx(
            "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
            pathname.startsWith("/settings")
              ? "bg-gray-100 text-gray-900"
              : "text-gray-500 hover:text-gray-900 hover:bg-gray-50",
          )}
        >
          <Settings size={17} />
          Settings
        </Link>
      </div>
    </aside>

);
}
