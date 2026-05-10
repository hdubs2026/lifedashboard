import type { WhoopDaily } from './types';
import { createServerClient } from './supabase';

const WHOOP_API_BASE = 'https://api.prod.whoop.com/developer/v1';
const WHOOP_TOKEN_URL = 'https://api.prod.whoop.com/oauth/oauth2/token';

interface WhoopRecovery {
  score?: {
    recovery_score?: number;
    hrv_rmssd_milli?: number;
    resting_heart_rate?: number;
  };
}

interface WhoopSleep {
  score?: {
    sleep_performance_percentage?: number;
    stage_summary?: { total_in_bed_time_milli?: number };
  };
}

interface WhoopStrain {
  score?: { strain?: number };
}

interface WhoopCollectionResponse<T> {
  records: T[];
}

interface StoredTokens {
  access_token: string;
  refresh_token: string;
  expires_at: string;
}

async function getStoredTokens(): Promise<StoredTokens | null> {
  const supabase = createServerClient();
  const { data } = await supabase
    .from('whoop_tokens')
    .select('access_token, refresh_token, expires_at')
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return data as StoredTokens | null;
}

async function refreshAccessToken(refreshToken: string): Promise<StoredTokens | null> {
  const res = await fetch(WHOOP_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: process.env.WHOOP_CLIENT_ID ?? '',
      client_secret: process.env.WHOOP_CLIENT_SECRET ?? '',
    }),
  });

  if (!res.ok) {
    console.error('WHOOP token refresh failed:', await res.text());
    return null;
  }

  const json = await res.json() as { access_token: string; refresh_token: string; expires_in: number };
  const expiresAt = new Date(Date.now() + json.expires_in * 1000).toISOString();

  const supabase = createServerClient();
  const { data } = await supabase
    .from('whoop_tokens')
    .upsert({
      access_token: json.access_token,
      refresh_token: json.refresh_token,
      expires_at: expiresAt,
      updated_at: new Date().toISOString(),
    })
    .select('access_token, refresh_token, expires_at')
    .single();

  return data as StoredTokens | null;
}

async function getValidToken(): Promise<string | null> {
  const stored = await getStoredTokens();
  if (!stored) return null;

  const expiresAt = new Date(stored.expires_at).getTime();
  const fiveMinutes = 5 * 60 * 1000;

  if (Date.now() < expiresAt - fiveMinutes) {
    return stored.access_token;
  }

  const refreshed = await refreshAccessToken(stored.refresh_token);
  return refreshed?.access_token ?? null;
}

async function whoopFetch<T>(path: string, token: string): Promise<T> {
  const res = await fetch(`${WHOOP_API_BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    next: { revalidate: 0 },
  });

  if (!res.ok) throw new Error(`WHOOP API ${res.status}: ${res.statusText}`);
  return res.json() as Promise<T>;
}

export async function fetchWhoopToday(today: string): Promise<Partial<WhoopDaily>> {
  const token = await getValidToken();

  if (!token) {
    console.warn('No valid WHOOP token — skipping sync');
    return {};
  }

  try {
    const [recoveryResult, sleepResult, strainResult] = await Promise.allSettled([
      whoopFetch<WhoopCollectionResponse<WhoopRecovery>>(
        `/recovery?start=${today}T00:00:00.000Z&end=${today}T23:59:59.000Z&limit=1`,
        token
      ),
      whoopFetch<WhoopCollectionResponse<WhoopSleep>>(
        `/sleep?start=${today}T00:00:00.000Z&end=${today}T23:59:59.000Z&limit=1`,
        token
      ),
      whoopFetch<WhoopCollectionResponse<WhoopStrain>>(
        `/cycle?start=${today}T00:00:00.000Z&end=${today}T23:59:59.000Z&limit=1`,
        token
      ),
    ]);

    const recovery = recoveryResult.status === 'fulfilled' ? recoveryResult.value.records[0] : null;
    const sleep = sleepResult.status === 'fulfilled' ? sleepResult.value.records[0] : null;
    const strain = strainResult.status === 'fulfilled' ? strainResult.value.records[0] : null;

    const sleepHours = sleep?.score?.stage_summary?.total_in_bed_time_milli
      ? Math.round((sleep.score.stage_summary.total_in_bed_time_milli / 3_600_000) * 10) / 10
      : null;

    return {
      date: today,
      recovery_score: recovery?.score?.recovery_score ?? null,
      hrv: recovery?.score?.hrv_rmssd_milli ?? null,
      resting_hr: recovery?.score?.resting_heart_rate ?? null,
      sleep_performance: sleep?.score?.sleep_performance_percentage ?? null,
      sleep_hours: sleepHours,
      strain_score: strain?.score?.strain ?? null,
    };
  } catch (err) {
    console.error('WHOOP fetch failed:', err);
    return {};
  }
}

export async function isWhoopConnected(): Promise<boolean> {
  const stored = await getStoredTokens();
  return stored !== null;
}
