import { NextRequest, NextResponse } from 'next/server';

const ADMIN_COOKIE = 'admin_session';
const MECANICO_COOKIE = 'mecanico_session';
const VENDEDOR_COOKIE = 'vendedor_session';

function hasAdminCookie(request: NextRequest): boolean {
  const token = request.cookies.get(ADMIN_COOKIE)?.value;
  return !!token && token.length > 0;
}

function hasMecanicoCookie(request: NextRequest): boolean {
  const token = request.cookies.get(MECANICO_COOKIE)?.value;
  return !!token && token.length > 0;
}

function hasVendedorCookie(request: NextRequest): boolean {
  const token = request.cookies.get(VENDEDOR_COOKIE)?.value;
  return !!token && token.length > 0;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // --- Public auth endpoints (always passthrough) ---
  if (pathname === '/api/auth' && request.method === 'POST') {
    return NextResponse.next();
  }
  if (pathname === '/api/mecanico/login' || pathname === '/api/mecanico/logout') {
    return NextResponse.next();
  }
  if (pathname === '/api/vendedor/login' || pathname === '/api/vendedor/logout') {
    return NextResponse.next();
  }

  // --- Mechanic API: requires mecanico_session ---
  if (pathname.startsWith('/api/mecanico/')) {
    // PWA manifest é público (path do slug atual é "semi-público" — a URL
    // em si já está na mão do mecânico; o manifest não expõe dados).
    if (pathname === '/api/mecanico/manifest.webmanifest') {
      return NextResponse.next();
    }
    if (!hasMecanicoCookie(request)) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }
    return NextResponse.next();
  }

  // --- Vendedor API: requires vendedor_session ---
  if (pathname.startsWith('/api/vendedor/')) {
    if (!hasVendedorCookie(request)) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }
    return NextResponse.next();
  }

  // --- Mechanic UI: /m/* passa direto, a page valida slug e sessão ---
  if (pathname.startsWith('/m/')) {
    return NextResponse.next();
  }

  // --- Vendedor UI: /v/* passa direto ---
  if (pathname.startsWith('/v/')) {
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
    '/m/:path*',
    '/v/:path*',
    '/api/mecanico/:path*',
    '/api/vendedor/:path*',
  ],
};
