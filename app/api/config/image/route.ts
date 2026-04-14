import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/auth';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';
import { saveFile, UPLOADS_DIR } from '@/lib/upload';

const ALLOWED_IMG_KEYS = [
  'hero_img', 'cat_rua_img', 'cat_offroad_img', 'cat_quad_img', 'cat_infantil_img',
];

export async function POST(request: NextRequest) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  try {
    const db = getDb();
    const formData = await request.formData();
    const chave = formData.get('chave') as string;
    const file = formData.get('file') as File | null;

    if (!ALLOWED_IMG_KEYS.includes(chave)) {
      return NextResponse.json({ error: 'Chave inválida' }, { status: 400 });
    }

    if (!file || file.size === 0) {
      return NextResponse.json({ error: 'Nenhum arquivo enviado' }, { status: 400 });
    }

    const url = await saveFile(file, UPLOADS_DIR);
    db.prepare('UPDATE configuracoes SET valor=? WHERE chave=?').run(url, chave);

    return NextResponse.json({ chave, url });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Erro interno';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
