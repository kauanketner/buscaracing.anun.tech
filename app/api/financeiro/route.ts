import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/auth';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }
  const url = new URL(request.url);
  const from = url.searchParams.get('from') || '';
  const to = url.searchParams.get('to') || '';

  const db = getDb();

  let sql = 'SELECT * FROM lancamentos';
  const params: string[] = [];
  if (from && to) {
    sql += ' WHERE data BETWEEN ? AND ?';
    params.push(from, to);
  } else if (from) {
    sql += ' WHERE data >= ?';
    params.push(from);
  }
  sql += ' ORDER BY data DESC, id DESC';

  const lancamentos = db.prepare(sql).all(...params);

  // Totals
  const entradas = (lancamentos as { tipo: string; valor: number }[])
    .filter((l) => l.tipo === 'entrada')
    .reduce((s, l) => s + l.valor, 0);
  const saidas = (lancamentos as { tipo: string; valor: number }[])
    .filter((l) => l.tipo === 'saida')
    .reduce((s, l) => s + l.valor, 0);

  // Comissoes pendentes
  const comissoes = db
    .prepare(
      `SELECT c.*, v.comprador_nome, v.valor_venda, ve.nome AS vendedor_nome
       FROM comissoes c
       LEFT JOIN vendas v ON c.venda_id = v.id
       LEFT JOIN vendedores ve ON c.vendedor_id = ve.id
       ORDER BY c.pago ASC, c.id DESC`,
    )
    .all();

  // Repasses pendentes
  const repasses = db
    .prepare(
      `SELECT c.id, c.dono_nome, c.valor_repasse, c.custo_revisao, c.repasse_pago, c.status,
              m.nome AS moto_nome
       FROM consignacoes c
       LEFT JOIN motos m ON c.moto_id = m.id
       WHERE c.status IN ('vendida','entregue') AND c.valor_repasse > 0
       ORDER BY c.repasse_pago ASC, c.id DESC`,
    )
    .all();

  return NextResponse.json({
    lancamentos,
    entradas,
    saidas,
    saldo: entradas - saidas,
    comissoes,
    repasses,
  });
}
