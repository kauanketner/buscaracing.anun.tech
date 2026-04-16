import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ token: string }> };

/** GET /api/vendas/public/[token] — public buyer portal data (no auth) */
export async function GET(_request: NextRequest, context: RouteContext) {
  const { token } = await context.params;
  if (!token || token.length < 16) {
    return NextResponse.json({ error: 'Token inválido' }, { status: 400 });
  }
  const db = getDb();
  const row = db
    .prepare(
      `SELECT v.id, v.comprador_nome, v.comprador_tel, v.valor_venda, v.valor_sinal,
              v.forma_pagamento, v.data_venda, v.observacoes,
              m.nome AS moto_nome, m.marca AS moto_marca, m.modelo AS moto_modelo,
              m.ano, m.imagem AS moto_imagem, m.placa AS moto_placa,
              m.estado AS moto_estado
       FROM vendas v
       LEFT JOIN motos m ON v.moto_id = m.id
       WHERE v.token = ?`,
    )
    .get(token);
  if (!row) {
    return NextResponse.json({ error: 'Venda não encontrada' }, { status: 404 });
  }

  // Get linked oficina orders (for warranty / service history)
  const ordens = db
    .prepare(
      `SELECT id, servico_descricao, status, data_entrada, data_conclusao, valor_final
       FROM oficina_ordens
       WHERE moto_id = (SELECT moto_id FROM vendas WHERE token = ?)
       ORDER BY id DESC`,
    )
    .all(token);

  return NextResponse.json({ ...(row as Record<string, unknown>), ordens });
}
