import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/auth';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

/** GET /api/categorias?tipo=moto|peca — lista categorias (público) */
export async function GET(request: NextRequest) {
  const db = getDb();
  const { searchParams } = request.nextUrl;
  const tipo = searchParams.get('tipo');
  let sql = 'SELECT * FROM categorias WHERE ativo=1';
  const params: unknown[] = [];
  if (tipo) {
    sql += ' AND tipo=?';
    params.push(tipo);
  }
  sql += ' ORDER BY ordem ASC, label ASC';
  const rows = db.prepare(sql).all(...params);
  return NextResponse.json(rows);
}

/** POST /api/categorias — cria nova categoria (admin) */
export async function POST(request: NextRequest) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }
  try {
    const db = getDb();
    const body = (await request.json()) as {
      tipo: 'moto' | 'peca';
      label: string;
      slug?: string;
      descricao?: string;
      ordem?: number;
    };
    if (body.tipo !== 'moto' && body.tipo !== 'peca') {
      return NextResponse.json({ error: 'tipo inválido' }, { status: 400 });
    }
    const label = (body.label || '').trim();
    if (!label) return NextResponse.json({ error: 'Nome obrigatório' }, { status: 400 });

    const slug = (body.slug || label)
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    const existing = db.prepare('SELECT id FROM categorias WHERE tipo=? AND slug=?').get(body.tipo, slug);
    if (existing) return NextResponse.json({ error: 'Já existe categoria com esse nome' }, { status: 409 });

    const result = db
      .prepare(
        'INSERT INTO categorias (tipo, slug, label, descricao, ordem) VALUES (?, ?, ?, ?, ?)',
      )
      .run(body.tipo, slug, label, (body.descricao || '').trim(), body.ordem ?? 10);
    return NextResponse.json({ ok: true, id: Number(result.lastInsertRowid), slug });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Erro interno';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
