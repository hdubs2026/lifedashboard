'use client';

import { useEffect, useState } from 'react';

interface RingProps {
  value: number;        // 0-100 percentage (already normalized)
  displayValue: string; // what to show in center (could be "72" or "8.5" or "3/4")
  label: string;
  color: string;        // hex color like "#00ff87"
  size?: number;        // default 120
  strokeWidth?: number; // default 12
}

export default function Ring({
  value,
  displayValue,
  label,
  color,
  size = 120,
  strokeWidth = 12,
}: RingProps) {
  const [animatedValue, setAnimatedValue] = useState(0);

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clampedValue = Math.min(Math.max(value, 0), 100);
  const dashOffset = circumference - (animatedValue / 100) * circumference;

  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedValue(clampedValue);
    }, 100);
    return () => clearTimeout(timer);
  }, [clampedValue]);

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          style={{ transform: 'rotate(-90deg)' }}
        >
          {/* Background track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeOpacity={0.15}
          />
          {/* Animated fill */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            style={{
              transition: 'stroke-dashoffset 800ms ease-out',
            }}
          />
        </svg>
        {/* Center value */}
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{ fontFamily: 'DM Mono, monospace' }}
        >
          <span
            className="text-white font-medium"
            style={{ fontSize: 22, lineHeight: 1 }}
          >
            {displayValue === '--' || displayValue === null || displayValue === undefined
              ? '--'
              : displayValue}
          </span>
        </div>
      </div>
      <span
        className="text-[#666] tracking-widest uppercase"
        style={{ fontSize: 10, fontFamily: 'Geist, sans-serif', letterSpacing: '0.1em' }}
      >
        {label}
      </span>
    </div>
  );
}
