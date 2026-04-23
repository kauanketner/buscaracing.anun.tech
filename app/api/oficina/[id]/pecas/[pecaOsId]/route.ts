import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/auth';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string; pecaOsId: string }> };

/** PATCH — atualiza quantidade/preço da peça anexada */
export async function PATCH(request: NextRequest, ctx: Ctx) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }
  const { id, pecaOsId } = await ctx.params;
  const db = getDb();
  const body = (await request.json()) as {
    quantidade?: number;
    preco_unitario?: number;
  };
  const sets: string[] = [];
  const vals: unknown[] = [];
  if (body.quantidade !== undefined) {
    const q = Math.max(1, Math.floor(Number(body.quantidade) || 1));
    sets.push('quantidade=?');
    vals.push(q);
  }
  if (body.preco_unitario !== undefined) {
    const p = Number(body.preco_unitario);
    sets.push('preco_unitario=?');
    vals.push(Number.isFinite(p) && p >= 0 ? p : 0);
  }
  if (sets.length === 0) return NextResponse.json({ ok: true });
  vals.push(Number(pecaOsId), Number(id));
  db.prepare(`UPDATE os_pecas SET ${sets.join(', ')} WHERE id=? AND ordem_id=?`).run(...vals);
  return NextResponse.json({ ok: true });
}

/** DELETE — remove a peça anexada */
export async function DELETE(request: NextRequest, ctx: Ctx) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }
  const { id, pecaOsId } = await ctx.params;
  const db = getDb();
  const r = db
    .prepare('DELETE FROM os_pecas WHERE id=? AND ordem_id=?')
    .run(Number(pecaOsId), Number(id));
  if (r.changes === 0) {
    return NextResponse.json({ error: 'Peça não encontrada' }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
