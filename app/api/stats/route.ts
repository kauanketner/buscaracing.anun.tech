import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/auth';
import { getDb } from '@/lib/db';

export async function GET(request: NextRequest) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  try {
    const db = getDb();
    const total = db.prepare('SELECT COUNT(*) AS c FROM motos').get() as { c: number };
    const ativas = db.prepare('SELECT COUNT(*) AS c FROM motos WHERE ativo=1').get() as { c: number };
    const destaque = db.prepare('SELECT COUNT(*) AS c FROM motos WHERE destaque=1 AND ativo=1').get() as { c: number };
    const por_categoria = db.prepare(
      'SELECT categoria, COUNT(*) AS count FROM motos WHERE ativo=1 GROUP BY categoria ORDER BY count DESC'
    ).all();

    return NextResponse.json({
      total: total.c,
      ativas: ativas.c,
      destaque: destaque.c,
      por_categoria,
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Erro interno';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
