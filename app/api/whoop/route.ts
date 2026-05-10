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

    console.log('WHOOP recovery records:', recovery?.records?.length ?? 'null');
    console.log('WHOOP sleep records:', sleep?.records?.length ?? 'null');
    console.log('WHOOP cycle records:', cycle?.records?.length ?? 'null');

    // Filter to only records that have been scored (score !== null)
    // Today's in-progress cycle/sleep will have score: null until WHOOP finishes scoring it
    const scoredRecoveries = (recovery?.records ?? []).filter((r: {score: unknown}) => r.score != null);
    const scoredSleeps = (sleep?.records ?? []).filter((r: {score: unknown}) => r.score != null);
    const scoredCycles = (cycle?.records ?? []).filter((r: {score: unknown}) => r.score != null);

    // Try most recent scored first, fall back to any record
    const latestRecovery = scoredRecoveries.at(-1) ?? recovery?.records?.at(-1) ?? null;
    const latestSleep = scoredSleeps.at(-1) ?? sleep?.records?.at(-1) ?? null;
    const latestCycle = scoredCycles.at(-1) ?? cycle?.records?.at(-1) ?? null;

    console.log('scored recovery records:', scoredRecoveries.length, '/ total:', recovery?.records?.length ?? 0);
    console.log('scored sleep records:', scoredSleeps.length, '/ total:', sleep?.records?.length ?? 0);
    console.log('scored cycle records:', scoredCycles.length, '/ total:', cycle?.records?.length ?? 0);
    console.log('latestCycle score:', JSON.stringify(latestCycle?.score));
    console.log('latestSleep score:', JSON.stringify(latestSleep?.score));
    console.log('latestRecovery score:', JSON.stringify(latestRecovery?.score));

    const sleepMs = latestSleep?.score?.stage_summary?.total_in_bed_time_milli ?? null;

    const whoopData = {
      date: today,
      recovery_score: latestRecovery?.score?.recovery_score ?? null,
      hrv: latestRecovery?.score?.hrv_rmssd_milli ?? null,
      resting_hr: latestRecovery?.score?.resting_heart_rate ?? null,
      sleep_performance: latestSleep?.score?.sleep_performance_percentage ?? null,
      sleep_hours: sleepMs ? Math.round((sleepMs / 3_600_000) * 10) / 10 : null,
      strain_score: latestCycle?.score?.strain ?? null,
    };

    console.log('Upserting whoopData:', JSON.stringify(whoopData));

    await supabase.from('whoop_daily').upsert(whoopData, { onConflict: 'date' });

    const { data } = await supabase.from('whoop_daily').select('*').eq('date', today).maybeSingle();
    return NextResponse.json({
      whoop: data as WhoopDaily | null,
      _debug: {
        scoredCycles: scoredCycles.length,
        scoredSleeps: scoredSleeps.length,
        scoredRecoveries: scoredRecoveries.length,
        extracted: whoopData,
      },
    });
  } catch (err) {
    console.error('GET /api/whoop error:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
