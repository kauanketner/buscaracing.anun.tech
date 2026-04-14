import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/auth';
import { getDb, stripAdminFields } from '@/lib/db';
import { parseMotoForm, MOTO_UPSERT_COLUMNS } from '@/lib/motos';

export const dynamic = 'force-dynamic';
import { saveFile, UPLOADS_DIR } from '@/lib/upload';

export async function GET(request: NextRequest) {
  try {
    const db = getDb();
    const { searchParams } = request.nextUrl;
    const categoria = searchParams.get('categoria');
    const marca = searchParams.get('marca');
    const condicao = searchParams.get('condicao');
    const destaque = searchParams.get('destaque');
    const q = searchParams.get('q');

    let sql = 'SELECT * FROM motos WHERE ativo=1';
    const params: unknown[] = [];

    if (categoria) { sql += ' AND categoria=?'; params.push(categoria); }
    if (marca) { sql += ' AND marca=?'; params.push(marca); }
    if (condicao) { sql += ' AND condicao=?'; params.push(condicao); }
    if (destaque) { sql += ' AND destaque=1'; }
    if (q) {
      const t = `%${q}%`;
      sql += ' AND (nome LIKE ? OR marca LIKE ? OR descricao LIKE ?)';
      params.push(t, t, t);
    }

    sql += ' ORDER BY destaque DESC, id DESC';
    const rows = db.prepare(sql).all(...params) as Record<string, unknown>[];
    // Remove colunas internas (placa, chassi, valor_compra, etc.) antes de retornar
    const safe = rows.map((r) => stripAdminFields(r));
    return NextResponse.json(safe);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Erro interno';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  try {
    const db = getDb();
    const formData = await request.formData();
    const fields = parseMotoForm(formData);

    let imagem: string | null = null;
    const file = formData.get('imagem') as File | null;
    if (file && file.size > 0) {
      imagem = await saveFile(file, UPLOADS_DIR);
    }

    const cols = [...MOTO_UPSERT_COLUMNS, 'imagem'];
    const placeholders = cols.map(() => '?').join(',');
    const values = cols.map((c) => (c === 'imagem' ? imagem : (fields as Record<string, unknown>)[c]));

    const result = db
      .prepare(`INSERT INTO motos(${cols.join(',')}) VALUES(${placeholders})`)
      .run(...values);

    return NextResponse.json({ id: result.lastInsertRowid });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Erro interno';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
