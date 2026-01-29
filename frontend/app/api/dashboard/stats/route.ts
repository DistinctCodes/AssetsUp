import { NextResponse } from 'next/server';
import type { DashboardStatsResponse } from '@/types/dashboard';

function parseRange(range: string | null) {
  // accepted: 7d, 30d, 90d, 6m, 12m
  const r = (range || '30d').toLowerCase();
  if (['7d', '30d', '90d', '6m', '12m'].includes(r)) return r;
  return '30d';
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const range = parseRange(searchParams.get('range'));

  // In production: fetch from your backend/service using `range`.
  // For now: deterministic mock values that can vary slightly by range.
  const multiplier =
    range === '7d' ? 0.8 : range === '90d' ? 1.15 : range === '6m' ? 1.25 : range === '12m' ? 1.4 : 1;

  const totalAssets = Math.round(12450 * multiplier);
  const active = Math.round(8234 * multiplier);
  const assigned = Math.round(3120 * multiplier);
  const maintenance = Math.round(420 * multiplier);
  const retired = Math.max(0, totalAssets - active - assigned - maintenance);

  const warrantyExpiring = Math.round(18 * multiplier);
  const maintenanceDue = Math.round(27 * multiplier);

  const data: DashboardStatsResponse = {
    cards: [
      { label: 'Total Assets', value: totalAssets, trend: 12, trendDirection: 'up', icon: 'asset' },
      { label: 'Active Assets', value: active.toLocaleString(), trend: 5, trendDirection: 'up', icon: 'status' },
      { label: 'Total Value', value: '$4.2M', trend: 2.1, trendDirection: 'up', icon: 'value' },
      {
        label: 'Attention Needed',
        value: warrantyExpiring + maintenanceDue,
        trend: 15,
        trendDirection: 'down',
        icon: 'alert',
      },
    ],
    statusBreakdown: { active, assigned, maintenance, retired },
    attentionBreakdown: { warrantyExpiring, maintenanceDue },
  };

  return NextResponse.json(data);
}

