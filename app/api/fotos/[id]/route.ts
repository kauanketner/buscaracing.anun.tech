import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/auth';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';
import { FOTOS_DIR } from '@/lib/upload';
import fs from 'fs';
import path from 'path';

type RouteContext = { params: Promise<{ id: string }> };

export async function PUT(request: NextRequest, context: RouteContext) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  try {
    const { id } = await context.params;
    const db = getDb();
    const body = await request.json();

    db.prepare('UPDATE fotos SET ordem=? WHERE id=?').run(body.ordem, Number(id));
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Erro interno';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  try {
    const { id } = await context.params;
    const db = getDb();

    const foto = db.prepare('SELECT * FROM fotos WHERE id=?').get(Number(id)) as { filename: string } | undefined;
    if (!foto) {
      return NextResponse.json({ error: 'Foto não encontrada' }, { status: 404 });
    }

    const fp = path.join(FOTOS_DIR, foto.filename);
    if (fs.existsSync(fp)) fs.unlinkSync(fp);

    db.prepare('DELETE FROM fotos WHERE id=?').run(Number(id));
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Erro interno';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
