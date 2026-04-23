import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/auth';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

const TRANSICOES: Record<string, string[]> = {
  pendente:   ['aprovada', 'recusada'],
  aprovada:   ['ativa', 'cancelada'],
  ativa:      ['finalizada'],
  recusada:   [],
  cancelada:  [],
  finalizada: [],
};

export async function GET(request: NextRequest, ctx: Ctx) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }
  const { id } = await ctx.params;
  const db = getDb();
  const row = db
    .prepare(
      `SELECT a.*, m.nome AS moto_nome, m.marca AS moto_marca, m.imagem AS moto_imagem,
              m.modelo AS moto_modelo, m.ano AS moto_ano, m.placa AS moto_placa
       FROM alugueis a LEFT JOIN motos m ON m.id=a.moto_id WHERE a.id=?`,
    )
    .get(Number(id));
  if (!row) return NextResponse.json({ error: 'Reserva não encontrada' }, { status: 404 });
  return NextResponse.json(row);
}

export async function PATCH(request: NextRequest, ctx: Ctx) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }
  const { id } = await ctx.params;
  const db = getDb();
  const atual = db.prepare('SELECT * FROM alugueis WHERE id=?').get(Number(id)) as
    | Record<string, unknown> | undefined;
  if (!atual) return NextResponse.json({ error: 'Reserva não encontrada' }, { status: 404 });

  const body = (await request.json()) as {
    status?: string;
    motivo_recusa?: string;
    admin_notas?: string;
    valor_dano?: number;
  };

  const statusAtual = String(atual.status);
  const novoStatus = body.status;

  // Atualizar só notas (sem trocar status)
  if (!novoStatus) {
    const sets: string[] = [];
    const vals: unknown[] = [];
    if (body.admin_notas !== undefined) {
      sets.push('admin_notas=?');
      vals.push(body.admin_notas);
    }
    if (sets.length === 0) return NextResponse.json({ ok: true });
    vals.push(Number(id));
    db.prepare(`UPDATE alugueis SET ${sets.join(', ')} WHERE id=?`).run(...vals);
    return NextResponse.json({ ok: true });
  }

  // Validar transição
  const validas = TRANSICOES[statusAtual] || [];
  if (!validas.includes(novoStatus)) {
    return NextResponse.json({
      error: `Transição inválida: ${statusAtual} → ${novoStatus}`,
    }, { status: 400 });
  }

  const tx = db.transaction(() => {
    const agora = "datetime('now','localtime')";

    if (novoStatus === 'aprovada') {
      // Recusar conflitantes pendentes automaticamente
      db.prepare(
        `UPDATE alugueis SET status='recusada', motivo_recusa='Conflito de datas'
         WHERE moto_id=? AND status='pendente' AND id != ?
           AND NOT (data_fim < ? OR data_inicio > ?)`,
      ).run(atual.moto_id, Number(id), atual.data_inicio, atual.data_fim);
      db.prepare(`UPDATE alugueis SET status='aprovada', aprovada_em=${agora} WHERE id=?`).run(Number(id));
    } else if (novoStatus === 'recusada') {
      db.prepare('UPDATE alugueis SET status=?, motivo_recusa=? WHERE id=?')
        .run('recusada', (body.motivo_recusa || '').trim(), Number(id));
    } else if (novoStatus === 'cancelada') {
      db.prepare('UPDATE alugueis SET status=?, motivo_recusa=? WHERE id=?')
        .run('cancelada', (body.motivo_recusa || '').trim(), Number(id));
    } else if (novoStatus === 'ativa') {
      db.prepare(`UPDATE alugueis SET status='ativa', retirada_em=${agora} WHERE id=?`).run(Number(id));
      // Lançamento de entrada quando retira a moto
      db.prepare(
        `INSERT INTO lancamentos (tipo, categoria, valor, descricao, ref_tipo, ref_id)
         VALUES ('entrada', 'aluguel_moto', ?, ?, 'aluguel', ?)`,
      ).run(
        Number(atual.valor_total),
        `Aluguel #${id} — ${atual.cliente_nome}`,
        Number(id),
      );
    } else if (novoStatus === 'finalizada') {
      const dano = Number(body.valor_dano) || 0;
      db.prepare(`UPDATE alugueis SET status='finalizada', devolvida_em=${agora}, valor_dano=? WHERE id=?`)
        .run(dano, Number(id));
      if (dano > 0) {
        db.prepare(
          `INSERT INTO lancamentos (tipo, categoria, valor, descricao, ref_tipo, ref_id)
           VALUES ('entrada', 'dano_aluguel', ?, ?, 'aluguel', ?)`,
        ).run(dano, `Dano/ressarcimento aluguel #${id}`, Number(id));
      }
    }
  });
  tx();

  return NextResponse.json({ ok: true });
}
