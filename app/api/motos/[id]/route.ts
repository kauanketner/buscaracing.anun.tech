import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/auth';
import { getDb, stripAdminFields } from '@/lib/db';
import { parseMotoForm, MOTO_UPSERT_COLUMNS } from '@/lib/motos';

export const dynamic = 'force-dynamic';
import { saveFile, UPLOADS_DIR } from '@/lib/upload';
import fs from 'fs';
import path from 'path';
import { FOTOS_DIR } from '@/lib/upload';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const db = getDb();
    const moto = db.prepare('SELECT * FROM motos WHERE id=?').get(Number(id)) as
      | Record<string, unknown>
      | undefined;
    if (!moto) {
      return NextResponse.json({ error: 'Não encontrada' }, { status: 404 });
    }
    // Admin autenticado recebe tudo; público recebe apenas colunas não-sensíveis.
    const payload = isAuthenticated(request) ? moto : stripAdminFields(moto);
    return NextResponse.json(payload);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Erro interno';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, context: RouteContext) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  try {
    const { id } = await context.params;
    const db = getDb();
    const old = db.prepare('SELECT * FROM motos WHERE id=?').get(Number(id)) as Record<string, unknown> | undefined;
    if (!old) {
      return NextResponse.json({ error: 'Não encontrada' }, { status: 404 });
    }

    const formData = await request.formData();
    const fields = parseMotoForm(formData);
    const imagem_atual = formData.get('imagem_atual') as string | null;

    let imagem: string | null;
    const file = formData.get('imagem') as File | null;
    if (file && file.size > 0) {
      imagem = await saveFile(file, UPLOADS_DIR);
    } else if (imagem_atual !== null && imagem_atual !== undefined) {
      imagem = imagem_atual;
    } else {
      imagem = (old.imagem as string | null) ?? null;
    }

    const cols = [...MOTO_UPSERT_COLUMNS, 'imagem'];
    const setClause = cols.map((c) => `${c}=?`).join(',');
    const values = cols.map((c) => (c === 'imagem' ? imagem : (fields as Record<string, unknown>)[c]));

    db.prepare(`UPDATE motos SET ${setClause} WHERE id=?`).run(...values, Number(id));

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

    // Delete photo files from disk
    const fotos = db.prepare('SELECT filename FROM fotos WHERE moto_id=?').all(Number(id)) as { filename: string }[];
    for (const f of fotos) {
      const fp = path.join(FOTOS_DIR, f.filename);
      if (fs.existsSync(fp)) fs.unlinkSync(fp);
    }

    db.prepare('DELETE FROM motos WHERE id=?').run(Number(id));
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Erro interno';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
