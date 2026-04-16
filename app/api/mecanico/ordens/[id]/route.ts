import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getMecanicoFromRequest } from '@/lib/mecanico-auth';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  const tec = getMecanicoFromRequest(request);
  if (!tec) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }
  const { id: idParam } = await context.params;
  const id = Number(idParam);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
  }
  const db = getDb();
  const ordem = db
    .prepare(
      `SELECT o.*, m.nome AS moto_nome
       FROM oficina_ordens o
       LEFT JOIN motos m ON m.id = o.moto_id
       WHERE o.id = ? AND o.mecanico_id = ?`,
    )
    .get(id, tec.id) as Record<string, unknown> | undefined;
  if (!ordem) {
    return NextResponse.json({ error: 'OS não encontrada' }, { status: 404 });
  }
  const historico = db
    .prepare(
      `SELECT id, ordem_id, status_anterior, status_novo, mensagem, autor, created_at
       FROM oficina_historico WHERE ordem_id = ? ORDER BY id ASC`,
    )
    .all(id);
  return NextResponse.json({ ...ordem, historico });
}
