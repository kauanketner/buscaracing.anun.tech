import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/auth';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

type ItemInput = {
  peca_id: number;
  quantidade: number;
  preco_unitario: number;
};

/**
 * GET /api/pdv — lista vendas PDV com filtros opcionais.
 * Query: from, to, canal, vendedor_id, status
 */
export async function GET(request: NextRequest) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }
  const { searchParams } = request.nextUrl;
  const from = searchParams.get('from') || '';
  const to = searchParams.get('to') || '';
  const canal = searchParams.get('canal') || '';
  const vendedorId = searchParams.get('vendedor_id') || '';
  const status = searchParams.get('status') || '';

  const db = getDb();
  let sql = `
    SELECT v.*, ve.nome AS vendedor_nome,
           (SELECT COUNT(*) FROM pdv_itens i WHERE i.pdv_venda_id = v.id) AS itens_count
    FROM pdv_vendas v
    LEFT JOIN vendedores ve ON v.vendedor_id = ve.id
    WHERE 1=1
  `;
  const params: unknown[] = [];
  if (from && to) { sql += ' AND v.data_venda BETWEEN ? AND ?'; params.push(from, to); }
  else if (from) { sql += ' AND v.data_venda >= ?'; params.push(from); }
  if (canal) { sql += ' AND v.canal = ?'; params.push(canal); }
  if (vendedorId) { sql += ' AND v.vendedor_id = ?'; params.push(Number(vendedorId)); }
  if (status) { sql += ' AND v.status = ?'; params.push(status); }
  sql += ' ORDER BY v.id DESC';

  const rows = db.prepare(sql).all(...params);
  return NextResponse.json(rows);
}

/**
 * POST /api/pdv — registra uma venda PDV.
 *
 * Transação atômica:
 *  1. Valida estoque de todos os itens (aborta se algum < quantidade)
 *  2. Cria venda
 *  3. Cria itens (snapshot de nome/preço)
 *  4. Baixa estoque de cada peça + cria movimentação 'saida' ref_tipo='pdv'
 *  5. Cria lançamento financeiro (entrada / venda_peca / ref_tipo='pdv')
 */
export async function POST(request: NextRequest) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  try {
    const db = getDb();
    const body = (await request.json()) as {
      cliente_nome: string;
      cliente_tel?: string;
      cliente_cpf?: string;
      cliente_email?: string;
      vendedor_id?: number | null;
      canal?: string;
      forma_pagamento?: string;
      parcelas?: number;
      desconto?: number;
      observacoes?: string;
      itens: ItemInput[];
    };

    const clienteNome = (body.cliente_nome || '').trim();
    if (!clienteNome) {
      return NextResponse.json({ error: 'Nome do cliente obrigatório' }, { status: 400 });
    }
    if (!body.vendedor_id) {
      return NextResponse.json({ error: 'Vendedor obrigatório' }, { status: 400 });
    }
    if (!Array.isArray(body.itens) || body.itens.length === 0) {
      return NextResponse.json({ error: 'Adicione pelo menos 1 item' }, { status: 400 });
    }

    // Normaliza itens
    const itens = body.itens.map((i) => ({
      peca_id: Number(i.peca_id),
      quantidade: Math.max(1, Math.floor(Number(i.quantidade) || 1)),
      preco_unitario: Math.max(0, Number(i.preco_unitario) || 0),
    }));

    // Pré-validação de estoque (fora da transaction pra erro mais legível)
    const pecasMap = new Map<number, { id: number; nome: string; codigo: string; estoque_qtd: number | null }>();
    for (const it of itens) {
      const p = db
        .prepare('SELECT id, nome, codigo, estoque_qtd FROM pecas WHERE id = ?')
        .get(it.peca_id) as { id: number; nome: string; codigo: string; estoque_qtd: number | null } | undefined;
      if (!p) {
        return NextResponse.json({ error: `Peça #${it.peca_id} não encontrada` }, { status: 404 });
      }
      const estoque = Number(p.estoque_qtd) || 0;
      if (estoque < it.quantidade) {
        return NextResponse.json(
          { error: `Estoque insuficiente em "${p.nome}" (disponível: ${estoque}, solicitado: ${it.quantidade})` },
          { status: 400 },
        );
      }
      pecasMap.set(p.id, p);
    }

    const valorBruto = itens.reduce((s, i) => s + i.quantidade * i.preco_unitario, 0);
    const desconto = Math.max(0, Number(body.desconto) || 0);
    const valorTotal = Math.max(0, valorBruto - desconto);

    const formaPagto = (body.forma_pagamento || 'pix').trim();
    const parcelas = formaPagto === 'credito' ? Math.max(1, Math.floor(Number(body.parcelas) || 1)) : 1;
    const canal = (body.canal || 'balcao').trim();

    const tx = db.transaction(() => {
      const result = db
        .prepare(
          `INSERT INTO pdv_vendas
            (cliente_nome, cliente_tel, cliente_cpf, cliente_email, vendedor_id,
             canal, forma_pagamento, parcelas, valor_bruto, desconto, valor_total,
             observacoes, status)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'concluida')`,
        )
        .run(
          clienteNome,
          (body.cliente_tel || '').trim(),
          (body.cliente_cpf || '').trim(),
          (body.cliente_email || '').trim(),
          body.vendedor_id,
          canal,
          formaPagto,
          parcelas,
          valorBruto,
          desconto,
          valorTotal,
          (body.observacoes || '').trim(),
        );
      const vendaId = Number(result.lastInsertRowid);

      // Insere itens + baixa estoque + movimentações
      const insertItem = db.prepare(
        `INSERT INTO pdv_itens
          (pdv_venda_id, peca_id, nome_snapshot, codigo_snapshot, quantidade, preco_unitario)
         VALUES (?, ?, ?, ?, ?, ?)`,
      );
      const updateEstoque = db.prepare(
        'UPDATE pecas SET estoque_qtd = COALESCE(estoque_qtd, 0) - ? WHERE id = ?',
      );
      const insertMov = db.prepare(
        `INSERT INTO pecas_movimentacoes (peca_id, tipo, quantidade, descricao, ref_tipo, ref_id)
         VALUES (?, 'saida', ?, ?, 'pdv', ?)`,
      );

      for (const it of itens) {
        const p = pecasMap.get(it.peca_id)!;
        insertItem.run(vendaId, p.id, p.nome, p.codigo || '', it.quantidade, it.preco_unitario);
        updateEstoque.run(it.quantidade, p.id);
        insertMov.run(p.id, it.quantidade, `Venda PDV #${vendaId}`, vendaId);
      }

      // Lançamento financeiro
      db.prepare(
        `INSERT INTO lancamentos (tipo, categoria, valor, descricao, ref_tipo, ref_id)
         VALUES ('entrada', 'venda_peca', ?, ?, 'pdv', ?)`,
      ).run(valorTotal, `Venda PDV #${vendaId} — ${clienteNome}`, vendaId);

      return vendaId;
    });

    const vendaId = tx();
    return NextResponse.json({ ok: true, id: vendaId });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Erro interno';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
