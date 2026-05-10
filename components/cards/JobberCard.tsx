import type { JobberDaily } from '@/lib/types';

interface JobberCardProps {
  data: JobberDaily | null;
}

function StatCell({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span
        className="text-white text-2xl font-medium"
        style={{ fontFamily: 'DM Mono, monospace' }}
      >
        {value}
      </span>
      <span
        className="text-[#555] uppercase tracking-widest"
        style={{ fontSize: 10, fontFamily: 'Geist, sans-serif' }}
      >
        {label}
      </span>
    </div>
  );
}

export default function JobberCard({ data }: JobberCardProps) {
  const fmt = (n: number | null, prefix = '') =>
    n !== null ? `${prefix}${n.toLocaleString()}` : '--';

  return (
    <div className="bg-[#111111] border border-[#1f1f1f] rounded-lg p-5">
      <p
        className="text-[#444] uppercase tracking-widest mb-4"
        style={{ fontSize: 10, fontFamily: 'Geist, sans-serif' }}
      >
        Evergreen
      </p>
      <div className="grid grid-cols-2 gap-x-6 gap-y-5">
        <StatCell value={fmt(data?.revenue_mtd ?? null, '$')} label="Revenue MTD" />
        <StatCell value={fmt(data?.jobs_completed_mtd ?? null)} label="Jobs MTD" />
        <StatCell value={fmt(data?.open_estimates ?? null)} label="Open Estimates" />
        <StatCell
          value={data?.avg_response_time_hours !== null && data?.avg_response_time_hours !== undefined
            ? `${data.avg_response_time_hours.toFixed(1)}h`
            : '--'}
          label="Avg Response"
        />
      </div>
    </div>
  );
}
