import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

const WHOOP_API_BASE = 'https://api.prod.whoop.com/developer/v1';
const WHOOP_TOKEN_URL = 'https://api.prod.whoop.com/oauth/oauth2/token';

async function getToken() {
  const supabase = createServerClient();
  const { data } = await supabase
    .from('whoop_tokens')
    .select('access_token, refresh_token, expires_at')
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return data;
}

export async function GET() {
  try {
    const stored = await getToken();
    if (!stored) return NextResponse.json({ error: 'No token stored' });

    const threeDaysAgo = new Date(Date.now() - 3 * 86400000).toISOString().split('T')[0];
    const start = `${threeDaysAgo}T00:00:00.000Z`;

    const headers = {
      Authorization: `Bearer ${stored.access_token}`,
      'Content-Type': 'application/json',
    };

    const tryFetch = async (url: string) => {
      const r = await fetch(url, { headers });
      const text = await r.text();
      try {
        return { status: r.status, data: JSON.parse(text) };
      } catch {
        return { status: r.status, raw: text.slice(0, 200) };
      }
    }

    const cycle = await tryFetch(`${WHOOP_API_BASE}/cycle?start=${start}&limit=5`);
    const cycleIds: number[] = (cycle?.data?.records ?? []).map((r: { id: number }) => r.id);
    const latestCycleId = cycleIds[0] ?? null;

    const [
      recoveryList,
      recoveryByCycle,
      sleepList,
      sleepAlt,
      sleepNoParams,
      profile,
    ] = await Promise.all([
      tryFetch(`${WHOOP_API_BASE}/recovery?limit=5`),
      latestCycleId ? tryFetch(`${WHOOP_API_BASE}/recovery/${latestCycleId}`) : Promise.resolve(null),
      tryFetch(`${WHOOP_API_BASE}/sleep?limit=5`),
      tryFetch(`${WHOOP_API_BASE}/activity/sleep?limit=5`),
      tryFetch(`${WHOOP_API_BASE}/activity/sleep`),
      tryFetch(`${WHOOP_API_BASE}/user/profile/basic`),
    ]);

    return NextResponse.json({
      token_expires_at: stored.expires_at,
      latestCycleId,
      profile,
      recoveryList,
      recoveryByCycle,
      sleepList,
      sleepAlt,
      sleepNoParams,
      cycle,
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) });
  }
}
