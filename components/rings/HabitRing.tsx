'use client';

import Ring from './Ring';

interface HabitRingProps {
  completed: number; // 0-4
  total?: number;    // default 4
}

export default function HabitRing({ completed, total = 4 }: HabitRingProps) {
  const value = (completed / total) * 100;
  const display = `${completed}/${total}`;
  return (
    <Ring
      value={value}
      displayValue={display}
      label="Habits"
      color="#c9a84c"
    />
  );
}
