import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

/**
 * GET /c/[id] — redirect estável para o checklist atual.
 *
 * Por que existe: o link do botão CTA no template da WTS é configurado uma
 * única vez. Se o token do checklist mudar, o botão continuaria apontando
 * pro token antigo. Esta rota resolve o token NA HORA da requisição,
 * usando o id estável do checklist, e faz redirect 302 pro link real.
 *
 * Configurar no template da WTS: https://buscaracing.com/c/<id>
 */
export async function GET(_request: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  const numId = Number(id);

  if (!Number.isFinite(numId)) {
    // ID inválido — manda pra home
    return NextResponse.redirect(new URL('/', _request.url));
  }

  const db = getDb();
  const row = db
    .prepare('SELECT token, ativo FROM checklists WHERE id = ?')
    .get(numId) as { token: string; ativo: number } | undefined;

  if (!row || !row.ativo || !row.token) {
    // Checklist não existe ou está inativo
    return NextResponse.redirect(new URL('/', _request.url));
  }

  // 302 (temporary) — pra clientes não fazerem cache permanente
  return NextResponse.redirect(new URL(`/checklist/${row.token}`, _request.url), 302);
}
