import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { fetchWhoopToday } from '@/lib/whoop';
import type { WhoopDaily } from '@/lib/types';

export async function GET() {
  try {
    const supabase = createServerClient();
    const today = new Date().toISOString().split('T')[0];

    const whoopData = await fetchWhoopToday(today);

    if (Object.keys(whoopData).length > 0) {
      const { error } = await supabase
        .from('whoop_daily')
        .upsert({ date: today, ...whoopData }, { onConflict: 'date' });

      if (error) throw error;
    }

    // Always return the latest from DB
    const { data, error: fetchError } = await supabase
      .from('whoop_daily')
      .select('*')
      .eq('date', today)
      .maybeSingle();

    if (fetchError) throw fetchError;

    return NextResponse.json({ whoop: data as WhoopDaily | null });
  } catch (err) {
    console.error('GET /api/whoop error:', err);
    return NextResponse.json({ error: 'Failed to fetch WHOOP data' }, { status: 500 });
  }
}
