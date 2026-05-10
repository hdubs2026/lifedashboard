import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import type { JobberDaily } from '@/lib/types';

export async function POST(request: NextRequest) {
  const secret = request.headers.get('x-webhook-secret');
  if (!secret || secret !== process.env.WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const supabase = createServerClient();
    const body = await request.json() as Partial<JobberDaily> & { date?: string };
    const today = new Date().toISOString().split('T')[0];

    const { error } = await supabase
      .from('jobber_daily')
      .upsert(
        {
          date: body.date ?? today,
          revenue_today: body.revenue_today ?? null,
          revenue_mtd: body.revenue_mtd ?? null,
          jobs_completed_today: body.jobs_completed_today ?? null,
          jobs_completed_mtd: body.jobs_completed_mtd ?? null,
          estimates_sent_today: body.estimates_sent_today ?? null,
          estimates_accepted_today: body.estimates_accepted_today ?? null,
          estimates_accepted_mtd: body.estimates_accepted_mtd ?? null,
          open_estimates: body.open_estimates ?? null,
          avg_response_time_hours: body.avg_response_time_hours ?? null,
        },
        { onConflict: 'date' }
      );

    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('POST /api/webhook/jobber error:', err);
    return NextResponse.json({ error: 'Failed to process webhook' }, { status: 500 });
  }
}
