import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/auth';
import { getDb } from '@/lib/db';
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
    const rows = db.prepare(sql).all(...params);
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

    let imagem: string | null = null;
    const file = formData.get('imagem') as File | null;
    if (file && file.size > 0) {
      imagem = await saveFile(file, UPLOADS_DIR);
    }

    const result = db.prepare(
      `INSERT INTO motos(nome,marca,categoria,condicao,preco,preco_original,descricao,imagem,destaque,ativo,ano,km)
       VALUES(?,?,?,?,?,?,?,?,?,?,?,?)`
    ).run(nome, marca, categoria, condicao, preco, preco_original, descricao, imagem, destaque, ativo, ano, km);

    return NextResponse.json({ id: result.lastInsertRowid });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Erro interno';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
