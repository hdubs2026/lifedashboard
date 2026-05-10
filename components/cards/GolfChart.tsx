'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import type { GolfRound } from '@/lib/types';

const PAR = 72;

interface GolfChartProps {
  rounds: GolfRound[];
}

function CustomTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const val = payload[0].value;
  const sign = val > 0 ? '+' : '';
  return (
    <div
      className="bg-[#1a1a1a] border border-[#2a2a2a] rounded px-3 py-2"
      style={{ fontFamily: 'DM Mono, monospace', fontSize: 12 }}
    >
      <p className="text-[#555] mb-1">{label}</p>
      <p style={{ color: val <= 0 ? '#00ff87' : '#ff4444' }}>
        {sign}{val} vs par
      </p>
    </div>
  );
}

export default function GolfChart({ rounds }: GolfChartProps) {
  const data = [...rounds]
    .filter((r) => r.score !== null)
    .reverse()
    .map((r) => ({
      date: r.date.slice(5),
      scoreToPar: r.score! - PAR,
      course: r.course ?? '',
    }));

  return (
    <div className="bg-[#111111] border border-[#1f1f1f] rounded-lg p-5 h-full">
      <p
        className="text-[#444] uppercase tracking-widest mb-4"
        style={{ fontSize: 10, fontFamily: 'Geist, sans-serif' }}
      >
        Score to Par
      </p>
      {data.length === 0 ? (
        <p className="text-[#333] text-sm" style={{ fontFamily: 'Geist, sans-serif' }}>
          No rounds logged yet.
        </p>
      ) : (
        <ResponsiveContainer width="100%" height={140}>
          <LineChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
            <XAxis
              dataKey="date"
              tick={{ fill: '#444', fontSize: 9, fontFamily: 'DM Mono, monospace' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: '#444', fontSize: 9, fontFamily: 'DM Mono, monospace' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => (v > 0 ? `+${v}` : `${v}`)}
            />
            <ReferenceLine y={0} stroke="#2a2a2a" strokeDasharray="4 4" />
            <Tooltip content={<CustomTooltip />} />
            <Line
              type="monotone"
              dataKey="scoreToPar"
              stroke="#00ff87"
              strokeWidth={1.5}
              dot={{ fill: '#00ff87', r: 3, strokeWidth: 0 }}
              activeDot={{ r: 4, fill: '#00ff87' }}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
