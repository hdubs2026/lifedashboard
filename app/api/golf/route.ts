import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import type { GolfRound } from '@/lib/types';

export async function GET() {
  try {
    const supabase = createServerClient();
    const today = new Date().toISOString().split('T')[0];
    const startOfMonth = today.slice(0, 7) + '-01';

    const { data, error } = await supabase
      .from('golf_rounds')
      .select('*')
      .order('date', { ascending: false })
      .limit(20);

    if (error) throw error;

    const roundsThisMonth = (data ?? []).filter(
      (r) => r.date >= startOfMonth
    ).length;

    return NextResponse.json({
      rounds: (data ?? []) as GolfRound[],
      roundsThisMonth,
    });
  } catch (err) {
    console.error('GET /api/golf error:', err);
    return NextResponse.json({ error: 'Failed to fetch golf rounds' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient();
    const body = await request.json() as {
      course?: string;
      score?: number;
      handicap_index?: number;
      notes?: string;
      date?: string;
    };
    const today = new Date().toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('golf_rounds')
      .insert({
        date: body.date ?? today,
        course: body.course ?? null,
        score: body.score ?? null,
        handicap_index: body.handicap_index ?? null,
        notes: body.notes ?? null,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ round: data as GolfRound });
  } catch (err) {
    console.error('POST /api/golf error:', err);
    return NextResponse.json({ error: 'Failed to log golf round' }, { status: 500 });
  }
}
