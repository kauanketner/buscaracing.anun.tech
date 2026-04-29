import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/auth';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * GET /api/clientes — lista clientes da tabela `clientes`.
 *
 * Query params:
 *   q     — busca por nome / telefone / cpf_cnpj / email
 *   ativo — '1' (default), '0', '' (todos)
 *
 * Retorna cada cliente com agregados de transações:
 *   compras, os, leads, reservas, alugueis, pdv, total_gasto, ultima_interacao
 */
export async function GET(request: NextRequest) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }
  const { searchParams } = request.nextUrl;
  const q = (searchParams.get('q') || '').trim();
  const ativoParam = searchParams.get('ativo');
  const ativo = ativoParam == null ? '1' : ativoParam;

  const db = getDb();

  let sql = `
    SELECT c.*,
      (SELECT COUNT(*) FROM vendas v WHERE v.cliente_id = c.id) AS compras,
      (SELECT COUNT(*) FROM oficina_ordens o WHERE o.cliente_id = c.id) AS os,
      (SELECT COUNT(*) FROM leads l WHERE l.cliente_id = c.id) AS leads,
      (SELECT COUNT(*) FROM reservas r WHERE r.cliente_id = c.id) AS reservas,
      (SELECT COUNT(*) FROM alugueis a WHERE a.cliente_id = c.id) AS alugueis,
      (SELECT COUNT(*) FROM pdv_vendas pv WHERE pv.cliente_id = c.id AND pv.status = 'concluida') AS pdv,
      (
        COALESCE((SELECT SUM(v.valor_venda) FROM vendas v WHERE v.cliente_id = c.id), 0)
        + COALESCE((SELECT SUM(pv.valor_total) FROM pdv_vendas pv WHERE pv.cliente_id = c.id AND pv.status = 'concluida'), 0)
      ) AS total_gasto,
      (
        SELECT MAX(d) FROM (
          SELECT v.data_venda AS d FROM vendas v WHERE v.cliente_id = c.id
          UNION ALL
          SELECT o.data_entrada FROM oficina_ordens o WHERE o.cliente_id = c.id
          UNION ALL
          SELECT pv.data_venda FROM pdv_vendas pv WHERE pv.cliente_id = c.id
          UNION ALL
          SELECT r.data_inicio FROM reservas r WHERE r.cliente_id = c.id
          UNION ALL
          SELECT a.created_at FROM alugueis a WHERE a.cliente_id = c.id
          UNION ALL
          SELECT l.created_at FROM leads l WHERE l.cliente_id = c.id
        )
      ) AS ultima_interacao
    FROM clientes c
    WHERE 1=1
  `;
  const params: unknown[] = [];
  if (ativo === '1') sql += ' AND c.ativo = 1';
  else if (ativo === '0') sql += ' AND c.ativo = 0';
  if (q) {
    const t = `%${q}%`;
    sql += ' AND (c.nome LIKE ? OR c.telefone LIKE ? OR c.cpf_cnpj LIKE ? OR c.email LIKE ?)';
    params.push(t, t, t, t);
  }
  sql += ' ORDER BY ultima_interacao DESC NULLS LAST, c.nome ASC';

  const rows = db.prepare(sql).all(...params);
  return NextResponse.json(rows);
}

/** POST /api/clientes — cria cliente */
export async function POST(request: NextRequest) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }
  try {
    const db = getDb();
    const body = (await request.json()) as {
      nome: string;
      telefone?: string;
      email?: string;
      cpf_cnpj?: string;
      endereco?: string;
      observacoes?: string;
    };
    const nome = (body.nome || '').trim();
    if (!nome) {
      return NextResponse.json({ error: 'Nome obrigatório' }, { status: 400 });
    }
    const result = db
      .prepare(
        `INSERT INTO clientes (nome, telefone, email, cpf_cnpj, endereco, observacoes)
         VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .run(
        nome,
        (body.telefone || '').trim(),
        (body.email || '').trim(),
        (body.cpf_cnpj || '').trim(),
        (body.endereco || '').trim(),
        (body.observacoes || '').trim(),
      );
    return NextResponse.json({ ok: true, id: Number(result.lastInsertRowid) });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Erro interno';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
