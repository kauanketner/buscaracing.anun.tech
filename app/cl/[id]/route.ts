import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

/**
 * GET /cl/[id] — redirect estável para o checklist atual.
 *
 * Por que existe: o link do botão CTA no template da WTS é configurado uma
 * única vez. Se o token do checklist mudar, o botão continuaria apontando
 * pro token antigo. Esta rota resolve o token NA HORA da requisição,
 * usando o id estável do checklist, e faz redirect 302 pro link real.
 *
 * Configurar no template da WTS: https://buscaracing.com/cl/<id>
 */
export async function GET(request: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  const numId = Number(id);

  // Resolve base URL respeitando proxy reverso (Caddy passa host externo).
  // Fallback pra NEXT_PUBLIC_URL ou domínio fixo.
  const fwdHost = request.headers.get('x-forwarded-host') || request.headers.get('host');
  const fwdProto = request.headers.get('x-forwarded-proto') || 'https';
  const base = fwdHost
    ? `${fwdProto}://${fwdHost}`
    : process.env.NEXT_PUBLIC_URL || 'https://buscaracing.com';

  if (!Number.isFinite(numId)) {
    return NextResponse.redirect(`${base}/`, 302);
  }

  const db = getDb();
  const row = db
    .prepare('SELECT token, ativo FROM checklists WHERE id = ?')
    .get(numId) as { token: string; ativo: number } | undefined;

  if (!row || !row.ativo || !row.token) {
    return NextResponse.redirect(`${base}/`, 302);
  }

  // 302 (temporary) — pra clientes não fazerem cache permanente
  return NextResponse.redirect(`${base}/checklist/${row.token}`, 302);
}
