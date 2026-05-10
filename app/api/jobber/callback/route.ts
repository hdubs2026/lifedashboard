import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code');
  if (!code) {
    return NextResponse.json({ error: 'Missing code' }, { status: 400 });
  }

  const res = await fetch('https://api.getjobber.com/api/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: process.env.JOBBER_CLIENT_ID!,
      client_secret: process.env.JOBBER_CLIENT_SECRET!,
      redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/jobber/callback`,
      code,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error('Jobber token exchange failed:', err);
    return NextResponse.json({ error: 'Token exchange failed' }, { status: 500 });
  }

  const tokens = await res.json();
  console.log('Jobber token response keys:', Object.keys(tokens));

  // expires_in is seconds; fall back to 1 hour if missing
  const expiresInMs = (typeof tokens.expires_in === 'number' ? tokens.expires_in : 3600) * 1000;
  const expiresAt = new Date(Date.now() + expiresInMs).toISOString();

  if (!tokens.access_token) {
    console.error('No access_token in Jobber response:', tokens);
    return NextResponse.json({ error: 'No access_token returned', details: tokens }, { status: 500 });
  }

  const supabase = createServerClient();

  // Delete old tokens and insert fresh
  await supabase.from('jobber_tokens').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  const { error: insertError } = await supabase.from('jobber_tokens').insert({
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token ?? '',
    expires_at: expiresAt,
  });

  if (insertError) {
    console.error('Failed to store Jobber tokens:', insertError);
    return NextResponse.json({ error: 'Failed to store tokens', details: insertError }, { status: 500 });
  }

  return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/?jobber=connected`);
}
