import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/auth';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

/** GET /api/oficina/[id]/servicos — lista serviços de uma OS */
export async function GET(request: NextRequest, ctx: Ctx) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }
  const { id } = await ctx.params;
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT os.*
       FROM os_servicos os
       WHERE os.ordem_id = ?
       ORDER BY os.id ASC`,
    )
    .all(Number(id));
  return NextResponse.json(rows);
}

/** POST /api/oficina/[id]/servicos — anexa serviço (catálogo ou avulso) à OS */
export async function POST(request: NextRequest, ctx: Ctx) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }
  try {
    const { id } = await ctx.params;
    const db = getDb();
    const body = (await request.json()) as {
      servico_id?: number;
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
    let servicoId: number | null = null;

    // Se recebeu servico_id, busca do catálogo pra completar snapshot
    if (body.servico_id) {
      const s = db
        .prepare('SELECT id, nome, codigo, preco FROM servicos WHERE id=?')
        .get(Number(body.servico_id)) as { id: number; nome: string; codigo: string; preco: number | null } | undefined;
      if (!s) return NextResponse.json({ error: 'Serviço não encontrado' }, { status: 404 });
      servicoId = s.id;
      if (!nome) nome = s.nome;
      if (!codigo) codigo = s.codigo || '';
      if (Number.isNaN(preco)) preco = s.preco || 0;
    }

    if (!nome) return NextResponse.json({ error: 'Nome do serviço obrigatório' }, { status: 400 });
    if (Number.isNaN(preco) || preco < 0) preco = 0;

    const result = db
      .prepare(
        `INSERT INTO os_servicos (ordem_id, servico_id, nome_snapshot, codigo_snapshot, quantidade, preco_unitario)
         VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .run(Number(id), servicoId, nome, codigo, quantidade, preco);

    return NextResponse.json({ ok: true, id: Number(result.lastInsertRowid) });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Erro interno';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
