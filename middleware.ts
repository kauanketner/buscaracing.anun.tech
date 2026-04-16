import { NextRequest, NextResponse } from 'next/server';

const ADMIN_COOKIE = 'admin_session';
const TECNICO_COOKIE = 'tecnico_session';

function hasAdminCookie(request: NextRequest): boolean {
  const token = request.cookies.get(ADMIN_COOKIE)?.value;
  return !!token && token.length > 0;
}

function hasTecnicoCookie(request: NextRequest): boolean {
  const token = request.cookies.get(TECNICO_COOKIE)?.value;
  return !!token && token.length > 0;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // --- Public auth endpoints (always passthrough) ---
  if (pathname === '/api/auth' && request.method === 'POST') {
    return NextResponse.next();
  }
  if (pathname === '/api/tecnico/login' || pathname === '/api/tecnico/logout') {
    return NextResponse.next();
  }

  // --- Technician API: requires tecnico_session ---
  if (pathname.startsWith('/api/tecnico/')) {
    // PWA manifest é público (path do slug atual é "semi-público" — a URL
    // em si já está na mão do técnico; o manifest não expõe dados).
    if (pathname === '/api/tecnico/manifest.webmanifest') {
      return NextResponse.next();
    }
    if (!hasTecnicoCookie(request)) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }
    return NextResponse.next();
  }

  // --- Technician UI: /t/* passa direto, a page valida slug e sessão ---
  if (pathname.startsWith('/t/')) {
    return NextResponse.next();
  }

  // --- Admin (/admin/* e /api/admin/*): requires admin_session ---
  const isAdminProtected =
    pathname.startsWith('/admin') || pathname.startsWith('/api/admin');
  if (!isAdminProtected) {
    return NextResponse.next();
  }
  if (hasAdminCookie(request)) {
    return NextResponse.next();
  }
  if (pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }
  // UI pages: deixa passar, login client-side cuida.
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/api/admin/:path*',
    '/api/auth',
    '/t/:path*',
    '/api/tecnico/:path*',
  ],
};
