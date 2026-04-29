import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/auth';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

/**
 * PATCH /api/pdv/[id]/cancelar
 *
 * Soft-delete: marca venda como 'cancelada', devolve estoque de cada item,
 * cria movimentações 'entrada' com ref_tipo='pdv-cancel', e apaga o
 * lançamento financeiro original (mantém auditável via cancelada_em).
 *
 * Body: { motivo?: string }
 */
export async function PATCH(request: NextRequest, ctx: Ctx) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }
  try {
    const { id } = await ctx.params;
    const vendaId = Number(id);
    const db = getDb();

    const venda = db
      .prepare('SELECT id, status, cliente_nome FROM pdv_vendas WHERE id = ?')
      .get(vendaId) as { id: number; status: string; cliente_nome: string } | undefined;
    if (!venda) {
      return NextResponse.json({ error: 'Venda não encontrada' }, { status: 404 });
    }
    if (venda.status === 'cancelada') {
      return NextResponse.json({ error: 'Venda já cancelada' }, { status: 400 });
    }

    const body = await request.json().catch(() => ({})) as { motivo?: string };
    const motivo = (body.motivo || '').trim();

    const itens = db
      .prepare('SELECT peca_id, nome_snapshot, quantidade FROM pdv_itens WHERE pdv_venda_id = ?')
      .all(vendaId) as { peca_id: number | null; nome_snapshot: string; quantidade: number }[];

    const tx = db.transaction(() => {
      // Devolve estoque + movimentações
      const updateEstoque = db.prepare(
        'UPDATE pecas SET estoque_qtd = COALESCE(estoque_qtd, 0) + ? WHERE id = ?',
      );
      const insertMov = db.prepare(
        `INSERT INTO pecas_movimentacoes (peca_id, tipo, quantidade, descricao, ref_tipo, ref_id)
         VALUES (?, 'entrada', ?, ?, 'pdv-cancel', ?)`,
      );
      for (const it of itens) {
        if (it.peca_id != null) {
          updateEstoque.run(it.quantidade, it.peca_id);
          insertMov.run(it.peca_id, it.quantidade, `Cancelamento PDV #${vendaId}`, vendaId);
        }
      }

      // Apaga lançamento financeiro original
      db.prepare("DELETE FROM lancamentos WHERE ref_tipo = 'pdv' AND ref_id = ?").run(vendaId);

      // Marca como cancelada
      db.prepare(
        `UPDATE pdv_vendas
         SET status = 'cancelada',
             cancelada_em = datetime('now','localtime'),
             cancelada_motivo = ?
         WHERE id = ?`,
      ).run(motivo, vendaId);
    });

    tx();
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Erro interno';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
