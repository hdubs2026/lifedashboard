'use client';

import Ring from './Ring';

interface StrainRingProps {
  strain: number | null;
}

export default function StrainRing({ strain }: StrainRingProps) {
  // Strain is 0-21, normalize to 0-100
  const value = strain !== null ? (strain / 21) * 100 : 0;
  const display = strain !== null ? strain.toFixed(1) : '--';
  return (
    <Ring
      value={value}
      displayValue={display}
      label="Strain"
      color="#4a9eff"
    />
  );
}
