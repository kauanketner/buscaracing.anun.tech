import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/auth';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

/** GET /api/pecas/[id]/movimentacoes — histórico */
export async function GET(request: NextRequest, ctx: Ctx) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }
  const { id } = await ctx.params;
  const db = getDb();
  const rows = db
    .prepare(
      'SELECT * FROM pecas_movimentacoes WHERE peca_id=? ORDER BY id DESC',
    )
    .all(Number(id));
  return NextResponse.json(rows);
}

/** POST /api/pecas/[id]/movimentacoes — registra entrada/saida manual */
export async function POST(request: NextRequest, ctx: Ctx) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }
  try {
    const { id } = await ctx.params;
    const db = getDb();
    const body = (await request.json()) as {
      tipo: 'entrada' | 'saida';
      quantidade: number;
      descricao?: string;
    };

    const tipo = body.tipo;
    if (tipo !== 'entrada' && tipo !== 'saida') {
      return NextResponse.json({ error: 'tipo deve ser entrada ou saida' }, { status: 400 });
    }
    const qtd = Math.abs(Math.floor(Number(body.quantidade) || 0));
    if (qtd < 1) return NextResponse.json({ error: 'Quantidade deve ser >= 1' }, { status: 400 });

    const peca = db.prepare('SELECT id, estoque_qtd FROM pecas WHERE id=?').get(Number(id)) as
      | { id: number; estoque_qtd: number | null } | undefined;
    if (!peca) return NextResponse.json({ error: 'Peça não encontrada' }, { status: 404 });

    const atual = Number(peca.estoque_qtd) || 0;
    if (tipo === 'saida' && atual < qtd) {
      return NextResponse.json({
        error: `Estoque insuficiente (atual: ${atual}, saída: ${qtd})`,
      }, { status: 400 });
    }

    const delta = tipo === 'entrada' ? qtd : -qtd;

    const tx = db.transaction(() => {
      db.prepare('UPDATE pecas SET estoque_qtd = COALESCE(estoque_qtd, 0) + ? WHERE id=?').run(delta, Number(id));
      db.prepare(
        `INSERT INTO pecas_movimentacoes (peca_id, tipo, quantidade, descricao, ref_tipo)
         VALUES (?, ?, ?, ?, 'manual')`,
      ).run(Number(id), tipo, qtd, (body.descricao || '').trim());
    });
    tx();

    const novoEstoque = atual + delta;
    return NextResponse.json({ ok: true, estoque_qtd: novoEstoque });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Erro interno';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
