import { NextRequest, NextResponse } from 'next/server';
import { getMecanicoFromRequest } from '@/lib/mecanico-auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const tec = getMecanicoFromRequest(request);
  if (!tec) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }
  return NextResponse.json({ id: tec.id, nome: tec.nome });
}
