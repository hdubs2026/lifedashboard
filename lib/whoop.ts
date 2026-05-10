import type { WhoopDaily } from './types';

const WHOOP_API_BASE = 'https://api.prod.whoop.com/developer/v1';

interface WhoopRecovery {
  score?: {
    recovery_score?: number;
    hrv_rmssd_milli?: number;
    resting_heart_rate?: number;
  };
  created_at?: string;
}

interface WhoopSleep {
  score?: {
    sleep_performance_percentage?: number;
    stage_summary?: {
      total_in_bed_time_milli?: number;
    };
  };
  created_at?: string;
}

interface WhoopStrain {
  score?: {
    strain?: number;
  };
  created_at?: string;
}

interface WhoopCollectionResponse<T> {
  records: T[];
}

async function whoopFetch<T>(path: string, token: string): Promise<T> {
  const res = await fetch(`${WHOOP_API_BASE}${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    next: { revalidate: 0 },
  });

  if (!res.ok) {
    throw new Error(`WHOOP API error: ${res.status} ${res.statusText}`);
  }

  return res.json() as Promise<T>;
}

export async function fetchWhoopToday(today: string): Promise<Partial<WhoopDaily>> {
  const token = process.env.WHOOP_ACCESS_TOKEN;

  if (!token) {
    console.warn('WHOOP_ACCESS_TOKEN not set — returning empty data');
    return {};
  }

  try {
    const [recoveryData, sleepData, strainData] = await Promise.allSettled([
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

    const recovery =
      recoveryData.status === 'fulfilled' ? recoveryData.value.records[0] : null;
    const sleep =
      sleepData.status === 'fulfilled' ? sleepData.value.records[0] : null;
    const strain =
      strainData.status === 'fulfilled' ? strainData.value.records[0] : null;

    const sleepHours = sleep?.score?.stage_summary?.total_in_bed_time_milli
      ? sleep.score.stage_summary.total_in_bed_time_milli / 3_600_000
      : null;

    return {
      date: today,
      recovery_score: recovery?.score?.recovery_score ?? null,
      hrv: recovery?.score?.hrv_rmssd_milli ?? null,
      resting_hr: recovery?.score?.resting_heart_rate ?? null,
      sleep_performance: sleep?.score?.sleep_performance_percentage ?? null,
      sleep_hours: sleepHours ? Math.round(sleepHours * 10) / 10 : null,
      strain_score: strain?.score?.strain ?? null,
    };
  } catch (err) {
    console.error('WHOOP fetch failed:', err);
    return {};
  }
}
