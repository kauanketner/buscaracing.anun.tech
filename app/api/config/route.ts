import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/auth';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  try {
    const db = getDb();
    const rows = db.prepare('SELECT chave, valor FROM configuracoes').all() as { chave: string; valor: string }[];
    const config = Object.fromEntries(rows.map(r => [r.chave, r.valor]));
    return NextResponse.json(config);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Erro interno';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  try {
    const db = getDb();
    const body = await request.json();

    const stmt = db.prepare('INSERT OR REPLACE INTO configuracoes(chave, valor) VALUES(?, ?)');
    for (const [k, v] of Object.entries(body)) {
      stmt.run(k, v);
    }

    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Erro interno';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
