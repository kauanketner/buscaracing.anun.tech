import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/auth';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }
  try {
    const db = getDb();
    const rows = db
      .prepare('SELECT * FROM vendedores ORDER BY ativo DESC, nome ASC')
      .all();
    return NextResponse.json(rows);
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
    const body = (await request.json()) as {
      nome?: string;
      telefone?: string;
      email?: string;
    };
    const nome = (body.nome || '').trim();
    if (!nome) {
      return NextResponse.json({ error: 'Nome é obrigatório' }, { status: 400 });
    }
    const result = db
      .prepare(
        'INSERT INTO vendedores(nome, telefone, email, ativo) VALUES(?,?,?,1)'
      )
      .run(nome, (body.telefone || '').trim(), (body.email || '').trim());
    return NextResponse.json({ id: result.lastInsertRowid });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Erro interno';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
