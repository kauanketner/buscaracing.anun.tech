import { NextRequest, NextResponse } from 'next/server';
import { getVendedorFromRequest } from '@/lib/vendedor-auth';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const vend = getVendedorFromRequest(request);
  if (!vend) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const db = getDb();
  // Get commission stats
  const stats = db
    .prepare(
      `SELECT COUNT(*) AS total_vendas,
              COALESCE(SUM(c.valor),0) AS comissao_total,
              COALESCE(SUM(CASE WHEN c.pago=0 THEN c.valor ELSE 0 END),0) AS comissao_pendente
       FROM comissoes c WHERE c.vendedor_id=?`,
    )
    .get(vend.id) as { total_vendas: number; comissao_total: number; comissao_pendente: number };

  return NextResponse.json({
    id: vend.id,
    nome: vend.nome,
    tipo: vend.tipo,
    total_vendas: stats.total_vendas,
    comissao_total: stats.comissao_total,
    comissao_pendente: stats.comissao_pendente,
  });
}
