import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { enviarLembreteChecklist } from '@/lib/wts-chat';

export const dynamic = 'force-dynamic';

const DIAS_MAP: Record<number, string> = {
  0: '0', // domingo
  1: '1', // segunda
  2: '2', // terca
  3: '3', // quarta
  4: '4', // quinta
  5: '5', // sexta
  6: '6', // sabado
};

/**
 * GET /api/cron/checklists — triggered by external cron every minute.
 * Checks for active schedules that match current time + day, and haven't
 * been sent today yet. Sends WhatsApp reminders.
 *
 * Security: requires CRON_SECRET header or query param.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET || 'dev-cron-secret';
  const provided =
    request.headers.get('x-cron-secret') ||
    request.nextUrl.searchParams.get('secret') ||
    '';
  if (provided !== secret) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const db = getDb();

  // Usa sempre America/Sao_Paulo (BRT) pra comparar com agendamentos cadastrados
  // pelo admin (que pensa no horário local do Brasil).
  const TZ = 'America/Sao_Paulo';
  const fmtHour = new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hour12: false });
  const fmtDay = new Intl.DateTimeFormat('en-GB', { timeZone: TZ, weekday: 'short' });
  const fmtDate = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' });

  const now = new Date();
  // fmtHour produces e.g. "10:06"
  const currentTime = fmtHour.format(now);
  // Map weekday short name to 0-6 (Sun-Sat)
  const weekdayShort = fmtDay.format(now).toLowerCase();
  const weekdayMap: Record<string, string> = { sun: '0', mon: '1', tue: '2', wed: '3', thu: '4', fri: '5', sat: '6' };
  const currentDay = weekdayMap[weekdayShort] || DIAS_MAP[now.getDay()];
  // fmtDate produces "YYYY-MM-DD" in BRT
  const today = fmtDate.format(now);

  // Find schedules due now
  const agendamentos = db
    .prepare(
      `SELECT a.*, c.titulo, c.token
       FROM checklist_agendamentos a
       JOIN checklists c ON a.checklist_id = c.id
       WHERE a.ativo = 1
         AND c.ativo = 1
         AND a.horario = ?
         AND (a.ultimo_envio IS NULL OR a.ultimo_envio < ?)`,
    )
    .all(currentTime, today) as {
      id: number;
      checklist_id: number;
      horario: string;
      dias_semana: string;
      numeros: string;
      mensagem: string;
      titulo: string;
      token: string;
    }[];

  let totalEnviados = 0;
  let totalFalhas = 0;

  for (const ag of agendamentos) {
    // Check day of week
    const dias = ag.dias_semana.split(',').map((d) => d.trim());
    if (!dias.includes(currentDay)) continue;

    // Build link
    const origin = process.env.NEXT_PUBLIC_URL || process.env.VERCEL_URL || 'https://buscaracing.com';
    const link = `${origin}/checklist/${ag.token}`;
    const numeros = ag.numeros.split(',').map((n) => n.trim()).filter(Boolean);

    const result = await enviarLembreteChecklist(numeros, ag.titulo, link, ag.mensagem || undefined);
    totalEnviados += result.enviados;
    totalFalhas += result.falhas;

    // Mark as sent today
    db.prepare('UPDATE checklist_agendamentos SET ultimo_envio=? WHERE id=?')
      .run(today, ag.id);
  }

  return NextResponse.json({
    ok: true,
    time: currentTime,
    day: currentDay,
    checked: agendamentos.length,
    enviados: totalEnviados,
    falhas: totalFalhas,
  });
}
