'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LabelList,
} from 'recharts';
import type { MonthlyJobberData } from '@/lib/types';

interface BusinessMetricsChartProps {
  data: MonthlyJobberData[];
}

function fmtShort(n: number) {
  if (n >= 1000) return `$${(n / 1000).toFixed(0)}k`;
  return `$${n}`;
}

function fmtFull(n: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(n);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload as MonthlyJobberData;
  return (
    <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-3 text-xs space-y-1">
      <p className="text-white font-medium">{label}</p>
      <p className="text-[#888]">Revenue: <span className="text-white">{fmtFull(d.revenue)}</span></p>
      <p className="text-[#888]">Jobs: <span className="text-white">{d.jobs}</span></p>
      {d.estimatesSent > 0 && (
        <p className="text-[#888]">
          Estimates: <span className="text-white">{d.estimatesAccepted}/{d.estimatesSent}</span>
          {d.conversionRate !== null && (
            <span className="text-[#888]"> ({d.conversionRate.toFixed(0)}%)</span>
          )}
        </p>
      )}
      {d.momGrowth !== null && (
        <p className="text-[#888]">MoM: <span className={d.momGrowth >= 0 ? 'text-emerald-400' : 'text-red-400'}>
          {d.momGrowth >= 0 ? '+' : ''}{d.momGrowth.toFixed(1)}%
        </span></p>
      )}
    </div>
  );
}

function StatCell({ value, label }: { value: string; label: string }) {
  return (
    <div className="text-right">
      <p className="text-white text-xl font-medium" style={{ fontFamily: 'DM Mono, monospace' }}>
        {value}
      </p>
      <p className="text-[#444] uppercase tracking-widest mt-0.5" style={{ fontSize: 9, fontFamily: 'Geist, sans-serif' }}>
        {label}
      </p>
    </div>
  );
}

export default function BusinessMetricsChart({ data }: BusinessMetricsChartProps) {
  if (!data.length) {
    return (
      <div className="bg-[#111111] border border-[#1f1f1f] rounded-lg p-5 flex items-center justify-center h-64">
        <p className="text-[#555] text-sm">No business data yet</p>
      </div>
    );
  }

  const totalRevenue = data.reduce((sum, d) => sum + d.revenue, 0);
  const latest = data[data.length - 1];

  const totalSent = data.reduce((sum, d) => sum + d.estimatesSent, 0);
  const totalAccepted = data.reduce((sum, d) => sum + d.estimatesAccepted, 0);
  const overallConversion = totalSent > 0 ? (totalAccepted / totalSent) * 100 : null;

  return (
    <div className="bg-[#111111] border border-[#1f1f1f] rounded-lg p-5">
      <div className="flex items-start justify-between mb-5">
        <p
          className="text-[#444] uppercase tracking-widest"
          style={{ fontSize: 10, fontFamily: 'Geist, sans-serif' }}
        >
          Evergreen — Revenue Growth
        </p>
        <div className="flex gap-8">
          <StatCell value={fmtFull(totalRevenue)} label="Total Revenue" />
          <StatCell
            value={overallConversion !== null ? `${overallConversion.toFixed(1)}%` : '--'}
            label="Conversion Rate"
          />
          {latest.momGrowth !== null && (
            <div className="text-right">
              <p
                className={`text-xl font-medium ${latest.momGrowth >= 0 ? 'text-emerald-400' : 'text-red-400'}`}
                style={{ fontFamily: 'DM Mono, monospace' }}
              >
                {latest.momGrowth >= 0 ? '+' : ''}{latest.momGrowth.toFixed(1)}%
              </p>
              <p className="text-[#444] uppercase tracking-widest mt-0.5" style={{ fontSize: 9, fontFamily: 'Geist, sans-serif' }}>
                MoM Growth
              </p>
            </div>
          )}
        </div>
      </div>

      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} margin={{ top: 24, right: 4, bottom: 0, left: 0 }}>
          <XAxis
            dataKey="month"
            tick={{ fill: '#555', fontSize: 10, fontFamily: 'Geist, sans-serif' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tickFormatter={fmtShort}
            tick={{ fill: '#555', fontSize: 10, fontFamily: 'Geist, sans-serif' }}
            axisLine={false}
            tickLine={false}
            width={42}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
          <Bar dataKey="revenue" radius={[3, 3, 0, 0]} maxBarSize={52}>
            {data.map((entry, index) => (
              <Cell
                key={entry.monthKey}
                fill={index === data.length - 1 ? '#22c55e' : '#1f2e1f'}
              />
            ))}
            <LabelList
              dataKey="momGrowth"
              position="top"
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              formatter={(v: any) =>
                v != null ? `${v >= 0 ? '+' : ''}${(v as number).toFixed(0)}%` : ''
              }
              style={{ fill: '#555', fontSize: 9, fontFamily: 'Geist, sans-serif' }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
