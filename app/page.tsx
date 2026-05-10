import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { createServerClient } from '@/lib/supabase';
import { computeStreaks } from '@/lib/streaks';
import type { DailyEntry, WhoopDaily, JobberDaily, Task, GolfRound } from '@/lib/types';

import TopBar from '@/components/TopBar';
import RecoveryRing from '@/components/rings/RecoveryRing';
import StrainRing from '@/components/rings/StrainRing';
import SleepRing from '@/components/rings/SleepRing';
import BusinessRing from '@/components/rings/BusinessRing';
import HabitRing from '@/components/rings/HabitRing';
import JobberCard from '@/components/cards/JobberCard';
import FinanceCard from '@/components/cards/FinanceCard';
import WhoopCard from '@/components/cards/WhoopCard';
import GolfCard from '@/components/cards/GolfCard';
import TaskList from '@/components/TaskList';
import TodoList from '@/components/TodoList';
import FaithCard from '@/components/FaithCard';
import DashboardClient from '@/components/DashboardClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function fetchDashboardData() {
  const supabase = createServerClient();
  const today = new Date().toISOString().split('T')[0];
  const startOfMonth = today.slice(0, 7) + '-01';

  const [
    whoopResult,
    jobberResult,
    entryTodayResult,
    entriesRecentResult,
    tasksResult,
    golfResult,
  ] = await Promise.allSettled([
    supabase.from('whoop_daily').select('*').eq('date', today).maybeSingle(),
    supabase.from('jobber_daily').select('*').eq('date', today).maybeSingle(),
    supabase.from('daily_entries').select('*').eq('date', today).maybeSingle(),
    supabase.from('daily_entries').select('*').order('date', { ascending: false }).limit(30),
    supabase.from('tasks').select('*').eq('date', today).in('source', ['ai_agent', 'manual']).order('created_at', { ascending: true }),
    supabase.from('golf_rounds').select('*').order('date', { ascending: false }).limit(20),
  ]);

  const whoop = whoopResult.status === 'fulfilled' ? (whoopResult.value.data as WhoopDaily | null) : null;
  const jobber = jobberResult.status === 'fulfilled' ? (jobberResult.value.data as JobberDaily | null) : null;
  const entryToday = entryTodayResult.status === 'fulfilled' ? (entryTodayResult.value.data as DailyEntry | null) : null;
  const recentEntries = entriesRecentResult.status === 'fulfilled' ? ((entriesRecentResult.value.data ?? []) as DailyEntry[]) : [];
  const tasks = tasksResult.status === 'fulfilled' ? ((tasksResult.value.data ?? []) as Task[]) : [];
  const golfRounds = golfResult.status === 'fulfilled' ? ((golfResult.value.data ?? []) as GolfRound[]) : [];

  const streaks = computeStreaks(recentEntries);

  const habitsCompleted = [
    entryToday?.prayer_done,
    entryToday?.bible_done,
    entryToday?.workout_done,
    entryToday?.journal_done,
  ].filter(Boolean).length;

  // Rounds this month
  const roundsThisMonth = golfRounds.filter((r) => r.date >= startOfMonth).length;

  return {
    whoop,
    jobber,
    entryToday,
    tasks,
    golfRounds,
    streaks,
    habitsCompleted,
    roundsThisMonth,
    hasEntryToday: entryToday !== null,
  };
}

export default async function DashboardPage() {
  // Auth check
  const supabaseAuth = await createSupabaseServerClient();
  const { data: { user } } = await supabaseAuth.auth.getUser();
  if (!user) {
    redirect('/login');
  }

  // Trigger WHOOP data sync in background (don't block render)
  const baseUrl = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : 'http://localhost:3000';
  fetch(`${baseUrl}/api/whoop`).catch(() => {});

  const data = await fetchDashboardData();

  const aiTasks = data.tasks.filter((t) => t.source === 'ai_agent');

  return (
    <>
      {/* Client wrapper handles modal */}
      <DashboardClient hasEntryToday={data.hasEntryToday} />

      <main className="min-h-screen bg-[#0a0a0a] px-6 py-6 max-w-[1400px] mx-auto">
        {/* Top Bar */}
        <TopBar recoveryScore={data.whoop?.recovery_score ?? null} />

        {/* Row 1: Rings */}
        <section className="flex items-center justify-center gap-12 mb-10">
          <RecoveryRing score={data.whoop?.recovery_score ?? null} />
          <StrainRing strain={data.whoop?.strain_score ?? null} />
          <SleepRing sleepPerformance={data.whoop?.sleep_performance ?? null} />
          <BusinessRing jobsCompleted={data.jobber?.jobs_completed_mtd ?? null} />
          <HabitRing completed={data.habitsCompleted} />
        </section>

        {/* Row 2: Stat Cards */}
        <section className="grid grid-cols-4 gap-4 mb-6">
          <JobberCard data={data.jobber} />
          <FinanceCard data={data.entryToday} />
          <WhoopCard data={data.whoop} />
          <GolfCard rounds={data.golfRounds} roundsThisMonth={data.roundsThisMonth} />
        </section>

        {/* Row 3: Tasks */}
        <section className="grid gap-4 mb-6" style={{ gridTemplateColumns: '3fr 2fr' }}>
          <TaskList initialTasks={aiTasks} />
          <TodoList notionTasks={[]} />
        </section>

        {/* Row 4: Faith */}
        <section className="mb-6">
          <FaithCard
            prayerDone={data.entryToday?.prayer_done ?? false}
            bibleDone={data.entryToday?.bible_done ?? false}
            workoutDone={data.entryToday?.workout_done ?? false}
            journalDone={data.entryToday?.journal_done ?? false}
            reflection={data.entryToday?.reflection ?? null}
            streaks={data.streaks}
          />
        </section>
      </main>
    </>
  );
}
