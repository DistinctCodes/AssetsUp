'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';

const CONDITION_SCORE: Record<string, number> = {
  Excellent: 4,
  Good: 3,
  Fair: 2,
  Poor: 1,
};

const SCORE_LABEL: Record<number, string> = {
  4: 'Excellent',
  3: 'Good',
  2: 'Fair',
  1: 'Poor',
};

const COLORS = ['#6366f1', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6'];

interface DataPoint {
  date: string;
  condition: string;
}

interface AssetSeries {
  assetId: string;
  name: string;
  history: DataPoint[];
}

interface Props {
  series: AssetSeries[];
}

export function AssetConditionTrendChart({ series }: Props) {
  const allDates = [
    ...new Set(series.flatMap((s) => s.history.map((h) => h.date))),
  ].sort();

  const chartData = allDates.map((date) => {
    const point: Record<string, unknown> = { date };
    series.forEach((s) => {
      const found = s.history.find((h) => h.date === date);
      point[s.assetId] = found ? (CONDITION_SCORE[found.condition] ?? null) : null;
    });
    return point;
  });

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" tick={{ fontSize: 12 }} />
        <YAxis
          domain={[1, 4]}
          ticks={[1, 2, 3, 4]}
          tickFormatter={(v: number) => SCORE_LABEL[v] ?? ''}
          tick={{ fontSize: 11 }}
        />
        <Tooltip formatter={(value: number) => SCORE_LABEL[value] ?? value} />
        <Legend />
        <ReferenceLine
          y={2}
          stroke="#f59e0b"
          strokeDasharray="4 4"
          label={{ value: 'Fair', position: 'right', fontSize: 11 }}
        />
        {series.map((s, i) => (
          <Line
            key={s.assetId}
            type="monotone"
            dataKey={s.assetId}
            name={s.name}
            stroke={COLORS[i % COLORS.length]}
            dot={{ r: 3 }}
            connectNulls
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
