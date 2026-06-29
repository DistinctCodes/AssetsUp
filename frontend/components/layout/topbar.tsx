"use client";

import { useRouter, usePathname } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { Menu, User, ChevronDown, Bell } from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { useSocket } from "@/hooks/useSocket";
import { useToast } from "@/components/ui/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

const pageTitles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/assets": "Assets",
  "/users": "Users",
  "/departments": "Organisation",
  "/reports": "Reports",
  "/settings": "Settings",
};

function getPageTitle(pathname: string): string {
  for (const [prefix, title] of Object.entries(pageTitles)) {
    if (pathname === prefix || pathname.startsWith(`${prefix}/`)) return title;
  }
  return "Dashboard";
}

interface TopbarProps {
  onMenuClick?: () => void;
}

export function Topbar({ onMenuClick }: TopbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout } = useAuthStore();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleLogout = async () => {
    setDropdownOpen(false);
    await logout();
    router.push("/login");
  };

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const { toast } = useToast();
  const { on, off } = useSocket();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const handleNewNotification = (notification: any) => {
      setNotifications((prev) => [notification, ...prev]);
      setUnreadCount((prev) => prev + 1);
    };

    const handleMaintenanceDue = (data: any) => {
      toast({
        title: "Maintenance Due",
        description: `Asset ${data.assetName} is due for maintenance.`,
        action: (
          <Button onClick={() => router.push("/maintenance-calendar")}>
            View
          </Button>
        ),
      });
    };

    const handleAssetStatusChanged = (data: any) => {
      if (pathname.includes(`/assets/${data.assetId}`)) {
        router.refresh();
      }
    };

    on("notification.new", handleNewNotification);
    on("maintenance.due", handleMaintenanceDue);
    on("asset.status_changed", handleAssetStatusChanged);

    return () => {
      off("notification.new", handleNewNotification);
      off("maintenance.due", handleMaintenanceDue);
      off("asset.status_changed", handleAssetStatusChanged);
    };
  }, [on, off, toast, router, pathname]);


  return (
    <header className="fixed top-0 left-0 lg:left-60 right-0 h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4 lg:px-6 z-20">
      {/* Left: hamburger (mobile) + page title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="lg:hidden text-gray-500 hover:text-gray-900"
          aria-label="Open menu"
        >
          <Menu size={20} />
        </button>
        <h1 className="text-sm font-semibold text-gray-900">
          {getPageTitle(pathname)}
        </h1>
      </div>

      <div className="flex items-center gap-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="relative rounded-full"
              onClick={() => setUnreadCount(0)}
            >
              <Bell size={20} />
              {unreadCount > 0 && (
                <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-red-500" />
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <DropdownMenuLabel>Notifications</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {notifications.length > 0 ? (
              notifications.map((notification) => (
                <DropdownMenuItem key={notification.id}>
                  {notification.message}
                </DropdownMenuItem>
              ))
            ) : (
              <div className="px-2 py-4 text-center text-sm text-gray-500">
                No new notifications
              </div>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen((v) => !v)}
            className="flex items-center gap-2.5 hover:opacity-80 transition-opacity"
          >
            <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
              {user ? (
                <span className="text-xs font-semibold text-gray-700">
                  {user.firstName[0]}
                  {user.lastName[0]}
                </span>
              ) : (
                <User size={15} className="text-gray-500" />
              )}
            </div>
            {user && (
              <div className="hidden sm:block text-left">
                <p className="text-sm font-medium text-gray-900 leading-none">
                  {user.firstName} {user.lastName}
                </p>
                <p className="text-xs text-gray-400 mt-0.5 capitalize">
                  {user.role}
                </p>
              </div>
            )}
            <ChevronDown size={14} className="text-gray-400 hidden sm:block" />
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-44 bg-white border border-gray-200 rounded-lg shadow-md py-1 z-50">
              <button
                onClick={() => {
                  setDropdownOpen(false);
                  router.push("/settings");
                }}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                View Profile
              </button>
              <button
                onClick={handleLogout}
                className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-50"
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}