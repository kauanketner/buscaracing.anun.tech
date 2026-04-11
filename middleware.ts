import { NextRequest, NextResponse } from 'next/server';

const SESSION_COOKIE = 'admin_session';

function isAuthenticated(request: NextRequest): boolean {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  return !!token && token.length > 0;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow login endpoint through
  if (pathname === '/api/auth' && request.method === 'POST') {
    return NextResponse.next();
  }

  // Protect /admin/* and /api/admin/* routes
  const isProtected =
    pathname.startsWith('/admin') || pathname.startsWith('/api/admin');

  if (!isProtected) {
    return NextResponse.next();
  }

  if (isAuthenticated(request)) {
    return NextResponse.next();
  }

  // API routes get a 401 JSON response
  if (pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  // Admin pages — let through so client-side handles the login UI
  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*', '/api/auth'],
};
