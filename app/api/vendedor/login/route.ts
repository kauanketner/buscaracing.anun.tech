import { NextRequest, NextResponse } from 'next/server';
import { VENDEDOR_COOKIE, VENDEDOR_SESSION_TTL_MS, attemptLogin, getClientIp } from '@/lib/vendedor-auth';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { pin?: unknown };
    const pin = typeof body.pin === 'string' ? body.pin.trim() : '';
    if (!/^\d{4,8}$/.test(pin)) {
      return NextResponse.json({ error: 'PIN inválido' }, { status: 400 });
    }
    const ip = getClientIp(request);
    const result = attemptLogin(pin, ip);
    if (!result.ok) {
      if (result.reason === 'rate_limited') {
        return NextResponse.json({ error: 'Muitas tentativas. Aguarde 15 minutos.' }, { status: 429 });
      }
      return NextResponse.json({ error: 'PIN incorreto' }, { status: 401 });
    }
    const res = NextResponse.json({
      ok: true,
      vendedor: { id: result.vendedor.id, nome: result.vendedor.nome, tipo: result.vendedor.tipo },
    });
    res.cookies.set(VENDEDOR_COOKIE, result.token, {
      httpOnly: true,
      path: '/',
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: Math.floor(VENDEDOR_SESSION_TTL_MS / 1000),
    });
    return res;
  } catch {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
