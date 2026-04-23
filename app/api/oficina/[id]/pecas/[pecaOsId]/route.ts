import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/auth';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string; pecaOsId: string }> };

/** PATCH — atualiza quantidade/preço da peça anexada (ajusta estoque se qtd mudar) */
export async function PATCH(request: NextRequest, ctx: Ctx) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }
  const { id, pecaOsId } = await ctx.params;
  const db = getDb();
  const body = (await request.json()) as {
    quantidade?: number;
    preco_unitario?: number;
  };

  const atual = db
    .prepare('SELECT peca_id, quantidade FROM os_pecas WHERE id=? AND ordem_id=?')
    .get(Number(pecaOsId), Number(id)) as { peca_id: number | null; quantidade: number } | undefined;
  if (!atual) return NextResponse.json({ error: 'Peça não encontrada' }, { status: 404 });

  const sets: string[] = [];
  const vals: unknown[] = [];
  let novaQtd: number | null = null;
  if (body.quantidade !== undefined) {
    const q = Math.max(1, Math.floor(Number(body.quantidade) || 1));
    sets.push('quantidade=?');
    vals.push(q);
    novaQtd = q;
  }
  if (body.preco_unitario !== undefined) {
    const p = Number(body.preco_unitario);
    sets.push('preco_unitario=?');
    vals.push(Number.isFinite(p) && p >= 0 ? p : 0);
  }
  if (sets.length === 0) return NextResponse.json({ ok: true });

  const tx = db.transaction(() => {
    vals.push(Number(pecaOsId), Number(id));
    db.prepare(`UPDATE os_pecas SET ${sets.join(', ')} WHERE id=? AND ordem_id=?`).run(...vals);

    // Ajusta estoque se a quantidade mudou e peça vinha do catálogo
    if (novaQtd != null && atual.peca_id) {
      const diff = novaQtd - atual.quantidade; // positivo = precisa tirar mais, negativo = devolve
      if (diff !== 0) {
        db.prepare('UPDATE pecas SET estoque_qtd = COALESCE(estoque_qtd, 0) - ? WHERE id=?')
          .run(diff, atual.peca_id);
        db.prepare(
          `INSERT INTO pecas_movimentacoes (peca_id, tipo, quantidade, descricao, ref_tipo, ref_id)
           VALUES (?, ?, ?, ?, 'os', ?)`,
        ).run(
          atual.peca_id,
          diff > 0 ? 'saida' : 'entrada',
          Math.abs(diff),
          `Ajuste na OS #${id} (qtd ${atual.quantidade} → ${novaQtd})`,
          Number(id),
        );
      }
    }
  });
  tx();

  return NextResponse.json({ ok: true });
}

/** DELETE — remove a peça anexada (devolve estoque se veio do catálogo) */
export async function DELETE(request: NextRequest, ctx: Ctx) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }
  const { id, pecaOsId } = await ctx.params;
  const db = getDb();

  const atual = db
    .prepare('SELECT peca_id, quantidade FROM os_pecas WHERE id=? AND ordem_id=?')
    .get(Number(pecaOsId), Number(id)) as { peca_id: number | null; quantidade: number } | undefined;
  if (!atual) return NextResponse.json({ error: 'Peça não encontrada' }, { status: 404 });

  const tx = db.transaction(() => {
    db.prepare('DELETE FROM os_pecas WHERE id=? AND ordem_id=?').run(Number(pecaOsId), Number(id));
    if (atual.peca_id) {
      db.prepare('UPDATE pecas SET estoque_qtd = COALESCE(estoque_qtd, 0) + ? WHERE id=?')
        .run(atual.quantidade, atual.peca_id);
      db.prepare(
        `INSERT INTO pecas_movimentacoes (peca_id, tipo, quantidade, descricao, ref_tipo, ref_id)
         VALUES (?, 'entrada', ?, ?, 'os', ?)`,
      ).run(atual.peca_id, atual.quantidade, `Removida da OS #${id}`, Number(id));
    }
  });
  tx();

  return NextResponse.json({ ok: true });
}
