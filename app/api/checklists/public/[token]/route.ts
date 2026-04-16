import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ token: string }> };

/** GET /api/checklists/public/[token] — get checklist for filling (no auth) */
export async function GET(_request: NextRequest, context: RouteContext) {
  const { token } = await context.params;
  const db = getDb();
  const checklist = db
    .prepare('SELECT id, titulo, descricao FROM checklists WHERE token=? AND ativo=1')
    .get(token);
  if (!checklist) return NextResponse.json({ error: 'Checklist não encontrado' }, { status: 404 });

  const itens = db
    .prepare('SELECT id, tipo, label, ordem FROM checklist_itens WHERE checklist_id=? ORDER BY ordem ASC')
    .all((checklist as { id: number }).id);

  return NextResponse.json({ ...(checklist as Record<string, unknown>), itens });
}

/** POST /api/checklists/public/[token] — submit filled checklist (no auth) */
export async function POST(request: NextRequest, context: RouteContext) {
  const { token } = await context.params;
  const db = getDb();
  const checklist = db
    .prepare('SELECT id FROM checklists WHERE token=? AND ativo=1')
    .get(token) as { id: number } | undefined;
  if (!checklist) return NextResponse.json({ error: 'Checklist não encontrado' }, { status: 404 });

  try {
    const body = (await request.json()) as {
      preenchido_por: string;
      respostas: { item_id: number; valor_checkbox?: number; valor_texto?: string; valor_foto?: string }[];
    };
    const nome = (body.preenchido_por || '').trim();
    if (!nome) return NextResponse.json({ error: 'Nome obrigatório' }, { status: 400 });

    const tx = db.transaction(() => {
      const result = db
        .prepare('INSERT INTO checklist_respostas (checklist_id, preenchido_por) VALUES (?, ?)')
        .run(checklist.id, nome);
      const respostaId = Number(result.lastInsertRowid);

      const insert = db.prepare(
        'INSERT INTO checklist_resposta_itens (resposta_id, item_id, valor_checkbox, valor_texto, valor_foto) VALUES (?, ?, ?, ?, ?)',
      );
      for (const r of body.respostas || []) {
        insert.run(respostaId, r.item_id, r.valor_checkbox || 0, (r.valor_texto || '').trim(), (r.valor_foto || '').trim());
      }
      return respostaId;
    });
    const respostaId = tx();
    return NextResponse.json({ ok: true, resposta_id: respostaId });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Erro interno';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
