import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { saveFile, FOTOS_DIR } from '@/lib/upload';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const db = getDb();
    const rows = db.prepare(
      'SELECT * FROM fotos WHERE moto_id=? ORDER BY ordem ASC, id ASC'
    ).all(Number(id)) as Array<Record<string, unknown>>;

    const result = rows.map(r => ({ ...r, url: `/fotos/${r.filename}` }));
    return NextResponse.json(result);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Erro interno';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  try {
    const { id } = await context.params;
    const motoId = Number(id);
    const db = getDb();

    const moto = db.prepare('SELECT id FROM motos WHERE id=?').get(motoId);
    if (!moto) {
      return NextResponse.json({ error: 'Moto não encontrada' }, { status: 404 });
    }

    const formData = await request.formData();
    const files = formData.getAll('fotos') as File[];

    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'Nenhuma foto enviada' }, { status: 400 });
    }

    // Get max current order
    const maxRow = db.prepare(
      'SELECT COALESCE(MAX(ordem),0) AS m FROM fotos WHERE moto_id=?'
    ).get(motoId) as { m: number } | undefined;
    let ordem = (maxRow?.m || 0) + 1;

    const inseridas: Array<{ id: number | bigint; url: string; filename: string }> = [];

    for (const file of files) {
      if (file.size === 0) continue;
      const url = await saveFile(file, FOTOS_DIR);
      const filename = url.split('/').pop()!;
      const result = db.prepare(
        'INSERT INTO fotos(moto_id, filename, ordem) VALUES(?,?,?)'
      ).run(motoId, filename, ordem++);
      inseridas.push({ id: result.lastInsertRowid, url, filename });
    }

    return NextResponse.json({ ok: true, fotos: inseridas });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Erro interno';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
