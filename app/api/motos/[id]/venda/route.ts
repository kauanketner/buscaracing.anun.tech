import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/auth';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }
  try {
    const { id } = await context.params;
    const body = (await request.json()) as {
      vendedor_id?: number | null;
      comprador_nome?: string;
      valor_venda_final?: number | string | null;
      data_venda?: string;
    };
    const db = getDb();

    const moto = db.prepare('SELECT id FROM motos WHERE id=?').get(Number(id));
    if (!moto) {
      return NextResponse.json({ error: 'Moto não encontrada' }, { status: 404 });
    }

    const vendedorId =
      body.vendedor_id != null && !Number.isNaN(Number(body.vendedor_id))
        ? Number(body.vendedor_id)
        : null;

    const compradorNome = (body.comprador_nome || '').trim();

    const valor =
      body.valor_venda_final != null && body.valor_venda_final !== ''
        ? Number(body.valor_venda_final)
        : null;

    const data =
      body.data_venda && body.data_venda.trim()
        ? body.data_venda.trim()
        : new Date().toISOString().slice(0, 10);

    db.prepare(
      `UPDATE motos
       SET vendida=1,
           vendedor_id=?,
           comprador_nome=?,
           valor_venda_final=?,
           data_venda=?,
           ativo=0
       WHERE id=?`
    ).run(vendedorId, compradorNome, valor, data, Number(id));

    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Erro interno';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  // Undo sale — mark as available again
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }
  try {
    const { id } = await context.params;
    const db = getDb();
    db.prepare(
      `UPDATE motos
       SET vendida=0,
           vendedor_id=NULL,
           comprador_nome='',
           valor_venda_final=NULL,
           data_venda=NULL,
           ativo=1
       WHERE id=?`
    ).run(Number(id));
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Erro interno';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
