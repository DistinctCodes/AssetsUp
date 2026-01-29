import { NextResponse } from 'next/server';
import type { ChartData } from '@/types/dashboard';

function parseRange(range: string | null) {
  const r = (range || '30d').toLowerCase();
  if (['7d', '30d', '90d', '6m', '12m'].includes(r)) return r;
  return '30d';
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const range = parseRange(searchParams.get('range'));

  // In production: compute based on real assets filtered by `range`.
  const reg =
    range === '7d'
      ? [8, 12, 10, 14, 16, 18]
      : range === '90d'
      ? [26, 34, 42, 40, 60, 72]
      : range === '6m'
      ? [30, 45, 60, 50, 80, 95]
      : range === '12m'
      ? [34, 52, 70, 66, 92, 120]
      : [24, 32, 48, 44, 68, 84];

  const data: ChartData = {
    categoryData: [
      { name: 'Hardware', value: 400, color: '#3b82f6' },
      { name: 'Software', value: 300, color: '#10b981' },
      { name: 'Furniture', value: 300, color: '#f59e0b' },
      { name: 'Vehicles', value: 200, color: '#ef4444' },
    ],
    departmentData: [
      { name: 'Eng', assets: 120 },
      { name: 'HR', assets: 50 },
      { name: 'Sales', assets: 80 },
      { name: 'Ops', assets: 95 },
    ],
    registrationData: [
      { date: 'Jan', count: reg[0] },
      { date: 'Feb', count: reg[1] },
      { date: 'Mar', count: reg[2] },
      { date: 'Apr', count: reg[3] },
      { date: 'May', count: reg[4] },
      { date: 'Jun', count: reg[5] },
    ],
  };

  return NextResponse.json(data);
}

