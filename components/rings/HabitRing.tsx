'use client';

import Ring from './Ring';

interface HabitRingProps {
  completed: number; // 0-3
  total?: number;    // default 3
}

export default function HabitRing({ completed, total = 3 }: HabitRingProps) {
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
