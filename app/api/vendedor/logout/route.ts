import { NextResponse } from 'next/server';
import { VENDEDOR_COOKIE } from '@/lib/vendedor-auth';

export const dynamic = 'force-dynamic';

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(VENDEDOR_COOKIE, '', { httpOnly: true, path: '/', maxAge: 0 });
  return res;
}
