import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/auth';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

/** GET /api/servicos — lista; admin vê inativos também */
export async function GET(request: NextRequest) {
  try {
    const db = getDb();
    const { searchParams } = request.nextUrl;
    const categoria = searchParams.get('categoria');
    const q = searchParams.get('q');
    const includeInactive = isAuthenticated(request);

    let sql = 'SELECT * FROM servicos WHERE 1=1';
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
      sql += ' AND (nome LIKE ? OR descricao LIKE ? OR codigo LIKE ?)';
      params.push(t, t, t);
    }
    sql += ' ORDER BY nome ASC, id DESC';

    const rows = db.prepare(sql).all(...params);
    return NextResponse.json(rows);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Erro interno';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/** POST /api/servicos — admin cria serviço */
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
      codigo?: string;
      ativo?: boolean;
    };
    const nome = (body.nome || '').trim();
    if (!nome) return NextResponse.json({ error: 'Nome obrigatório' }, { status: 400 });

    const result = db
      .prepare(
        `INSERT INTO servicos (nome, categoria, descricao, preco, codigo, ativo)
         VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .run(
        nome,
        (body.categoria || 'outros').trim(),
        (body.descricao || '').trim(),
        body.preco ?? null,
        (body.codigo || '').trim(),
        body.ativo === false ? 0 : 1,
      );
    return NextResponse.json({ ok: true, id: Number(result.lastInsertRowid) });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Erro interno';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
