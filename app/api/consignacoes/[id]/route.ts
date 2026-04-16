import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/auth';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ id: string }> };

/** GET /api/consignacoes/[id] — detail */
export async function GET(request: NextRequest, context: RouteContext) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }
  const { id } = await context.params;
  const db = getDb();
  const row = db
    .prepare(
      `SELECT c.*,
              m.nome AS moto_nome, m.marca AS moto_marca, m.imagem AS moto_imagem,
              m.estado AS moto_estado, m.preco AS moto_preco
       FROM consignacoes c
       LEFT JOIN motos m ON c.moto_id = m.id
       WHERE c.id=?`,
    )
    .get(Number(id));
  if (!row) return NextResponse.json({ error: 'Não encontrada' }, { status: 404 });
  return NextResponse.json(row);
}

/** DELETE /api/consignacoes/[id] — dono retirou a moto (antes de vender) */
export async function DELETE(request: NextRequest, context: RouteContext) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }
  try {
    const { id } = await context.params;
    const db = getDb();
    const consig = db
      .prepare("SELECT id, moto_id, status FROM consignacoes WHERE id=?")
      .get(Number(id)) as { id: number; moto_id: number; status: string } | undefined;
    if (!consig) return NextResponse.json({ error: 'Não encontrada' }, { status: 404 });
    if (consig.status !== 'ativa') {
      return NextResponse.json({ error: 'Consignação já encerrada' }, { status: 400 });
    }

    const tx = db.transaction(() => {
      db.prepare("UPDATE consignacoes SET status='retirada', data_retirada=date('now','localtime') WHERE id=?")
        .run(consig.id);
      db.prepare("UPDATE motos SET estado='retirada' WHERE id=?")
        .run(consig.moto_id);
    });
    tx();

    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Erro interno';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
