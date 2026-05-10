import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import type { WhoopDaily } from '@/lib/types';

const WHOOP_API_BASE = 'https://api.prod.whoop.com/developer/v1';
const WHOOP_TOKEN_URL = 'https://api.prod.whoop.com/oauth/oauth2/token';

async function getToken(): Promise<string | null> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from('whoop_tokens')
    .select('access_token, refresh_token, expires_at')
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) { console.error('whoop_tokens fetch error:', error); return null; }
  if (!data) { console.warn('No WHOOP tokens found'); return null; }

  // Refresh if expiring within 5 minutes
  const expiresAt = new Date(data.expires_at).getTime();
  if (Date.now() < expiresAt - 5 * 60 * 1000) {
    return data.access_token;
  }

  // Refresh
  const res = await fetch(WHOOP_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: data.refresh_token,
      client_id: process.env.WHOOP_CLIENT_ID ?? '',
      client_secret: process.env.WHOOP_CLIENT_SECRET ?? '',
    }),
  });
  if (!res.ok) { console.error('WHOOP refresh failed:', await res.text()); return null; }
  const json = await res.json() as { access_token: string; refresh_token: string; expires_in: number };
  await supabase.from('whoop_tokens').insert({
    access_token: json.access_token,
    refresh_token: json.refresh_token,
    expires_at: new Date(Date.now() + json.expires_in * 1000).toISOString(),
    updated_at: new Date().toISOString(),
  });
  return json.access_token;
}

async function whoopGet(path: string, token: string) {
  const res = await fetch(`${WHOOP_API_BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    next: { revalidate: 0 },
  });
  const text = await res.text();
  if (!res.ok) { console.warn(`WHOOP ${path} → ${res.status}`); return null; }
  try { return JSON.parse(text); } catch { return null; }
}

export async function GET() {
  try {
    const supabase = createServerClient();
    const today = new Date().toISOString().split('T')[0];
    const threeDaysAgo = new Date(Date.now() - 3 * 86400000).toISOString().split('T')[0];
    const start = `${threeDaysAgo}T00:00:00.000Z`;

    const token = await getToken();
    if (!token) {
      const { data } = await supabase.from('whoop_daily').select('*').eq('date', today).maybeSingle();
      return NextResponse.json({ whoop: data });
    }

    const [recovery, sleep, cycle] = await Promise.all([
      whoopGet(`/recovery?start=${start}&limit=10`, token),
      whoopGet(`/sleep?start=${start}&limit=10`, token),
      whoopGet(`/cycle?start=${start}&limit=10`, token),
    ]);

    // WHOOP returns records in DESCENDING order (newest first).
    // records[0] = most recent, records.at(-1) = oldest.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const allRecords = (arr: any[]) => arr ?? [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const scored = (arr: any[]) => allRecords(arr).filter((r: any) => r.score != null);

    // For recovery: most recent scored record
    const latestRecovery = scored(recovery?.records)[0] ?? null;

    // For cycle/strain: most recent scored cycle
    const latestCycle = scored(cycle?.records)[0] ?? null;

    // For sleep: find most recent COMPLETED sleep with a reasonable duration (not in-progress)
    // Sleep records with end=null are still in progress — skip them.
    // Also skip records where end-start > 16h (those are full-day cycles, not sleep periods).
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const completedSleeps = allRecords(sleep?.records).filter((r: any) => {
      if (!r.end) return false;
      const durationMs = new Date(r.end).getTime() - new Date(r.start).getTime();
      return durationMs > 0 && durationMs < 16 * 3_600_000; // 0–16 hours
    });
    const latestSleep = completedSleeps[0] ?? null; // most recent completed sleep

    console.log('recovery records total:', recovery?.records?.length ?? 'null', '| latestRecovery score:', JSON.stringify(latestRecovery?.score));
    console.log('cycle records total:', cycle?.records?.length ?? 'null', '| latestCycle score:', JSON.stringify(latestCycle?.score));
    console.log('sleep records total:', sleep?.records?.length ?? 'null', '| completedSleeps found:', completedSleeps.length);
    console.log('latestSleep:', latestSleep ? `${latestSleep.start} → ${latestSleep.end}` : 'null');

    // Sleep hours: try stage_summary first (fully processed), else calculate from start/end times
    const sleepMsFromScore: number | null = latestSleep?.score?.stage_summary?.total_in_bed_time_milli ?? null;
    const sleepMsFromTimes: number | null = latestSleep?.start && latestSleep?.end
      ? new Date(latestSleep.end).getTime() - new Date(latestSleep.start).getTime()
      : null;
    const sleepMs = sleepMsFromScore ?? sleepMsFromTimes;

    const whoopData = {
      date: today,
      // Recovery fields — only available when WHOOP calculates daily recovery (usually morning)
      recovery_score: latestRecovery?.score?.recovery_score ?? null,
      hrv: latestRecovery?.score?.hrv_rmssd_milli ?? null,
      // Resting HR: prefer recovery endpoint, fall back to avg HR during sleep
      resting_hr: latestRecovery?.score?.resting_heart_rate ?? latestSleep?.score?.average_heart_rate ?? null,
      // Sleep — WHOOP sleep endpoint may not return sleep_performance; calculate hours from times
      sleep_performance: latestSleep?.score?.sleep_performance_percentage ?? null,
      sleep_hours: sleepMs ? Math.round((sleepMs / 3_600_000) * 10) / 10 : null,
      // Strain from daily cycle
      strain_score: latestCycle?.score?.strain ?? null,
    };

    console.log('Upserting whoopData:', JSON.stringify(whoopData));

    await supabase.from('whoop_daily').upsert(whoopData, { onConflict: 'date' });

    const { data } = await supabase.from('whoop_daily').select('*').eq('date', today).maybeSingle();
    return NextResponse.json({
      whoop: data as WhoopDaily | null,
      _debug: {
        completedSleepsFound: completedSleeps.length,
        sleepUsed: latestSleep ? { start: latestSleep.start, end: latestSleep.end, score: latestSleep.score } : null,
        cycleUsed: latestCycle ? { score: latestCycle.score } : null,
        recoveryUsed: latestRecovery ? { score: latestRecovery.score } : null,
        extracted: whoopData,
      },
    });
  } catch (err) {
    console.error('GET /api/whoop error:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
