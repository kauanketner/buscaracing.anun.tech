import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/auth';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

/** GET /api/pdv/[id] — detalhe da venda PDV com itens e vendedor */
export async function GET(request: NextRequest, ctx: Ctx) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }
  const { id } = await ctx.params;
  const db = getDb();
  const venda = db
    .prepare(
      `SELECT v.*, ve.nome AS vendedor_nome
       FROM pdv_vendas v
       LEFT JOIN vendedores ve ON v.vendedor_id = ve.id
       WHERE v.id = ?`,
    )
    .get(Number(id)) as Record<string, unknown> | undefined;
  if (!venda) {
    return NextResponse.json({ error: 'Venda não encontrada' }, { status: 404 });
  }
  const itens = db
    .prepare('SELECT * FROM pdv_itens WHERE pdv_venda_id = ? ORDER BY id ASC')
    .all(Number(id));
  return NextResponse.json({ ...venda, itens });
}
