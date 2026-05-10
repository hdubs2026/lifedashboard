import type { GolfRound } from '@/lib/types';

interface GolfCardProps {
  rounds: GolfRound[];
  roundsThisMonth: number;
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

export default function GolfCard({ rounds, roundsThisMonth }: GolfCardProps) {
  const lastRound = rounds[0] ?? null;
  const bestScore = rounds.length > 0
    ? Math.min(...rounds.filter((r) => r.score !== null).map((r) => r.score!))
    : null;

  return (
    <div className="bg-[#111111] border border-[#1f1f1f] rounded-lg p-5">
      <p
        className="text-[#444] uppercase tracking-widest mb-4"
        style={{ fontSize: 10, fontFamily: 'Geist, sans-serif' }}
      >
        Golf
      </p>
      <div className="grid grid-cols-2 gap-x-6 gap-y-5">
        <StatCell
          value={lastRound?.score !== null && lastRound?.score !== undefined ? `${lastRound.score}` : '--'}
          label="Last Round"
        />
        <StatCell
          value={lastRound?.handicap_index !== null && lastRound?.handicap_index !== undefined
            ? lastRound.handicap_index.toFixed(1)
            : '--'}
          label="Handicap"
        />
        <StatCell value={`${roundsThisMonth}`} label="Rounds MTM" />
        <StatCell
          value={bestScore !== null ? `${bestScore}` : '--'}
          label="Best Score"
        />
      </div>
    </div>
  );
}
