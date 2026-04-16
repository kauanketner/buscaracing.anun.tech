import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getTecnicoFromRequest } from '@/lib/tecnico-auth';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  const tec = getTecnicoFromRequest(request);
  if (!tec) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }
  const { id: idParam } = await context.params;
  const id = Number(idParam);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
  }
  const body = (await request.json().catch(() => ({}))) as { mensagem?: unknown };
  const mensagem = typeof body.mensagem === 'string' ? body.mensagem.trim() : '';
  if (!mensagem) {
    return NextResponse.json({ error: 'Observação vazia' }, { status: 400 });
  }

  const db = getDb();
  const ordem = db
    .prepare('SELECT id, status FROM oficina_ordens WHERE id = ? AND tecnico_id = ?')
    .get(id, tec.id) as { id: number; status: string } | undefined;
  if (!ordem) {
    return NextResponse.json({ error: 'OS não encontrada' }, { status: 404 });
  }

  // Nota sem mudança de status: status_anterior = status_novo = status atual
  db.prepare(
    `INSERT INTO oficina_historico (ordem_id, status_anterior, status_novo, mensagem, autor)
     VALUES (?, ?, ?, ?, ?)`,
  ).run(id, ordem.status, ordem.status, mensagem, tec.nome);

  return NextResponse.json({ ok: true });
}
