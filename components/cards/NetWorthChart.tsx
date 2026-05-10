'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';

interface DataPoint {
  date: string;
  checking: number | null;
  savings: number | null;
  roth: number | null;
  total: number | null;
}

interface NetWorthChartProps {
  data: DataPoint[];
}

function fmt(value: number) {
  if (value >= 1000) return `$${(value / 1000).toFixed(0)}k`;
  return `$${value.toFixed(0)}`;
}

function fmtFull(value: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
}

function fmtDate(dateStr: string) {
  const [, month, day] = dateStr.split('-');
  return `${parseInt(month)}/${parseInt(day)}`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded px-3 py-2 text-xs">
      <p className="text-[#666] mb-1">{label}</p>
      {payload.map((entry: { name: string; value: number; color: string }) => (
        <p key={entry.name} style={{ color: entry.color }} className="leading-5">
          {entry.name}: {fmtFull(entry.value)}
        </p>
      ))}
    </div>
  );
}

export default function NetWorthChart({ data }: NetWorthChartProps) {
  const filtered = data.filter((d) => d.total !== null);

  if (filtered.length < 2) {
    return (
      <div className="bg-[#111111] border border-[#1f1f1f] rounded-lg p-5">
        <p className="text-[#444] text-xs uppercase tracking-widest mb-4">Net Worth Over Time</p>
        <p className="text-[#444] text-sm">Not enough data yet — fill in your finance balances each morning to see the trend.</p>
      </div>
    );
  }

  const chartData = filtered.map((d) => ({
    date: fmtDate(d.date),
    'Net Worth': d.total!,
    'Checking': d.checking ?? 0,
    'Savings': d.savings ?? 0,
    'ROTH': d.roth ?? 0,
  }));

  return (
    <div className="bg-[#111111] border border-[#1f1f1f] rounded-lg p-5">
      <p className="text-[#666] text-xs uppercase tracking-widest mb-4">Net Worth Over Time</p>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1f1f1f" />
          <XAxis
            dataKey="date"
            tick={{ fill: '#555', fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            tickFormatter={fmt}
            tick={{ fill: '#555', fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            width={40}
          />
          <Tooltip content={<CustomTooltip />} />
          <Line
            type="monotone"
            dataKey="Net Worth"
            stroke="#00ff87"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: '#00ff87' }}
          />
          <Line type="monotone" dataKey="Checking" stroke="#4a9eff" strokeWidth={1} dot={false} strokeOpacity={0.5} />
          <Line type="monotone" dataKey="Savings" stroke="#9b8afb" strokeWidth={1} dot={false} strokeOpacity={0.5} />
          <Line type="monotone" dataKey="ROTH" stroke="#c9a84c" strokeWidth={1} dot={false} strokeOpacity={0.5} />
        </LineChart>
      </ResponsiveContainer>
      <div className="flex gap-4 mt-3">
        {[
          { label: 'Net Worth', color: '#00ff87' },
          { label: 'Checking', color: '#4a9eff' },
          { label: 'Savings', color: '#9b8afb' },
          { label: 'ROTH', color: '#c9a84c' },
        ].map(({ label, color }) => (
          <div key={label} className="flex items-center gap-1.5">
            <div className="w-3 h-0.5" style={{ backgroundColor: color }} />
            <span className="text-[#555] text-xs">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
