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

  // Resolve chassi da moto associada via ref_tipo/ref_id
  // (chassi do veículo é tratado como "CPF" — identifica a moto unicamente em todo o sistema)
  // Resolve também a quantidade de comprovantes anexados (venda ou reserva).
  let sql = `
    SELECT l.*,
      CASE l.ref_tipo
        WHEN 'moto' THEN (SELECT chassi FROM motos WHERE id = l.ref_id)
        WHEN 'venda' THEN (
          SELECT m.chassi FROM vendas v LEFT JOIN motos m ON m.id = v.moto_id WHERE v.id = l.ref_id
        )
        WHEN 'aluguel' THEN (
          SELECT m.chassi FROM alugueis a LEFT JOIN motos m ON m.id = a.moto_id WHERE a.id = l.ref_id
        )
        WHEN 'reserva' THEN (
          SELECT m.chassi FROM reservas r LEFT JOIN motos m ON m.id = r.moto_id WHERE r.id = l.ref_id
        )
        WHEN 'consignacao' THEN (
          SELECT m.chassi FROM consignacoes c LEFT JOIN motos m ON m.id = c.moto_id WHERE c.id = l.ref_id
        )
      END AS moto_chassi,
      CASE l.ref_tipo
        WHEN 'venda' THEN (
          SELECT COUNT(*) FROM venda_comprovantes vc WHERE vc.venda_id = l.ref_id
        )
        WHEN 'reserva' THEN (
          SELECT COUNT(*) FROM reserva_comprovantes rc WHERE rc.reserva_id = l.ref_id
        )
        ELSE 0
      END AS comprovantes_count
    FROM lancamentos l
  `;
  const params: string[] = [];
  if (from && to) {
    sql += ' WHERE l.data BETWEEN ? AND ?';
    params.push(from, to);
  } else if (from) {
    sql += ' WHERE l.data >= ?';
    params.push(from);
  }
  sql += ' ORDER BY l.data DESC, l.id DESC';

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
