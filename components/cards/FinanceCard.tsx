import type { DailyEntry } from '@/lib/types';

interface FinanceCardProps {
  data: DailyEntry | null;
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

function fmtMoney(n: number | null): string {
  if (n === null || n === undefined) return '--';
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}k`;
  return `$${n.toLocaleString()}`;
}

export default function FinanceCard({ data }: FinanceCardProps) {
  const checking = data?.checking_balance ?? null;
  const savings = data?.savings_balance ?? null;
  const roth = data?.roth_balance ?? null;
  const netWorth =
    checking !== null && savings !== null && roth !== null
      ? checking + savings + roth
      : null;

  return (
    <div className="bg-[#111111] border border-[#1f1f1f] rounded-lg p-5">
      <p
        className="text-[#444] uppercase tracking-widest mb-4"
        style={{ fontSize: 10, fontFamily: 'Geist, sans-serif' }}
      >
        Finance
      </p>
      <div className="grid grid-cols-2 gap-x-6 gap-y-5">
        <StatCell value={fmtMoney(checking)} label="Checking" />
        <StatCell value={fmtMoney(savings)} label="Savings" />
        <StatCell value={fmtMoney(roth)} label="ROTH IRA" />
        <StatCell value={fmtMoney(netWorth)} label="Net Worth" />
      </div>
    </div>
  );
}
