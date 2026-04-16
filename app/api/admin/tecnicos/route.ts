import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { isAuthenticated } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT id, nome, telefone, email, especialidade, ativo,
              pin_ativo, pin_trocado_em,
              CASE WHEN pin_hash='' OR pin_hash IS NULL THEN 0 ELSE 1 END AS has_pin
       FROM mecanicos
       ORDER BY nome ASC`,
    )
    .all();
  return NextResponse.json(rows);
}
