import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ motoId: string }> };

export async function GET(_request: NextRequest, ctx: Ctx) {
  try {
    const { motoId } = await ctx.params;
    const db = getDb();
    const rows = db
      .prepare(
        `SELECT data_inicio, data_fim FROM alugueis
         WHERE moto_id=? AND status IN ('aprovada','ativa')`,
      )
      .all(Number(motoId)) as { data_inicio: string; data_fim: string }[];

    const bloqueadas = new Set<string>();
    for (const r of rows) {
      const start = new Date(r.data_inicio + 'T12:00:00');
      const end = new Date(r.data_fim + 'T12:00:00');
      const cur = new Date(start);
      while (cur <= end) {
        bloqueadas.add(cur.toISOString().slice(0, 10));
        cur.setDate(cur.getDate() + 1);
      }
    }
    return NextResponse.json({ bloqueadas: Array.from(bloqueadas).sort() });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Erro interno';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
