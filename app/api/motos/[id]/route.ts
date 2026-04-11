import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { saveFile, UPLOADS_DIR } from '@/lib/upload';
import fs from 'fs';
import path from 'path';
import { FOTOS_DIR } from '@/lib/upload';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const db = getDb();
    const moto = db.prepare('SELECT * FROM motos WHERE id=?').get(Number(id));
    if (!moto) {
      return NextResponse.json({ error: 'Não encontrada' }, { status: 404 });
    }
    return NextResponse.json(moto);
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
    const nome = formData.get('nome') as string;
    const marca = formData.get('marca') as string;
    const categoria = (formData.get('categoria') as string) || 'outros';
    const condicao = (formData.get('condicao') as string) || 'nova';
    const preco = formData.get('preco') ? Number(formData.get('preco')) : null;
    const preco_original = formData.get('preco_original') ? Number(formData.get('preco_original')) : null;
    const descricao = (formData.get('descricao') as string) || '';
    const destaque = formData.get('destaque') ? 1 : 0;
    const ativoVal = formData.get('ativo');
    const ativo = ativoVal === '0' ? 0 : 1;
    const ano = formData.get('ano') ? Number(formData.get('ano')) : null;
    const km = formData.get('km') ? Number(formData.get('km')) : null;
    const imagem_atual = formData.get('imagem_atual') as string | null;

    let imagem: string | null;
    const file = formData.get('imagem') as File | null;
    if (file && file.size > 0) {
      imagem = await saveFile(file, UPLOADS_DIR);
    } else if (imagem_atual !== null && imagem_atual !== undefined) {
      imagem = imagem_atual;
    } else {
      imagem = old.imagem as string | null;
    }

    db.prepare(
      `UPDATE motos SET nome=?,marca=?,categoria=?,condicao=?,preco=?,preco_original=?,
        descricao=?,imagem=?,destaque=?,ativo=?,ano=?,km=? WHERE id=?`
    ).run(nome, marca, categoria, condicao, preco, preco_original, descricao, imagem, destaque, ativo, ano, km, Number(id));

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
