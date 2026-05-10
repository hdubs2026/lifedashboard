import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://lifedashboard-rose.vercel.app';

  if (error || !code) {
    return NextResponse.redirect(`${appUrl}/?whoop=error`);
  }

  const redirectUri = `${appUrl}/api/whoop/callback`;

  const tokenRes = await fetch('https://api.prod.whoop.com/oauth/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      client_id: process.env.WHOOP_CLIENT_ID ?? '',
      client_secret: process.env.WHOOP_CLIENT_SECRET ?? '',
    }),
  });

  if (!tokenRes.ok) {
    console.error('WHOOP token exchange failed:', await tokenRes.text());
    return NextResponse.redirect(`${appUrl}/?whoop=error`);
  }

  const json = await tokenRes.json() as {
    access_token: string;
    refresh_token: string;
    expires_in: number;
  };

  const expiresAt = new Date(Date.now() + json.expires_in * 1000).toISOString();

  const supabase = createServerClient();
  const { error: dbError } = await supabase.from('whoop_tokens').insert({
    access_token: json.access_token,
    refresh_token: json.refresh_token,
    expires_at: expiresAt,
  });

  if (dbError) {
    console.error('Failed to store WHOOP tokens:', dbError);
    return NextResponse.redirect(`${appUrl}/?whoop=error`);
  }

  return NextResponse.redirect(`${appUrl}/?whoop=connected`);
}
