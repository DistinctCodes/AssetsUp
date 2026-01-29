import { NextResponse } from 'next/server';
import type { Activity } from '@/types/dashboard';

function parseRange(range: string | null) {
  const r = (range || '30d').toLowerCase();
  if (['7d', '30d', '90d', '6m', '12m'].includes(r)) return r;
  return '30d';
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  parseRange(searchParams.get('range'));

  const actions: Activity['actionType'][] = ['created', 'assigned', 'transferred', 'retired'];
  const users = ['Alice Dev', 'Bob Ops', 'Chioma Admin', 'Jane IT'];
  const assets = ['MacBook Pro M3', 'Dell XPS 15', 'iPhone 15', 'Lenovo ThinkPad', 'Office Chair'];

  const data: Activity[] = Array.from({ length: 10 }).map((_, i) => {
    const actionType = actions[i % actions.length];
    const assetName = assets[i % assets.length];
    const assetId = `asset-${(i % 5) + 1}`;
    return {
      id: `act-${i}`,
      assetId,
      assetName,
      actionType,
      user: users[i % users.length],
      timestamp: new Date(Date.now() - i * 36e5).toISOString(),
    };
  });

  return NextResponse.json(data);
}

