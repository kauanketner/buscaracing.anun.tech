import { NextResponse } from 'next/server';
import { MECANICO_COOKIE } from '@/lib/mecanico-auth';

export const dynamic = 'force-dynamic';

export async function POST() {
  const res = NextResponse.json({ success: true });
  res.cookies.delete(MECANICO_COOKIE);
  return res;
}
