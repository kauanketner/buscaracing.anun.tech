import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { saveFile, UPLOADS_DIR } from '@/lib/upload';

export const dynamic = 'force-dynamic';

const MAX_COMPROVANTES = 10;

type Ctx = { params: Promise<{ id: string }> };

/** GET /api/reservas/[id]/comprovantes — lista comprovantes de uma reserva */
export async function GET(request: NextRequest, ctx: Ctx) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }
  const { id } = await ctx.params;
  const db = getDb();
  const rows = db
    .prepare(
      'SELECT * FROM reserva_comprovantes WHERE reserva_id = ? ORDER BY id ASC',
    )
    .all(Number(id));
  return NextResponse.json(rows);
}

/** POST /api/reservas/[id]/comprovantes — upload 1 arquivo + descricao opcional */
export async function POST(request: NextRequest, ctx: Ctx) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }
  try {
    const { id } = await ctx.params;
    const reservaId = Number(id);
    const db = getDb();

    const reserva = db.prepare('SELECT id FROM reservas WHERE id = ?').get(reservaId);
    if (!reserva) return NextResponse.json({ error: 'Reserva não encontrada' }, { status: 404 });

    const count = (db
      .prepare('SELECT COUNT(*) AS c FROM reserva_comprovantes WHERE reserva_id = ?')
      .get(reservaId) as { c: number }).c;
    if (count >= MAX_COMPROVANTES) {
      return NextResponse.json(
        { error: `Limite de ${MAX_COMPROVANTES} comprovantes atingido` },
        { status: 400 },
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const descricao = (formData.get('descricao') as string | null) || '';

    if (!file || file.size === 0) {
      return NextResponse.json({ error: 'Arquivo obrigatório' }, { status: 400 });
    }
    const mimeOk = file.type.startsWith('image/') || file.type === 'application/pdf';
    if (!mimeOk) {
      return NextResponse.json(
        { error: 'Formato não aceito. Envie imagem ou PDF.' },
        { status: 400 },
      );
    }

    const url = await saveFile(file, UPLOADS_DIR);

    const result = db
      .prepare(
        `INSERT INTO reserva_comprovantes (reserva_id, url, nome_arquivo, tipo_mime, descricao)
         VALUES (?, ?, ?, ?, ?)`,
      )
      .run(reservaId, url, file.name || '', file.type || '', descricao.trim());

    return NextResponse.json({
      ok: true,
      id: Number(result.lastInsertRowid),
      url,
      nome_arquivo: file.name,
      tipo_mime: file.type,
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Erro interno';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
