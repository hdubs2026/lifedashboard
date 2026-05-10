import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

interface WhoopIngestPayload {
  date: string;
  recovery_score?: number | null;
  hrv?: number | null;
  resting_hr?: number | null;
  sleep_performance?: number | null;
  sleep_hours?: number | null;
  strain_score?: number | null;
}

export async function POST(request: NextRequest) {
  const secret = request.headers.get('x-webhook-secret');
  if (!secret || secret !== process.env.WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const supabase = createServerClient();
    const body = await request.json() as WhoopIngestPayload;

    if (!body.date) {
      return NextResponse.json({ error: 'date is required' }, { status: 400 });
    }

    const { error } = await supabase
      .from('whoop_daily')
      .upsert(
        {
          date: body.date,
          recovery_score: body.recovery_score ?? null,
          hrv: body.hrv ?? null,
          resting_hr: body.resting_hr ?? null,
          sleep_performance: body.sleep_performance ?? null,
          sleep_hours: body.sleep_hours ?? null,
          strain_score: body.strain_score ?? null,
        },
        { onConflict: 'date' }
      );

    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('POST /api/whoop/ingest error:', err);
    return NextResponse.json({ error: 'Failed to ingest WHOOP data' }, { status: 500 });
  }
}
