import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { isAuthenticated } from '@/lib/auth';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

/** GET /api/checklists — list all checklists (admin) */
export async function GET(request: NextRequest) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT c.*,
              (SELECT COUNT(*) FROM checklist_itens WHERE checklist_id = c.id) AS total_itens,
              (SELECT COUNT(*) FROM checklist_respostas WHERE checklist_id = c.id) AS total_respostas
       FROM checklists c ORDER BY c.id DESC`,
    )
    .all();
  return NextResponse.json(rows);
}

/** POST /api/checklists — create checklist with items */
export async function POST(request: NextRequest) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }
  try {
    const db = getDb();
    const body = (await request.json()) as {
      titulo: string;
      descricao?: string;
      itens: { tipo: string; label: string }[];
    };
    const titulo = (body.titulo || '').trim();
    if (!titulo) return NextResponse.json({ error: 'Título obrigatório' }, { status: 400 });
    if (!body.itens || body.itens.length === 0) {
      return NextResponse.json({ error: 'Adicione pelo menos 1 item' }, { status: 400 });
    }

    const token = crypto.randomBytes(12).toString('hex');

    const tx = db.transaction(() => {
      const result = db
        .prepare('INSERT INTO checklists (titulo, descricao, token) VALUES (?, ?, ?)')
        .run(titulo, (body.descricao || '').trim(), token);
      const checklistId = Number(result.lastInsertRowid);

      const insert = db.prepare(
        'INSERT INTO checklist_itens (checklist_id, tipo, label, ordem) VALUES (?, ?, ?, ?)',
      );
      for (let i = 0; i < body.itens.length; i++) {
        const item = body.itens[i];
        insert.run(checklistId, item.tipo || 'checkbox', (item.label || '').trim(), i);
      }
      return checklistId;
    });

    const id = tx();
    return NextResponse.json({ ok: true, id, token });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Erro interno';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
