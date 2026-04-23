import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/auth';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

/** PUT — atualiza categoria */
export async function PUT(request: NextRequest, ctx: Ctx) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }
  const { id } = await ctx.params;
  const db = getDb();
  const body = (await request.json()) as {
    label?: string;
    descricao?: string;
    ordem?: number;
    ativo?: boolean;
  };
  const sets: string[] = [];
  const vals: unknown[] = [];
  if (body.label !== undefined) {
    const label = (body.label || '').trim();
    if (!label) return NextResponse.json({ error: 'Nome obrigatório' }, { status: 400 });
    sets.push('label=?');
    vals.push(label);
  }
  if (body.descricao !== undefined) { sets.push('descricao=?'); vals.push(body.descricao); }
  if (body.ordem !== undefined) { sets.push('ordem=?'); vals.push(Number(body.ordem) || 0); }
  if (body.ativo !== undefined) { sets.push('ativo=?'); vals.push(body.ativo ? 1 : 0); }
  if (sets.length === 0) return NextResponse.json({ ok: true });
  vals.push(Number(id));
  db.prepare(`UPDATE categorias SET ${sets.join(', ')} WHERE id=?`).run(...vals);
  return NextResponse.json({ ok: true });
}

/** DELETE — remove categoria */
export async function DELETE(request: NextRequest, ctx: Ctx) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }
  const { id } = await ctx.params;
  const db = getDb();

  // Proteção: não deixa remover se houver motos/peças usando essa categoria
  const cat = db.prepare('SELECT tipo, slug FROM categorias WHERE id=?').get(Number(id)) as
    | { tipo: string; slug: string } | undefined;
  if (!cat) return NextResponse.json({ error: 'Categoria não encontrada' }, { status: 404 });

  const table = cat.tipo === 'moto' ? 'motos' : 'pecas';
  const count = (db.prepare(`SELECT COUNT(*) AS c FROM ${table} WHERE categoria=?`).get(cat.slug) as { c: number }).c;
  if (count > 0) {
    return NextResponse.json({
      error: `${count} ${table} ${count === 1 ? 'usa' : 'usam'} esta categoria. Mova ${count === 1 ? 'ele' : 'eles'} antes de excluir.`,
    }, { status: 409 });
  }

  db.prepare('DELETE FROM categorias WHERE id=?').run(Number(id));
  return NextResponse.json({ ok: true });
}
