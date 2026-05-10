'use client';

import Ring from './Ring';

interface RecoveryRingProps {
  score: number | null;
}

export default function RecoveryRing({ score }: RecoveryRingProps) {
  const value = score ?? 0;
  const display = score !== null ? `${Math.round(score)}` : '--';
  return (
    <Ring
      value={value}
      displayValue={display}
      label="Recovery"
      color="#00ff87"
    />
  );
}
