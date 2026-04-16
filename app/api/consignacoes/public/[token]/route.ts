import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ token: string }> };

/** GET /api/consignacoes/public/[token] — public consignante data (no auth) */
export async function GET(_request: NextRequest, context: RouteContext) {
  const { token } = await context.params;
  if (!token || token.length < 16) {
    return NextResponse.json({ error: 'Token inválido' }, { status: 400 });
  }
  const db = getDb();
  const row = db
    .prepare(
      `SELECT c.id, c.dono_nome, c.margem_pct, c.custo_revisao, c.valor_repasse,
              c.repasse_pago, c.status, c.data_entrada,
              m.nome AS moto_nome, m.marca AS moto_marca, m.imagem AS moto_imagem,
              m.estado AS moto_estado, m.preco AS moto_preco,
              (SELECT COUNT(*) FROM leads WHERE moto_id = m.id) AS total_leads
       FROM consignacoes c
       LEFT JOIN motos m ON c.moto_id = m.id
       WHERE c.token = ?`,
    )
    .get(token);
  if (!row) {
    return NextResponse.json({ error: 'Consignação não encontrada' }, { status: 404 });
  }
  return NextResponse.json(row);
}
