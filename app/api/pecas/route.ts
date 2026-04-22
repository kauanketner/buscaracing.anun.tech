import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/auth';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

/** GET /api/pecas — lista pública; admin vê inativas também (via header de auth) */
export async function GET(request: NextRequest) {
  try {
    const db = getDb();
    const { searchParams } = request.nextUrl;
    const categoria = searchParams.get('categoria');
    const q = searchParams.get('q');
    const includeInactive = isAuthenticated(request);

    let sql = 'SELECT * FROM pecas WHERE 1=1';
    const params: unknown[] = [];
    if (!includeInactive) {
      sql += ' AND ativo=1';
    }
    if (categoria) {
      sql += ' AND categoria=?';
      params.push(categoria);
    }
    if (q) {
      const t = `%${q}%`;
      sql += ' AND (nome LIKE ? OR descricao LIKE ? OR codigo LIKE ? OR modelo_compat LIKE ?)';
      params.push(t, t, t, t);
    }
    sql += ' ORDER BY destaque DESC, id DESC';

    const rows = db.prepare(sql).all(...params);
    return NextResponse.json(rows);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Erro interno';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/** POST /api/pecas — admin cria peça */
export async function POST(request: NextRequest) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }
  try {
    const db = getDb();
    const body = (await request.json()) as {
      nome: string;
      categoria?: string;
      descricao?: string;
      preco?: number | null;
      preco_original?: number | null;
      imagem?: string | null;
      marca_moto?: string;
      modelo_compat?: string;
      codigo?: string;
      destaque?: boolean;
      ativo?: boolean;
    };
    const nome = (body.nome || '').trim();
    if (!nome) return NextResponse.json({ error: 'Nome obrigatório' }, { status: 400 });

    const result = db
      .prepare(
        `INSERT INTO pecas
          (nome, categoria, descricao, preco, preco_original, imagem,
           marca_moto, modelo_compat, codigo, destaque, ativo)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        nome,
        (body.categoria || 'outros').trim(),
        (body.descricao || '').trim(),
        body.preco ?? null,
        body.preco_original ?? null,
        (body.imagem || '').trim(),
        (body.marca_moto || '').trim(),
        (body.modelo_compat || '').trim(),
        (body.codigo || '').trim(),
        body.destaque ? 1 : 0,
        body.ativo === false ? 0 : 1,
      );
    return NextResponse.json({ ok: true, id: Number(result.lastInsertRowid) });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Erro interno';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
