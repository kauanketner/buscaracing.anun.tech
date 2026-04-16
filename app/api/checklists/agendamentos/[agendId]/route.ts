import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/auth';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ agendId: string }> };

/** PUT — update schedule */
export async function PUT(request: NextRequest, context: RouteContext) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }
  const { agendId } = await context.params;
  const db = getDb();
  const body = (await request.json()) as {
    horario?: string;
    dias_semana?: string;
    numeros?: string;
    mensagem?: string;
    ativo?: boolean;
  };
  const sets: string[] = [];
  const vals: unknown[] = [];
  if (body.horario !== undefined) { sets.push('horario=?'); vals.push(body.horario); }
  if (body.dias_semana !== undefined) { sets.push('dias_semana=?'); vals.push(body.dias_semana); }
  if (body.numeros !== undefined) { sets.push('numeros=?'); vals.push(body.numeros); }
  if (body.mensagem !== undefined) { sets.push('mensagem=?'); vals.push(body.mensagem); }
  if (body.ativo !== undefined) { sets.push('ativo=?'); vals.push(body.ativo ? 1 : 0); }
  if (sets.length === 0) return NextResponse.json({ ok: true });
  vals.push(Number(agendId));
  db.prepare(`UPDATE checklist_agendamentos SET ${sets.join(', ')} WHERE id=?`).run(...vals);
  return NextResponse.json({ ok: true });
}

/** DELETE — remove schedule */
export async function DELETE(request: NextRequest, context: RouteContext) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }
  const { agendId } = await context.params;
  const db = getDb();
  db.prepare('DELETE FROM checklist_agendamentos WHERE id=?').run(Number(agendId));
  return NextResponse.json({ ok: true });
}
