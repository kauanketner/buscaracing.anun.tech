import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/auth';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string; servicoOsId: string }> };

/** PATCH — atualiza quantidade/preço do serviço anexado */
export async function PATCH(request: NextRequest, ctx: Ctx) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }
  const { id, servicoOsId } = await ctx.params;
  const db = getDb();
  const body = (await request.json()) as {
    quantidade?: number;
    preco_unitario?: number;
  };

  const atual = db
    .prepare('SELECT id FROM os_servicos WHERE id=? AND ordem_id=?')
    .get(Number(servicoOsId), Number(id));
  if (!atual) return NextResponse.json({ error: 'Serviço não encontrado' }, { status: 404 });

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

  vals.push(Number(servicoOsId), Number(id));
  db.prepare(`UPDATE os_servicos SET ${sets.join(', ')} WHERE id=? AND ordem_id=?`).run(...vals);

  return NextResponse.json({ ok: true });
}

/** DELETE — remove o serviço anexado */
export async function DELETE(request: NextRequest, ctx: Ctx) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }
  const { id, servicoOsId } = await ctx.params;
  const db = getDb();

  const r = db
    .prepare('DELETE FROM os_servicos WHERE id=? AND ordem_id=?')
    .run(Number(servicoOsId), Number(id));
  if (r.changes === 0) {
    return NextResponse.json({ error: 'Serviço não encontrado' }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
