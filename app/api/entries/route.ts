import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import type { DailyEntry } from '@/lib/types';

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient();
    const today = new Date().toISOString().split('T')[0];

    const { data: todayEntry, error: todayError } = await supabase
      .from('daily_entries')
      .select('*')
      .eq('date', today)
      .maybeSingle();

    if (todayError) throw todayError;

    // Last 30 days for streak calculation
    const { data: recentEntries, error: recentError } = await supabase
      .from('daily_entries')
      .select('*')
      .order('date', { ascending: false })
      .limit(30);

    if (recentError) throw recentError;

    return NextResponse.json({
      today: todayEntry as DailyEntry | null,
      recent: (recentEntries ?? []) as DailyEntry[],
    });
  } catch (err) {
    console.error('GET /api/entries error:', err);
    return NextResponse.json({ error: 'Failed to fetch entries' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient();
    const body = await request.json() as Partial<DailyEntry>;
    const today = new Date().toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('daily_entries')
      .upsert({ ...body, date: today }, { onConflict: 'date' })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ entry: data as DailyEntry });
  } catch (err) {
    console.error('POST /api/entries error:', err);
    return NextResponse.json({ error: 'Failed to save entry' }, { status: 500 });
  }
}
