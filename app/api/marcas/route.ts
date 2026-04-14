import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const db = getDb();
    const rows = db.prepare(
      'SELECT DISTINCT marca FROM motos WHERE ativo=1 ORDER BY marca'
    ).all() as { marca: string }[];
    return NextResponse.json(rows.map(r => r.marca));
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Erro interno';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
