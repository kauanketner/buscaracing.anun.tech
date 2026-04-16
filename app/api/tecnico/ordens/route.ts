import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getTecnicoFromRequest } from '@/lib/tecnico-auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const tec = getTecnicoFromRequest(request);
  if (!tec) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT o.id, o.cliente_nome, o.moto_marca, o.moto_modelo, o.moto_placa,
              o.servico_descricao, o.status, o.data_entrada, o.data_prevista,
              m.nome AS moto_nome
       FROM oficina_ordens o
       LEFT JOIN motos m ON m.id = o.moto_id
       WHERE o.tecnico_id = ?
         AND o.status NOT IN ('finalizada','cancelada')
       ORDER BY o.data_entrada DESC, o.id DESC`,
    )
    .all(tec.id);
  return NextResponse.json(rows);
}
