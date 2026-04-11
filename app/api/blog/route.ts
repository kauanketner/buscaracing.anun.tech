import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/auth';
import { getDb } from '@/lib/db';

function generateSlug(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove accents
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/[\s]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export async function GET(request: NextRequest) {
  try {
    const db = getDb();
    const { searchParams } = request.nextUrl;
    const admin = searchParams.get('admin');
    const categoria = searchParams.get('categoria');
    const page = Math.max(1, Number(searchParams.get('page')) || 1);
    const limit = Math.max(1, Math.min(100, Number(searchParams.get('limit')) || 10));
    const offset = (page - 1) * limit;

    // Admin mode: requires auth, returns all posts
    if (admin === '1') {
      if (!isAuthenticated(request)) {
        return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
      }

      let sql = 'SELECT * FROM posts';
      let countSql = 'SELECT COUNT(*) AS total FROM posts';
      const params: unknown[] = [];
      const countParams: unknown[] = [];

      if (categoria) {
        sql += ' WHERE categoria=?';
        countSql += ' WHERE categoria=?';
        params.push(categoria);
        countParams.push(categoria);
      }

      sql += ' ORDER BY id DESC LIMIT ? OFFSET ?';
      params.push(limit, offset);

      const posts = db.prepare(sql).all(...params);
      const totalRow = db.prepare(countSql).get(...countParams) as { total: number };

      return NextResponse.json({
        posts,
        total: totalRow.total,
        page,
        limit,
      });
    }

    // Public mode: only published posts
    let sql = 'SELECT * FROM posts WHERE publicado=1';
    let countSql = 'SELECT COUNT(*) AS total FROM posts WHERE publicado=1';
    const params: unknown[] = [];
    const countParams: unknown[] = [];

    if (categoria) {
      sql += ' AND categoria=?';
      countSql += ' AND categoria=?';
      params.push(categoria);
      countParams.push(categoria);
    }

    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const posts = db.prepare(sql).all(...params);
    const totalRow = db.prepare(countSql).get(...countParams) as { total: number };

    return NextResponse.json({
      posts,
      total: totalRow.total,
      page,
      limit,
    });
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
    const body = await request.json();
    const {
      titulo, resumo, conteudo, imagem_capa, categoria,
      tags, publicado, autor, meta_title, meta_desc,
    } = body;

    // Generate slug from titulo, ensure unique
    let slug = generateSlug(titulo);
    let existing = db.prepare('SELECT id FROM posts WHERE slug=?').get(slug);
    let suffix = 1;
    while (existing) {
      slug = `${generateSlug(titulo)}-${suffix}`;
      existing = db.prepare('SELECT id FROM posts WHERE slug=?').get(slug);
      suffix++;
    }

    const result = db.prepare(
      `INSERT INTO posts(titulo,slug,resumo,conteudo,imagem_capa,categoria,tags,publicado,autor,meta_title,meta_desc)
       VALUES(?,?,?,?,?,?,?,?,?,?,?)`
    ).run(
      titulo,
      slug,
      resumo || '',
      conteudo,
      imagem_capa || null,
      categoria || 'geral',
      tags || '',
      publicado ? 1 : 0,
      autor || 'Busca Racing',
      meta_title || null,
      meta_desc || null,
    );

    return NextResponse.json({ id: result.lastInsertRowid, slug });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Erro interno';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
