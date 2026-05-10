'use client';

import Ring from './Ring';

interface BusinessRingProps {
  jobsCompleted: number | null;
  monthlyGoal?: number;
}

export default function BusinessRing({ jobsCompleted, monthlyGoal = 100 }: BusinessRingProps) {
  const value = jobsCompleted !== null ? Math.min((jobsCompleted / monthlyGoal) * 100, 100) : 0;
  const display = jobsCompleted !== null ? `${jobsCompleted}` : '--';
  return (
    <Ring
      value={value}
      displayValue={display}
      label="Business"
      color="#4a9eff"
    />
  );
}
