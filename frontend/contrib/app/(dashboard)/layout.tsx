'use client';

import React from 'react';
import { useAssetWebSocket } from '@/contrib/hooks/useAssetWebSocket';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Enable real-time asset update notifications
  useAssetWebSocket({ enabled: true });

  return <>{children}</>;
}
