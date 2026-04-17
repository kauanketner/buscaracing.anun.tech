import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { enviarLembreteChecklist } from '@/lib/wts-chat';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ agendId: string }> };

/** POST /api/checklists/agendamentos/[agendId]/enviar-agora
 *  Dispara o envio imediatamente, sem esperar horário — para testes.
 */
export async function POST(request: NextRequest, context: RouteContext) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }
  try {
    const { agendId } = await context.params;
    const db = getDb();
    const ag = db
      .prepare(
        `SELECT a.*, c.titulo, c.token
         FROM checklist_agendamentos a
         JOIN checklists c ON a.checklist_id = c.id
         WHERE a.id = ?`,
      )
      .get(Number(agendId)) as
      | { id: number; numeros: string; mensagem: string; titulo: string; token: string }
      | undefined;
    if (!ag) {
      return NextResponse.json({ error: 'Agendamento não encontrado' }, { status: 404 });
    }

    const origin = process.env.NEXT_PUBLIC_URL || 'https://buscaracing.com';
    const link = `${origin}/checklist/${ag.token}`;
    const numeros = ag.numeros.split(',').map((n) => n.trim()).filter(Boolean);

    const result = await enviarLembreteChecklist(numeros, ag.titulo, link, ag.mensagem || undefined);
    return NextResponse.json({
      ok: true,
      enviados: result.enviados,
      falhas: result.falhas,
      total: numeros.length,
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Erro interno';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
