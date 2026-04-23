import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/auth';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT a.*,
              m.nome AS moto_nome, m.marca AS moto_marca, m.imagem AS moto_imagem
       FROM alugueis a
       LEFT JOIN motos m ON m.id = a.moto_id
       ORDER BY CASE a.status
         WHEN 'pendente' THEN 0
         WHEN 'aprovada' THEN 1
         WHEN 'ativa' THEN 2
         ELSE 3
       END,
       a.created_at DESC`,
    )
    .all();
  return NextResponse.json(rows);
}
