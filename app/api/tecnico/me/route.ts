import { NextRequest, NextResponse } from 'next/server';
import { getTecnicoFromRequest } from '@/lib/tecnico-auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const tec = getTecnicoFromRequest(request);
  if (!tec) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }
  return NextResponse.json({ id: tec.id, nome: tec.nome });
}
