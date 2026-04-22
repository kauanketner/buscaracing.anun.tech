import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/auth';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ id: string }> };

/** GET /api/pecas/[id] — público se ativa, admin sempre */
export async function GET(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const db = getDb();
  const row = db.prepare('SELECT * FROM pecas WHERE id=?').get(Number(id)) as
    | Record<string, unknown>
    | undefined;
  if (!row) return NextResponse.json({ error: 'Peça não encontrada' }, { status: 404 });
  if (!row.ativo && !isAuthenticated(request)) {
    return NextResponse.json({ error: 'Peça não encontrada' }, { status: 404 });
  }
  return NextResponse.json(row);
}

/** PUT /api/pecas/[id] — admin */
export async function PUT(request: NextRequest, context: RouteContext) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }
  try {
    const { id } = await context.params;
    const db = getDb();
    const body = (await request.json()) as Record<string, unknown>;

    const fields = [
      'nome', 'categoria', 'descricao', 'preco', 'preco_original',
      'imagem', 'marca_moto', 'modelo_compat', 'codigo',
    ] as const;
    const sets: string[] = [];
    const vals: unknown[] = [];
    for (const f of fields) {
      if (f in body) {
        sets.push(`${f}=?`);
        vals.push(body[f] ?? null);
      }
    }
    if ('destaque' in body) { sets.push('destaque=?'); vals.push(body.destaque ? 1 : 0); }
    if ('ativo' in body) { sets.push('ativo=?'); vals.push(body.ativo ? 1 : 0); }

    if (sets.length === 0) return NextResponse.json({ ok: true });
    vals.push(Number(id));
    db.prepare(`UPDATE pecas SET ${sets.join(', ')} WHERE id=?`).run(...vals);
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Erro interno';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/** DELETE /api/pecas/[id] — admin */
export async function DELETE(request: NextRequest, context: RouteContext) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }
  const { id } = await context.params;
  const db = getDb();
  const r = db.prepare('DELETE FROM pecas WHERE id=?').run(Number(id));
  if (r.changes === 0) return NextResponse.json({ error: 'Peça não encontrada' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
