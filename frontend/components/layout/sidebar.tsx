"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { clsx } from "clsx";
import {
  LayoutDashboard,
  Package,
  Users,
  Building2,
  BarChart3,
  Settings,
  LogOut,
  X,
  MapPin,
  KeyRound,
  Wrench,
  ClipboardCheck,
  Bell,
  FileText,
  Store,
} from "lucide-react";
import { useAuthStore } from "@/store/auth.store";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/assets", label: "Assets", icon: Package },
  { href: "/locations", label: "Locations", icon: MapPin },
  { href: "/vendors", label: "Vendors", icon: Store },
  { href: "/purchase-orders", label: "Purchase Orders", icon: FileText },
  { href: "/maintenance", label: "Maintenance", icon: Wrench },
  { href: "/audits", label: "Audits", icon: ClipboardCheck },
  { href: "/licenses", label: "Licenses", icon: KeyRound },
  { href: "/users", label: "Users", icon: Users },
  { href: "/departments", label: "Organisation", icon: Building2 },
  { href: "/reports", label: "Reports", icon: BarChart3 },
];

interface SidebarProps {
  open?: boolean;
  onClose?: () => void;
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { logout } = useAuthStore();
  const asideRef = useRef<HTMLElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Close on route change (mobile)
  const prevPathname = useRef(pathname);
  useEffect(() => {
    if (prevPathname.current !== pathname) {
      prevPathname.current = pathname;
      onClose?.();
    }
  }, [pathname, onClose]);

  // Close on Escape key
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose?.();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  // Focus trap when drawer is open on mobile
  useEffect(() => {
    if (!open) return;

    // Move focus to the close button when drawer opens
    closeButtonRef.current?.focus();

    const aside = asideRef.current;
    if (!aside) return;

    const focusableSelectors = [
      "a[href]",
      "button:not([disabled])",
      "input:not([disabled])",
      "[tabindex]:not([tabindex='-1'])",
    ].join(", ");

    const focusableElements = Array.from(
      aside.querySelectorAll<HTMLElement>(focusableSelectors),
    );
    const firstFocusable = focusableElements[0];
    const lastFocusable = focusableElements[focusableElements.length - 1];

    const trapFocus = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      if (focusableElements.length === 0) {
        e.preventDefault();
        return;
      }
      if (e.shiftKey) {
        if (document.activeElement === firstFocusable) {
          e.preventDefault();
          lastFocusable.focus();
        }
      } else {
        if (document.activeElement === lastFocusable) {
          e.preventDefault();
          firstFocusable.focus();
        }
      }
    };

    document.addEventListener("keydown", trapFocus);
    return () => document.removeEventListener("keydown", trapFocus);
  }, [open]);

  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 bg-black/40 z-20 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        ref={asideRef}
        id="sidebar"
        role="navigation"
        aria-label="Main navigation"
        aria-hidden={!open ? "true" : undefined}
        className={clsx(
          "fixed left-0 top-0 h-full w-60 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 flex flex-col z-30 transition-transform duration-200",
          // Safe-area inset for notched devices
          "pb-[env(safe-area-inset-bottom)]",
          "lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        )}
      >
        {/* Logo + Close button */}
        <div className="flex items-center justify-between px-5 py-5 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gray-900">
              <svg
                className="w-4 h-4 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
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
          {/* Close button - visible on mobile; min 44×44 touch target */}
          <button
            ref={closeButtonRef}
            onClick={onClose}
            aria-label="Close navigation menu"
            className="lg:hidden flex items-center justify-center w-11 h-11 -mr-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto" aria-label="Site pages">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={clsx(
                  // Min 44px height touch target
                  "flex items-center gap-3 px-3 min-h-[44px] rounded-lg text-sm font-medium transition-colors",
                  active
                    ? "bg-gray-100 text-gray-900"
                    : "text-gray-500 hover:text-gray-900 hover:bg-gray-50",
                )}
              >
                <Icon size={17} aria-hidden="true" />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Bottom: Notifications + Settings + Logout */}
        <div className="px-3 py-4 border-t border-gray-100 space-y-0.5">
          <Link
            href="/notifications"
            aria-current={pathname === "/notifications" ? "page" : undefined}
            className={clsx(
              "flex items-center gap-3 px-3 min-h-[44px] rounded-lg text-sm font-medium transition-colors",
              pathname === "/notifications"
                ? "bg-gray-100 text-gray-900"
                : "text-gray-500 hover:text-gray-900 hover:bg-gray-50",
            )}
          >
            <Bell size={17} aria-hidden="true" />
            Notifications
          </Link>
          <Link
            href="/settings"
            aria-current={pathname.startsWith("/settings") ? "page" : undefined}
            className={clsx(
              "flex items-center gap-3 px-3 min-h-[44px] rounded-lg text-sm font-medium transition-colors",
              pathname.startsWith("/settings")
                ? "bg-gray-100 text-gray-900"
                : "text-gray-500 hover:text-gray-900 hover:bg-gray-50",
            )}
          >
            <Settings size={17} aria-hidden="true" />
            Settings
          </Link>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 min-h-[44px] rounded-lg text-sm font-medium text-gray-500 hover:text-gray-900 hover:bg-gray-50 transition-colors"
          >
            <LogOut size={17} aria-hidden="true" />
            Logout
          </button>
        </div>
      </aside>
    </>
  );
}
