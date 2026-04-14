import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { saveFile, UPLOADS_DIR } from '@/lib/upload';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const db = getDb();
    const row = db.prepare("SELECT valor FROM configuracoes WHERE chave='logo'").get() as { valor: string } | undefined;
    return NextResponse.json({ logo: row?.valor || '' });
  } catch {
    return NextResponse.json({ logo: '' });
  }
}

export async function POST(request: NextRequest) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  try {
    const db = getDb();
    const formData = await request.formData();
    const file = formData.get('logo') as File | null;

    if (!file || file.size === 0) {
      return NextResponse.json({ error: 'Nenhum arquivo enviado' }, { status: 400 });
    }

    const logoPath = await saveFile(file, UPLOADS_DIR);
    db.prepare("UPDATE configuracoes SET valor=? WHERE chave='logo'").run(logoPath);

    return NextResponse.json({ logo: logoPath });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Erro interno';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
