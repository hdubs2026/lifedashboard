'use client';

import { useState } from 'react';
import type { HabitStreaks } from '@/lib/types';

interface FaithCardProps {
  prayerDone: boolean;
  bibleDone: boolean;
  workoutDone: boolean;
  reflection: string | null;
  streaks: HabitStreaks;
  entryId?: string;
}

const HABITS = [
  { key: 'prayer', label: 'Prayer' },
  { key: 'bible', label: 'Bible' },
  { key: 'workout', label: 'Workout' },
] as const;

export default function FaithCard({
  prayerDone,
  bibleDone,
  workoutDone,
  reflection: initialReflection,
  streaks,
}: FaithCardProps) {
  const [habits, setHabits] = useState({
    prayer: prayerDone,
    bible: bibleDone,
    workout: workoutDone,
  });
  const [reflection, setReflection] = useState(initialReflection ?? '');
  const [saving, setSaving] = useState(false);

  async function toggleHabit(key: keyof typeof habits) {
    const newValue = !habits[key];
    setHabits((prev) => ({ ...prev, [key]: newValue }));

    try {
      await fetch('/api/entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [`${key}_done`]: newValue }),
      });
    } catch (err) {
      console.error('Failed to update habit:', err);
      setHabits((prev) => ({ ...prev, [key]: !newValue }));
    }
  }

  async function saveReflection() {
    setSaving(true);
    try {
      await fetch('/api/entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reflection }),
      });
    } catch (err) {
      console.error('Failed to save reflection:', err);
    } finally {
      setSaving(false);
    }
  }

  const habitValues = {
    prayer: habits.prayer,
    bible: habits.bible,
    workout: habits.workout,
  };

  return (
    <div className="bg-[#111111] border border-[#1f1f1f] rounded-lg p-5">
      <p
        className="text-[#444] uppercase tracking-widest mb-4"
        style={{ fontSize: 10, fontFamily: 'Geist, sans-serif' }}
      >
        Faith &amp; Habits
      </p>

      <div className="grid grid-cols-3 gap-4 mb-5">
        {HABITS.map(({ key, label }) => {
          const done = habitValues[key];
          const streak = streaks[key];
          return (
            <button
              key={key}
              type="button"
              onClick={() => toggleHabit(key)}
              className="flex flex-col items-center gap-2 p-3 rounded-lg border transition-all"
              style={{
                borderColor: done ? '#c9a84c' : '#1f1f1f',
                backgroundColor: done ? '#c9a84c10' : 'transparent',
              }}
            >
              <div
                className="w-5 h-5 rounded border-2 flex items-center justify-center transition-colors"
                style={{
                  borderColor: done ? '#c9a84c' : '#333',
                  backgroundColor: done ? '#c9a84c' : 'transparent',
                }}
              >
                {done && (
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                    <path
                      d="M2 5l2.5 2.5 3.5-4"
                      stroke="black"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </div>
              <span
                className="text-[#aaa]"
                style={{ fontSize: 11, fontFamily: 'Geist, sans-serif' }}
              >
                {label}
              </span>
              <span
                className="text-[#555]"
                style={{ fontSize: 9, fontFamily: 'DM Mono, monospace' }}
              >
                {streak}d
              </span>
            </button>
          );
        })}
      </div>

      {/* Reflection */}
      <div className="flex gap-2">
        <input
          type="text"
          value={reflection}
          onChange={(e) => setReflection(e.target.value)}
          onBlur={saveReflection}
          placeholder="Today's reflection..."
          className="flex-1 bg-[#0a0a0a] border border-[#1f1f1f] rounded px-3 py-2 text-[#aaa] text-sm placeholder-[#333] focus:outline-none focus:border-[#c9a84c] transition-colors"
          style={{ fontFamily: 'Geist, sans-serif' }}
        />
        {saving && (
          <span className="text-[#333] text-xs self-center" style={{ fontFamily: 'Geist, sans-serif' }}>
            saving...
          </span>
        )}
      </div>
    </div>
  );
}
