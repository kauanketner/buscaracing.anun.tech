import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/auth';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ id: string }> };

/** GET /api/servicos/[id] */
export async function GET(_request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const db = getDb();
  const row = db.prepare('SELECT * FROM servicos WHERE id=?').get(Number(id)) as
    | Record<string, unknown>
    | undefined;
  if (!row) return NextResponse.json({ error: 'Serviço não encontrado' }, { status: 404 });
  return NextResponse.json(row);
}

/** PUT /api/servicos/[id] — admin */
export async function PUT(request: NextRequest, context: RouteContext) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }
  try {
    const { id } = await context.params;
    const db = getDb();
    const body = (await request.json()) as Record<string, unknown>;

    const fields = ['nome', 'categoria', 'descricao', 'preco', 'codigo'] as const;
    const sets: string[] = [];
    const vals: unknown[] = [];
    for (const f of fields) {
      if (f in body) {
        sets.push(`${f}=?`);
        vals.push(body[f] ?? null);
      }
    }
    if ('ativo' in body) { sets.push('ativo=?'); vals.push(body.ativo ? 1 : 0); }

    if (sets.length === 0) return NextResponse.json({ ok: true });
    vals.push(Number(id));
    db.prepare(`UPDATE servicos SET ${sets.join(', ')} WHERE id=?`).run(...vals);
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Erro interno';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/** DELETE /api/servicos/[id] — admin */
export async function DELETE(request: NextRequest, context: RouteContext) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }
  const { id } = await context.params;
  const db = getDb();
  const r = db.prepare('DELETE FROM servicos WHERE id=?').run(Number(id));
  if (r.changes === 0) return NextResponse.json({ error: 'Serviço não encontrado' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
