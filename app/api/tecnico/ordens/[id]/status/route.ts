import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getTecnicoFromRequest } from '@/lib/tecnico-auth';
import { validateStatusTransition, isOficinaStatus } from '@/lib/oficina-status';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, context: RouteContext) {
  const tec = getTecnicoFromRequest(request);
  if (!tec) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }
  const { id: idParam } = await context.params;
  const id = Number(idParam);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    status?: unknown;
    mensagem?: unknown;
  };
  const novoStatus = typeof body.status === 'string' ? body.status : '';
  const mensagem = typeof body.mensagem === 'string' ? body.mensagem.trim() : '';

  if (!isOficinaStatus(novoStatus)) {
    return NextResponse.json({ error: 'Status inválido' }, { status: 400 });
  }

  const db = getDb();
  const ordem = db
    .prepare('SELECT id, status FROM oficina_ordens WHERE id = ? AND tecnico_id = ?')
    .get(id, tec.id) as { id: number; status: string } | undefined;
  if (!ordem) {
    return NextResponse.json({ error: 'OS não encontrada' }, { status: 404 });
  }

  const check = validateStatusTransition(ordem.status, novoStatus);
  if (!check.ok) {
    return NextResponse.json({ error: check.reason }, { status: 400 });
  }

  const tx = db.transaction(() => {
    db.prepare(
      "UPDATE oficina_ordens SET status = ?, updated_at = datetime('now','localtime') WHERE id = ?",
    ).run(novoStatus, id);
    db.prepare(
      `INSERT INTO oficina_historico (ordem_id, status_anterior, status_novo, mensagem, autor)
       VALUES (?, ?, ?, ?, ?)`,
    ).run(id, ordem.status, novoStatus, mensagem, tec.nome);
  });
  tx();

  return NextResponse.json({ ok: true });
}
