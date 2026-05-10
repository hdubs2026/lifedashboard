import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { aggregateMonthlyJobber } from '@/lib/jobber';

export async function GET() {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from('jobber_daily')
    .select('date, revenue_mtd, jobs_completed_mtd, estimates_sent_today, estimates_accepted_today')
    .order('date', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(aggregateMonthlyJobber(data ?? []));
}
