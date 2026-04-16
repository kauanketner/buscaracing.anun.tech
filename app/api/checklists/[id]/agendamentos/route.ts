import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/auth';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ id: string }> };

/** GET /api/checklists/[id]/agendamentos — list schedules */
export async function GET(request: NextRequest, context: RouteContext) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }
  const { id } = await context.params;
  const db = getDb();
  const rows = db
    .prepare('SELECT * FROM checklist_agendamentos WHERE checklist_id=? ORDER BY horario ASC')
    .all(Number(id));
  return NextResponse.json(rows);
}

/** POST /api/checklists/[id]/agendamentos — create schedule */
export async function POST(request: NextRequest, context: RouteContext) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }
  try {
    const { id } = await context.params;
    const db = getDb();
    const body = (await request.json()) as {
      horario: string;
      dias_semana?: string;
      numeros: string;
      mensagem?: string;
    };
    const horario = (body.horario || '').trim();
    const numeros = (body.numeros || '').trim();
    if (!horario || !numeros) {
      return NextResponse.json({ error: 'Horário e números obrigatórios' }, { status: 400 });
    }
    if (!/^\d{2}:\d{2}$/.test(horario)) {
      return NextResponse.json({ error: 'Horário deve ser HH:MM' }, { status: 400 });
    }

    const result = db
      .prepare(
        'INSERT INTO checklist_agendamentos (checklist_id, horario, dias_semana, numeros, mensagem) VALUES (?, ?, ?, ?, ?)',
      )
      .run(
        Number(id),
        horario,
        (body.dias_semana || '1,2,3,4,5').trim(),
        numeros,
        (body.mensagem || '').trim(),
      );
    return NextResponse.json({ ok: true, id: Number(result.lastInsertRowid) });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Erro interno';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
