import { NextResponse } from 'next/server';

export async function GET() {
  const clientId = process.env.WHOOP_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json({ error: 'WHOOP_CLIENT_ID not configured' }, { status: 500 });
  }

  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://lifedashboard-rose.vercel.app'}/api/whoop/callback`;

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: 'offline read:recovery read:sleep read:workout read:body_measurement read:profile',
  });

  return NextResponse.redirect(
    `https://api.prod.whoop.com/oauth/oauth2/auth?${params.toString()}`
  );
}
