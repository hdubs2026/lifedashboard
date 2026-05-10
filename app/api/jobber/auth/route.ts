import { NextResponse } from 'next/server';

export async function GET() {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: process.env.JOBBER_CLIENT_ID!,
    redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/jobber/callback`,
  });

  return NextResponse.redirect(
    `https://api.getjobber.com/api/oauth/authorize?${params}`
  );
}
