import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/auth';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

/** GET /api/oficina/[id]/pecas — lista peças de uma OS */
export async function GET(request: NextRequest, ctx: Ctx) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }
  const { id } = await ctx.params;
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT op.*, p.imagem AS peca_imagem
       FROM os_pecas op
       LEFT JOIN pecas p ON p.id = op.peca_id
       WHERE op.ordem_id = ?
       ORDER BY op.id ASC`,
    )
    .all(Number(id));
  return NextResponse.json(rows);
}

/** POST /api/oficina/[id]/pecas — anexa peça do catálogo à OS */
export async function POST(request: NextRequest, ctx: Ctx) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }
  try {
    const { id } = await ctx.params;
    const db = getDb();
    const body = (await request.json()) as {
      peca_id?: number;
      nome?: string;
      codigo?: string;
      quantidade?: number;
      preco_unitario?: number;
    };

    const ordem = db.prepare('SELECT id FROM oficina_ordens WHERE id=?').get(Number(id));
    if (!ordem) return NextResponse.json({ error: 'OS não encontrada' }, { status: 404 });

    const quantidade = Math.max(1, Math.floor(Number(body.quantidade) || 1));
    let preco = Number(body.preco_unitario);
    let nome = (body.nome || '').trim();
    let codigo = (body.codigo || '').trim();
    let pecaId: number | null = null;

    // Se recebeu peca_id, busca do catálogo pra completar snapshot
    if (body.peca_id) {
      const p = db
        .prepare('SELECT id, nome, codigo, preco, estoque_qtd FROM pecas WHERE id=?')
        .get(Number(body.peca_id)) as { id: number; nome: string; codigo: string; preco: number | null; estoque_qtd: number | null } | undefined;
      if (!p) return NextResponse.json({ error: 'Peça não encontrada' }, { status: 404 });
      const estoque = Number(p.estoque_qtd) || 0;
      if (estoque < quantidade) {
        return NextResponse.json({
          error: `Estoque insuficiente (disponível: ${estoque}, solicitado: ${quantidade})`,
        }, { status: 400 });
      }
      pecaId = p.id;
      if (!nome) nome = p.nome;
      if (!codigo) codigo = p.codigo || '';
      if (Number.isNaN(preco)) preco = p.preco || 0;
    }

    if (!nome) return NextResponse.json({ error: 'Nome da peça obrigatório' }, { status: 400 });
    if (Number.isNaN(preco) || preco < 0) preco = 0;

    const tx = db.transaction(() => {
      const result = db
        .prepare(
          `INSERT INTO os_pecas (ordem_id, peca_id, nome_snapshot, codigo_snapshot, quantidade, preco_unitario)
           VALUES (?, ?, ?, ?, ?, ?)`,
        )
        .run(Number(id), pecaId, nome, codigo, quantidade, preco);
      const osPecaId = Number(result.lastInsertRowid);

      // Deduz estoque se vier do catálogo
      if (pecaId) {
        db.prepare('UPDATE pecas SET estoque_qtd = COALESCE(estoque_qtd, 0) - ? WHERE id=?')
          .run(quantidade, pecaId);
        db.prepare(
          `INSERT INTO pecas_movimentacoes (peca_id, tipo, quantidade, descricao, ref_tipo, ref_id)
           VALUES (?, 'saida', ?, ?, 'os', ?)`,
        ).run(pecaId, quantidade, `Aplicada na OS #${id}`, Number(id));
      }

      return osPecaId;
    });
    const newId = tx();
    return NextResponse.json({ ok: true, id: newId });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Erro interno';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
