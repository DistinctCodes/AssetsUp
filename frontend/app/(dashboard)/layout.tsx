"use client";

import { useState } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Skip to main content – accessibility */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 z-50 bg-white text-gray-900 px-4 py-2 rounded-lg text-sm font-medium shadow-md"
      >
        Skip to main content
      </a>

      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <Topbar onMenuClick={() => setSidebarOpen(true)} />

      {/* pl-[env(safe-area-inset-left)] accounts for notched / rounded-corner devices */}
      <main
        id="main-content"
        tabIndex={-1}
        className="lg:ml-60 pt-14 min-h-screen pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)]"
      >
        <div className="p-4 sm:p-6">{children}</div>
      </main>
    </div>
  );
}
