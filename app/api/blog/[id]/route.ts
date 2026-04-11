import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/auth';
import { getDb } from '@/lib/db';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const db = getDb();

    // Try by numeric id first, then by slug
    const numId = Number(id);
    let post;
    if (!isNaN(numId) && String(numId) === id) {
      post = db.prepare('SELECT * FROM posts WHERE id=?').get(numId);
    }
    if (!post) {
      post = db.prepare('SELECT * FROM posts WHERE slug=?').get(id);
    }

    if (!post) {
      return NextResponse.json({ error: 'Post não encontrado' }, { status: 404 });
    }
    return NextResponse.json(post);
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
    const body = await request.json();
    const {
      titulo, resumo, conteudo, imagem_capa, categoria,
      tags, publicado, autor, meta_title, meta_desc, slug,
    } = body;

    const existing = db.prepare('SELECT * FROM posts WHERE id=?').get(Number(id));
    if (!existing) {
      return NextResponse.json({ error: 'Post não encontrado' }, { status: 404 });
    }

    db.prepare(
      `UPDATE posts SET titulo=?,slug=?,resumo=?,conteudo=?,imagem_capa=?,categoria=?,
        tags=?,publicado=?,autor=?,meta_title=?,meta_desc=?,updated_at=datetime('now','localtime')
       WHERE id=?`
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
      Number(id),
    );

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
    db.prepare('DELETE FROM posts WHERE id=?').run(Number(id));
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Erro interno';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
