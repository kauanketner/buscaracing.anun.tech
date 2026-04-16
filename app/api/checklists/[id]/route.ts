import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/auth';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ id: string }> };

/** GET /api/checklists/[id] — detail with items + responses history */
export async function GET(request: NextRequest, context: RouteContext) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }
  const { id } = await context.params;
  const db = getDb();
  const checklist = db.prepare('SELECT * FROM checklists WHERE id=?').get(Number(id));
  if (!checklist) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 });

  const itens = db
    .prepare('SELECT * FROM checklist_itens WHERE checklist_id=? ORDER BY ordem ASC')
    .all(Number(id));

  const respostas = db
    .prepare(
      'SELECT id, preenchido_por, created_at FROM checklist_respostas WHERE checklist_id=? ORDER BY id DESC',
    )
    .all(Number(id));

  return NextResponse.json({ ...(checklist as Record<string, unknown>), itens, respostas });
}

/** PUT /api/checklists/[id] — update checklist + items */
export async function PUT(request: NextRequest, context: RouteContext) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }
  try {
    const { id } = await context.params;
    const db = getDb();
    const body = (await request.json()) as {
      titulo?: string;
      descricao?: string;
      ativo?: boolean;
      itens?: { tipo: string; label: string }[];
    };

    const tx = db.transaction(() => {
      if (body.titulo !== undefined) {
        db.prepare('UPDATE checklists SET titulo=? WHERE id=?').run((body.titulo || '').trim(), Number(id));
      }
      if (body.descricao !== undefined) {
        db.prepare('UPDATE checklists SET descricao=? WHERE id=?').run((body.descricao || '').trim(), Number(id));
      }
      if (body.ativo !== undefined) {
        db.prepare('UPDATE checklists SET ativo=? WHERE id=?').run(body.ativo ? 1 : 0, Number(id));
      }
      if (body.itens) {
        db.prepare('DELETE FROM checklist_itens WHERE checklist_id=?').run(Number(id));
        const insert = db.prepare(
          'INSERT INTO checklist_itens (checklist_id, tipo, label, ordem) VALUES (?, ?, ?, ?)',
        );
        for (let i = 0; i < body.itens.length; i++) {
          insert.run(Number(id), body.itens[i].tipo || 'checkbox', (body.itens[i].label || '').trim(), i);
        }
      }
    });
    tx();
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Erro interno';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/** DELETE /api/checklists/[id] — remove checklist */
export async function DELETE(request: NextRequest, context: RouteContext) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }
  const { id } = await context.params;
  const db = getDb();
  db.prepare('DELETE FROM checklist_resposta_itens WHERE resposta_id IN (SELECT id FROM checklist_respostas WHERE checklist_id=?)').run(Number(id));
  db.prepare('DELETE FROM checklist_respostas WHERE checklist_id=?').run(Number(id));
  db.prepare('DELETE FROM checklist_itens WHERE checklist_id=?').run(Number(id));
  db.prepare('DELETE FROM checklists WHERE id=?').run(Number(id));
  return NextResponse.json({ ok: true });
}
