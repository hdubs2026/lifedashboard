import type { DailyEntry, HabitStreaks } from './types';

export function computeStreaks(entries: DailyEntry[]): HabitStreaks {
  // entries should be sorted descending by date
  const sorted = [...entries].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  function countStreak(field: keyof Pick<DailyEntry, 'prayer_done' | 'bible_done' | 'workout_done'>): number {
    let streak = 0;
    for (const entry of sorted) {
      if (entry[field]) {
        streak++;
      } else {
        break;
      }
    }
    return streak;
  }

  return {
    prayer: countStreak('prayer_done'),
    bible: countStreak('bible_done'),
    workout: countStreak('workout_done'),
  };
}
