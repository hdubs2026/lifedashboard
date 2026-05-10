import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { createServerClient } from '@/lib/supabase';
import { fetchNotionTasks } from '@/lib/notion';
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
import GolfChart from '@/components/cards/GolfChart';
import NetWorthChart from '@/components/cards/NetWorthChart';
import MarketsCard from '@/components/cards/MarketsCard';
import TodoList from '@/components/TodoList';
import FaithCard from '@/components/FaithCard';
import DashboardClient from '@/components/DashboardClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface NetWorthPoint {
  date: string;
  checking: number | null;
  savings: number | null;
  roth: number | null;
  total: number | null;
}

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
    netWorthHistoryResult,
    notionResult,
  ] = await Promise.allSettled([
    supabase.from('whoop_daily').select('*').eq('date', today).maybeSingle(),
    supabase.from('jobber_daily').select('*').eq('date', today).maybeSingle(),
    supabase.from('daily_entries').select('*').eq('date', today).maybeSingle(),
    supabase.from('daily_entries').select('*').order('date', { ascending: false }).limit(30),
    supabase.from('tasks').select('*').eq('date', today).eq('source', 'manual').order('created_at', { ascending: true }),
    supabase.from('golf_rounds').select('*').order('date', { ascending: false }).limit(20),
    supabase.from('daily_entries').select('date, checking_balance, savings_balance, roth_balance').order('date', { ascending: true }).limit(90),
    fetchNotionTasks(today),
  ]);

  const whoop = whoopResult.status === 'fulfilled' ? (whoopResult.value.data as WhoopDaily | null) : null;
  const jobber = jobberResult.status === 'fulfilled' ? (jobberResult.value.data as JobberDaily | null) : null;
  const entryToday = entryTodayResult.status === 'fulfilled' ? (entryTodayResult.value.data as DailyEntry | null) : null;
  const recentEntries = entriesRecentResult.status === 'fulfilled' ? ((entriesRecentResult.value.data ?? []) as DailyEntry[]) : [];
  const tasks = tasksResult.status === 'fulfilled' ? ((tasksResult.value.data ?? []) as Task[]) : [];
  const golfRounds = golfResult.status === 'fulfilled' ? ((golfResult.value.data ?? []) as GolfRound[]) : [];
  const notionTasks = notionResult.status === 'fulfilled' ? notionResult.value : [];

  const rawHistory = netWorthHistoryResult.status === 'fulfilled'
    ? (netWorthHistoryResult.value.data ?? []) as Array<{ date: string; checking_balance: number | null; savings_balance: number | null; roth_balance: number | null }>
    : [];
  const netWorthHistory: NetWorthPoint[] = rawHistory.map((e) => {
    const sum = (e.checking_balance ?? 0) + (e.savings_balance ?? 0) + (e.roth_balance ?? 0);
    return {
      date: e.date,
      checking: e.checking_balance,
      savings: e.savings_balance,
      roth: e.roth_balance,
      total: sum > 0 ? sum : null,
    };
  });

  const streaks = computeStreaks(recentEntries);
  const habitsCompleted = [
    entryToday?.prayer_done,
    entryToday?.bible_done,
    entryToday?.workout_done,
  ].filter(Boolean).length;
  const roundsThisMonth = golfRounds.filter((r) => r.date >= startOfMonth).length;

  return {
    whoop,
    jobber,
    entryToday,
    tasks,
    notionTasks,
    golfRounds,
    streaks,
    habitsCompleted,
    roundsThisMonth,
    netWorthHistory,
    hasEntryToday: entryToday !== null,
  };
}

export default async function DashboardPage() {
  const supabaseAuth = await createSupabaseServerClient();
  const { data: { user } } = await supabaseAuth.auth.getUser();
  if (!user) redirect('/login');

  const baseUrl = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : 'http://localhost:3000';
  fetch(`${baseUrl}/api/whoop`).catch(() => {});

  const data = await fetchDashboardData();

  return (
    <>
      <DashboardClient hasEntryToday={data.hasEntryToday} />

      <main className="min-h-screen bg-[#0a0a0a] px-6 py-6 max-w-[1400px] mx-auto">
        <TopBar recoveryScore={data.whoop?.recovery_score ?? null} whoopConnected={data.whoop !== null} />

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

        {/* Row 3: Net Worth + Golf Chart */}
        <section className="grid gap-4 mb-6" style={{ gridTemplateColumns: '2fr 1fr' }}>
          <NetWorthChart data={data.netWorthHistory} />
          <GolfChart rounds={data.golfRounds} />
        </section>

        {/* Row 4: Markets + Todo */}
        <section className="grid gap-4 mb-6" style={{ gridTemplateColumns: '3fr 2fr' }}>
          <MarketsCard />
          <TodoList notionTasks={data.notionTasks} />
        </section>

        {/* Row 5: Faith */}
        <section className="mb-6">
          <FaithCard
            prayerDone={data.entryToday?.prayer_done ?? false}
            bibleDone={data.entryToday?.bible_done ?? false}
            workoutDone={data.entryToday?.workout_done ?? false}
            reflection={data.entryToday?.reflection ?? null}
            streaks={data.streaks}
          />
        </section>
      </main>
    </>
  );
}
