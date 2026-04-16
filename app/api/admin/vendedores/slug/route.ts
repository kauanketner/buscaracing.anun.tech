import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/auth';
import { getDb, generateMecanicoSlug } from '@/lib/db';

export const dynamic = 'force-dynamic';

/** GET — return current vendedor URL slug */
export async function GET(request: NextRequest) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }
  const db = getDb();
  const row = db
    .prepare("SELECT valor FROM configuracoes WHERE chave='vendedor_url_slug'")
    .get() as { valor: string } | undefined;
  return NextResponse.json({ slug: row?.valor || '' });
}

/** POST — rotate slug (invalidates installed PWA) */
export async function POST(request: NextRequest) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }
  const db = getDb();
  const newSlug = generateMecanicoSlug();
  db.prepare(
    "INSERT INTO configuracoes(chave, valor) VALUES('vendedor_url_slug', ?) ON CONFLICT(chave) DO UPDATE SET valor=excluded.valor",
  ).run(newSlug);
  return NextResponse.json({ slug: newSlug });
}
