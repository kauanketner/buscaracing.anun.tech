import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/auth';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

/**
 * GET /api/clientes/[id] — detalhe + histórico unificado de touchpoints.
 *
 * Retorna `{ ...cliente, touchpoints: [{tipo, ref_id, valor, data, descricao}, ...] }`
 */
export async function GET(request: NextRequest, ctx: Ctx) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }
  const { id } = await ctx.params;
  const clienteId = Number(id);
  const db = getDb();

  const cliente = db.prepare('SELECT * FROM clientes WHERE id = ?').get(clienteId) as
    | Record<string, unknown> | undefined;
  if (!cliente) {
    return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 });
  }

  // Histórico unificado
  const vendas = db.prepare(
    `SELECT 'compra' AS tipo, v.id AS ref_id, v.valor_venda AS valor,
            v.data_venda AS data, m.nome AS descricao
     FROM vendas v LEFT JOIN motos m ON v.moto_id = m.id
     WHERE v.cliente_id = ?`,
  ).all(clienteId);

  const oficina = db.prepare(
    `SELECT 'oficina' AS tipo, o.id AS ref_id, COALESCE(o.valor_final, o.valor_estimado) AS valor,
            o.data_entrada AS data,
            COALESCE(o.servico_descricao, m.nome, o.moto_marca || ' ' || o.moto_modelo) AS descricao
     FROM oficina_ordens o LEFT JOIN motos m ON o.moto_id = m.id
     WHERE o.cliente_id = ?`,
  ).all(clienteId);

  const reservas = db.prepare(
    `SELECT 'reserva' AS tipo, r.id AS ref_id, r.valor_sinal AS valor,
            r.data_inicio AS data, m.nome AS descricao
     FROM reservas r LEFT JOIN motos m ON r.moto_id = m.id
     WHERE r.cliente_id = ?`,
  ).all(clienteId);

  const alugueis = db.prepare(
    `SELECT 'aluguel' AS tipo, a.id AS ref_id, a.valor_total AS valor,
            a.data_inicio AS data, m.nome AS descricao
     FROM alugueis a LEFT JOIN motos m ON a.moto_id = m.id
     WHERE a.cliente_id = ?`,
  ).all(clienteId);

  const leads = db.prepare(
    `SELECT 'lead' AS tipo, l.id AS ref_id, NULL AS valor,
            l.created_at AS data, m.nome AS descricao
     FROM leads l LEFT JOIN motos m ON l.moto_id = m.id
     WHERE l.cliente_id = ?`,
  ).all(clienteId);

  const pdv = db.prepare(
    `SELECT 'pdv' AS tipo, pv.id AS ref_id, pv.valor_total AS valor,
            pv.data_venda AS data,
            (SELECT COUNT(*) || ' itens' FROM pdv_itens i WHERE i.pdv_venda_id = pv.id) AS descricao
     FROM pdv_vendas pv
     WHERE pv.cliente_id = ? AND pv.status = 'concluida'`,
  ).all(clienteId);

  const consignacoes = db.prepare(
    `SELECT 'consignacao' AS tipo, c.id AS ref_id, c.valor_repasse AS valor,
            c.data_entrada AS data, m.nome AS descricao
     FROM consignacoes c LEFT JOIN motos m ON c.moto_id = m.id
     WHERE c.cliente_id = ?`,
  ).all(clienteId);

  const touchpoints = [...vendas, ...oficina, ...reservas, ...alugueis, ...leads, ...pdv, ...consignacoes];
  // Ordena por data desc
  touchpoints.sort((a, b) => {
    const da = (a as { data: string }).data || '';
    const db_ = (b as { data: string }).data || '';
    return db_.localeCompare(da);
  });

  return NextResponse.json({ ...cliente, touchpoints });
}

/** PUT /api/clientes/[id] — atualiza cliente */
export async function PUT(request: NextRequest, ctx: Ctx) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }
  try {
    const { id } = await ctx.params;
    const db = getDb();
    const body = (await request.json()) as Record<string, unknown>;

    const fields = ['nome', 'telefone', 'email', 'cpf_cnpj', 'endereco', 'observacoes'] as const;
    const sets: string[] = [];
    const vals: unknown[] = [];
    for (const f of fields) {
      if (f in body) {
        sets.push(`${f} = ?`);
        vals.push(body[f] ?? '');
      }
    }
    if ('ativo' in body) {
      sets.push('ativo = ?');
      vals.push(body.ativo ? 1 : 0);
    }
    if (sets.length === 0) return NextResponse.json({ ok: true });
    sets.push("updated_at = datetime('now','localtime')");
    vals.push(Number(id));
    db.prepare(`UPDATE clientes SET ${sets.join(', ')} WHERE id = ?`).run(...vals);
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Erro interno';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * DELETE /api/clientes/[id] — soft-delete (ativo = 0).
 *
 * Mantém o registro pra preservar FKs (vendas/OS/etc). Não exclui hard.
 */
export async function DELETE(request: NextRequest, ctx: Ctx) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }
  const { id } = await ctx.params;
  const db = getDb();
  const r = db.prepare(
    "UPDATE clientes SET ativo = 0, updated_at = datetime('now','localtime') WHERE id = ?",
  ).run(Number(id));
  if (r.changes === 0) {
    return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
