import { NextRequest, NextResponse } from 'next/server';
import { verifyPassword, createSession, isAuthenticated, SESSION_COOKIE } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    if (action === 'login') {
      const { password } = body;
      if (!verifyPassword(password)) {
        return NextResponse.json({ error: 'Senha incorreta' }, { status: 401 });
      }
      const token = createSession();
      const res = NextResponse.json({ success: true });
      res.cookies.set(SESSION_COOKIE, token, {
        httpOnly: true,
        path: '/',
        maxAge: 86400, // 24h
        sameSite: 'lax',
      });
      return res;
    }

    if (action === 'logout') {
      const res = NextResponse.json({ success: true });
      res.cookies.delete(SESSION_COOKIE);
      return res;
    }

    return NextResponse.json({ error: 'Ação inválida' }, { status: 400 });
  } catch {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({ isAdmin: isAuthenticated(request) });
}
