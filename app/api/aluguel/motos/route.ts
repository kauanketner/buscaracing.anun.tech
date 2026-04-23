import { NextRequest, NextResponse } from 'next/server';
import { getDb, stripAdminFields } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(_request: NextRequest) {
  try {
    const db = getDb();
    const rows = db
      .prepare(
        `SELECT * FROM motos WHERE disponivel_aluguel=1 AND valor_diaria IS NOT NULL
         AND estado NOT IN ('entregue', 'retirada')
         ORDER BY destaque DESC, id DESC`,
      )
      .all() as Record<string, unknown>[];
    return NextResponse.json(rows.map((r) => stripAdminFields(r)));
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Erro interno';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
