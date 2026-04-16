import { NextResponse } from 'next/server';
import { TECNICO_COOKIE } from '@/lib/tecnico-auth';

export const dynamic = 'force-dynamic';

export async function POST() {
  const res = NextResponse.json({ success: true });
  res.cookies.delete(TECNICO_COOKIE);
  return res;
}
