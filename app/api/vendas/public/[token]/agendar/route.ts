import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ token: string }> };

/** POST /api/vendas/public/[token]/agendar — buyer requests service appointment */
export async function POST(request: NextRequest, context: RouteContext) {
  const { token } = await context.params;
  if (!token || token.length < 16) {
    return NextResponse.json({ error: 'Token inválido' }, { status: 400 });
  }
  const db = getDb();
  const venda = db
    .prepare(
      `SELECT v.id, v.moto_id, v.comprador_nome, v.comprador_tel,
              m.marca, m.modelo, m.nome AS moto_nome, m.ano, m.placa
       FROM vendas v
       LEFT JOIN motos m ON v.moto_id = m.id
       WHERE v.token = ?`,
    )
    .get(token) as Record<string, unknown> | undefined;
  if (!venda) {
    return NextResponse.json({ error: 'Venda não encontrada' }, { status: 404 });
  }

  const body = (await request.json().catch(() => ({}))) as { descricao?: string };
  const descricao = (body.descricao || 'Revisão agendada pelo comprador').trim();

  const result = db
    .prepare(
      `INSERT INTO oficina_ordens
        (cliente_nome, cliente_telefone, moto_id, moto_marca, moto_modelo, moto_ano, moto_placa, servico_descricao, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'aberta')`,
    )
    .run(
      venda.comprador_nome || '',
      venda.comprador_tel || '',
      venda.moto_id,
      venda.marca || '',
      (venda.modelo as string) || (venda.moto_nome as string) || '',
      venda.ano ?? null,
      (venda.placa as string) || '',
      descricao,
    );

  return NextResponse.json({ ok: true, ordem_id: Number(result.lastInsertRowid) });
}
