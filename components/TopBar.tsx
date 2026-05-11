'use client';

import { useState, useEffect } from 'react';

interface TopBarProps {
  recoveryScore: number | null;
  whoopConnected?: boolean;
  jobberConnected?: boolean;
}

function getRecoveryColor(score: number | null): string {
  if (score === null) return '#555';
  if (score >= 67) return '#00ff87';
  if (score >= 34) return '#c9a84c';
  return '#ff6b35';
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function TopBar({ recoveryScore, whoopConnected = true, jobberConnected = true }: TopBarProps) {
  const [time, setTime] = useState('');
  const [dateStr, setDateStr] = useState('');

  useEffect(() => {
    function update() {
      const now = new Date();
      setTime(
        now.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
        })
      );
      setDateStr(
        now.toLocaleDateString('en-US', {
          weekday: 'long',
          month: 'long',
          day: 'numeric',
        })
      );
    }
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  const recoveryColor = getRecoveryColor(recoveryScore);

  return (
    <div className="flex items-center justify-between py-4 px-0 mb-8">
      <div>
        <h1
          className="text-white text-xl font-semibold"
          style={{ fontFamily: 'Geist, sans-serif' }}
        >
          {getGreeting()}, Hunter.
        </h1>
        <p
          className="text-[#555] text-sm mt-0.5"
          style={{ fontFamily: 'Geist, sans-serif' }}
        >
          {dateStr}
        </p>
      </div>

      <div className="flex items-center gap-4">
        {/* Jobber reconnect button */}
        {!jobberConnected && (
          <a
            href="/api/jobber/auth"
            className="text-xs px-3 py-1.5 rounded border border-[#f97316]/30 text-[#f97316] hover:bg-[#f97316]/10 transition-colors"
            style={{ fontFamily: 'DM Mono, monospace' }}
          >
            Reconnect Jobber
          </a>
        )}

        {/* WHOOP reconnect button */}
        {!whoopConnected && (
          <a
            href="/api/whoop/auth"
            className="text-xs px-3 py-1.5 rounded border border-[#00ff87]/30 text-[#00ff87] hover:bg-[#00ff87]/10 transition-colors"
            style={{ fontFamily: 'DM Mono, monospace' }}
          >
            Reconnect WHOOP
          </a>
        )}

        {/* Recovery badge */}
        <div
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border"
          style={{ borderColor: `${recoveryColor}30`, backgroundColor: `${recoveryColor}10` }}
        >
          <div
            className="w-1.5 h-1.5 rounded-full"
            style={{ backgroundColor: recoveryColor }}
          />
          <span
            className="text-sm font-medium"
            style={{ color: recoveryColor, fontFamily: 'DM Mono, monospace', fontSize: 13 }}
          >
            {recoveryScore !== null ? `${Math.round(recoveryScore)}%` : '--'}
          </span>
        </div>

        {/* Clock */}
        <span
          className="text-[#555]"
          style={{ fontFamily: 'DM Mono, monospace', fontSize: 14 }}
        >
          {time}
        </span>
      </div>
    </div>
  );
}
