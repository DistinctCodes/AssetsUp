
"use client";

import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";

import { AuthInitializer } from "@/components/auth-initializer";
import { CommandPalette } from "@/components/ui/command-palette";
import { ToastProvider } from "@/components/ui/toast";
import { useCommandPalette } from "@/hooks/useCommandPalette";
import { ThemeProvider } from "@/lib/theme-provider";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // 1 minute
      refetchOnWindowFocus: false,
    },
  },
});

function CommandPaletteInitializer() {
  const { isOpen, close } = useCommandPalette();

  return <CommandPalette isOpen={isOpen} onClose={close} />;
}

interface ProvidersProps {
  children: React.ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <AuthInitializer />

        {children}

        <ToastProvider />
        <CommandPaletteInitializer />

        <ReactQueryDevtools initialIsOpen={false} />
      </QueryClientProvider>
    </ThemeProvider>
  );
}
