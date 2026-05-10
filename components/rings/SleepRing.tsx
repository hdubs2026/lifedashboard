'use client';

import Ring from './Ring';

interface SleepRingProps {
  sleepPerformance: number | null;
}

export default function SleepRing({ sleepPerformance }: SleepRingProps) {
  const value = sleepPerformance ?? 0;
  const display = sleepPerformance !== null ? `${Math.round(sleepPerformance)}` : '--';
  return (
    <Ring
      value={value}
      displayValue={display}
      label="Sleep"
      color="#9b8afb"
    />
  );
}
