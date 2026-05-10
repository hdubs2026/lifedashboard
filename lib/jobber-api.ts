import { createServerClient } from './supabase';

const JOBBER_API_URL = 'https://api.getjobber.com/api/graphql';
const JOBBER_TOKEN_URL = 'https://api.getjobber.com/api/oauth/token';

export async function getJobberToken(): Promise<string | null> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from('jobber_tokens')
    .select('access_token, refresh_token, expires_at')
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) { console.error('jobber_tokens fetch error:', error); return null; }
  if (!data) { console.warn('No Jobber tokens found — complete OAuth at /api/jobber/auth'); return null; }

  const expiresAt = new Date(data.expires_at).getTime();
  if (Date.now() < expiresAt - 5 * 60 * 1000) {
    return data.access_token;
  }

  // Refresh
  const res = await fetch(JOBBER_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: process.env.JOBBER_CLIENT_ID!,
      client_secret: process.env.JOBBER_CLIENT_SECRET!,
      refresh_token: data.refresh_token,
    }),
  });

  if (!res.ok) {
    console.error('Jobber token refresh failed:', await res.text());
    return null;
  }

  const tokens = await res.json();
  const newExpiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

  await supabase
    .from('jobber_tokens')
    .update({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token ?? data.refresh_token,
      expires_at: newExpiresAt,
      updated_at: new Date().toISOString(),
    })
    .order('updated_at', { ascending: false })
    .limit(1);

  return tokens.access_token;
}

export async function jobberQuery<T = unknown>(query: string, variables?: Record<string, unknown>): Promise<T> {
  const token = await getJobberToken();
  if (!token) throw new Error('No valid Jobber token');

  const res = await fetch(JOBBER_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'X-JOBBER-GRAPHQL-VERSION': '2024-11-13',
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!res.ok) throw new Error(`Jobber API error: ${res.status}`);
  const json = await res.json();
  if (json.errors?.length) throw new Error(json.errors[0].message);
  return json.data as T;
}
