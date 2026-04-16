import { NextRequest, NextResponse } from 'next/server';
import { getDb, generateTecnicoSlug } from '@/lib/db';
import { isAuthenticated } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }
  const db = getDb();
  const row = db
    .prepare("SELECT valor FROM configuracoes WHERE chave='tecnico_url_slug'")
    .get() as { valor: string } | undefined;
  return NextResponse.json({ slug: row?.valor || '' });
}

/** POST: rotaciona o slug — invalida o PWA instalado e o link antigo. */
export async function POST(request: NextRequest) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }
  const db = getDb();
  const novo = generateTecnicoSlug();
  db.prepare(
    `INSERT INTO configuracoes(chave, valor) VALUES('tecnico_url_slug', ?)
     ON CONFLICT(chave) DO UPDATE SET valor=excluded.valor`,
  ).run(novo);
  return NextResponse.json({ slug: novo });
}
