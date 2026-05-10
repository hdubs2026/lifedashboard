import { NextResponse, type NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Always pass through API routes and auth callback
  if (pathname.startsWith('/api/') || pathname.startsWith('/auth/')) {
    return NextResponse.next();
  }

  // Derive the Supabase auth cookie name from the project URL
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  const projectRef = supabaseUrl.replace('https://', '').split('.')[0];

  // Check for any Supabase session cookie
  const cookies = request.cookies.getAll();
  const hasSession =
    cookies.some(
      (c) =>
        c.name === `sb-${projectRef}-auth-token` ||
        (c.name.startsWith('sb-') && c.name.endsWith('-auth-token'))
    );

  if (pathname.startsWith('/login')) {
    if (hasSession) {
      return NextResponse.redirect(new URL('/', request.url));
    }
    return NextResponse.next();
  }

  if (!hasSession) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
