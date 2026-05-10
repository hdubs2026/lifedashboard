import type { WhoopDaily } from '@/lib/types';

interface WhoopCardProps {
  data: WhoopDaily | null;
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

export default function WhoopCard({ data }: WhoopCardProps) {
  const fmt = (n: number | null, suffix = '') =>
    n !== null ? `${Math.round(n)}${suffix}` : '--';

  return (
    <div className="bg-[#111111] border border-[#1f1f1f] rounded-lg p-5">
      <p
        className="text-[#444] uppercase tracking-widest mb-4"
        style={{ fontSize: 10, fontFamily: 'Geist, sans-serif' }}
      >
        WHOOP
      </p>
      <div className="grid grid-cols-2 gap-x-6 gap-y-5">
        <StatCell value={fmt(data?.hrv ?? null, 'ms')} label="HRV" />
        <StatCell value={fmt(data?.resting_hr ?? null, 'bpm')} label="Resting HR" />
        <StatCell
          value={data?.sleep_hours !== null && data?.sleep_hours !== undefined
            ? `${data.sleep_hours.toFixed(1)}h`
            : '--'}
          label="Sleep Hours"
        />
        <StatCell
          value={data?.strain_score !== null && data?.strain_score !== undefined
            ? data.strain_score.toFixed(1)
            : '--'}
          label="Strain"
        />
      </div>
    </div>
  );
}
