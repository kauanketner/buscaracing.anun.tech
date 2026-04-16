import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { ESTADOS_PUBLICOS, type MotoEstado } from '@/lib/moto-estados';

export const dynamic = 'force-dynamic';

/** GET /api/vendas — list sales (admin) */
export async function GET(request: NextRequest) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT v.*,
              m.nome AS moto_nome, m.marca AS moto_marca, m.imagem AS moto_imagem,
              m.origem AS moto_origem, m.valor_compra AS moto_custo,
              ve.nome AS vendedor_nome
       FROM vendas v
       LEFT JOIN motos m ON v.moto_id = m.id
       LEFT JOIN vendedores ve ON v.vendedor_id = ve.id
       ORDER BY v.id DESC`,
    )
    .all();
  return NextResponse.json(rows);
}

/** POST /api/vendas — register a sale */
export async function POST(request: NextRequest) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }
  try {
    const db = getDb();
    const body = (await request.json()) as {
      moto_id: number;
      comprador_nome: string;
      comprador_tel?: string;
      comprador_email?: string;
      vendedor_id?: number | null;
      valor_venda: number;
      forma_pagamento?: string;
      observacoes?: string;
      // Troca
      tem_troca?: boolean;
      troca_marca?: string;
      troca_modelo?: string;
      troca_ano?: string;
      troca_placa?: string;
      troca_km?: string;
      troca_valor?: number;
      troca_nome_cliente?: string;
    };

    const moto = db
      .prepare('SELECT id, estado, origem, nome, marca, preco, valor_compra FROM motos WHERE id=?')
      .get(body.moto_id) as Record<string, unknown> | undefined;
    if (!moto) {
      return NextResponse.json({ error: 'Moto não encontrada' }, { status: 404 });
    }
    if (moto.estado !== 'anunciada' && moto.estado !== 'reservada') {
      return NextResponse.json({ error: 'Moto não está em estado vendável' }, { status: 400 });
    }

    const compradorNome = (body.comprador_nome || '').trim();
    if (!compradorNome) {
      return NextResponse.json({ error: 'Nome do comprador obrigatório' }, { status: 400 });
    }
    if (!body.valor_venda || body.valor_venda <= 0) {
      return NextResponse.json({ error: 'Valor de venda obrigatório' }, { status: 400 });
    }

    // Determine vendedor info for commission
    let vendedorTipo = 'interno';
    let comissaoValor = 200;
    if (body.vendedor_id) {
      const vend = db
        .prepare('SELECT id, tipo FROM vendedores WHERE id=?')
        .get(body.vendedor_id) as { id: number; tipo: string } | undefined;
      if (vend) {
        vendedorTipo = vend.tipo || 'interno';
        comissaoValor = vendedorTipo === 'externo' ? 400 : 200;
      }
    }

    // Check for active reservation → consume sinal
    const reservaAtiva = db
      .prepare("SELECT id, valor_sinal, cliente_nome FROM reservas WHERE moto_id=? AND status='ativa' ORDER BY id DESC LIMIT 1")
      .get(body.moto_id) as { id: number; valor_sinal: number; cliente_nome: string } | undefined;
    const valorSinal = reservaAtiva?.valor_sinal || 0;

    const tx = db.transaction(() => {
      // 1. Create venda
      const vendaResult = db
        .prepare(
          `INSERT INTO vendas (moto_id, comprador_nome, comprador_tel, comprador_email,
             vendedor_id, vendedor_tipo, valor_venda, valor_sinal, forma_pagamento,
             troca_moto_id, troca_valor, comissao_valor, observacoes)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(
          body.moto_id,
          compradorNome,
          (body.comprador_tel || '').trim(),
          (body.comprador_email || '').trim(),
          body.vendedor_id || null,
          vendedorTipo,
          body.valor_venda,
          valorSinal,
          (body.forma_pagamento || '').trim(),
          null, // troca_moto_id filled below
          body.troca_valor || null,
          comissaoValor,
          (body.observacoes || '').trim(),
        );
      const vendaId = Number(vendaResult.lastInsertRowid);

      // 2. Transition moto → vendida (or em_revisao if consignada)
      const newState = moto.origem === 'consignada' ? 'em_revisao' : 'vendida';
      db.prepare('UPDATE motos SET estado=?, ativo=0, vendida=1, vendedor_id=?, comprador_nome=?, valor_venda_final=?, data_venda=date(\'now\',\'localtime\') WHERE id=?')
        .run(newState, body.vendedor_id || null, compradorNome, body.valor_venda, body.moto_id);

      // 3. If consignada → auto-create OS for post-sale revision
      if (moto.origem === 'consignada') {
        db.prepare(
          `INSERT INTO oficina_ordens (cliente_nome, moto_id, moto_marca, moto_modelo, servico_descricao, status)
           VALUES (?, ?, ?, ?, 'Revisão pós-venda (consignada)', 'aberta')`,
        ).run(compradorNome, body.moto_id, moto.marca || '', moto.nome || '');
      }

      // 4. If reservation existed → mark as converted
      if (reservaAtiva) {
        db.prepare("UPDATE reservas SET status='convertida', venda_id=? WHERE id=?").run(vendaId, reservaAtiva.id);
      }

      // 5. Commission entry
      if (body.vendedor_id) {
        db.prepare(
          'INSERT INTO comissoes (venda_id, vendedor_id, valor) VALUES (?, ?, ?)',
        ).run(vendaId, body.vendedor_id, comissaoValor);
      }

      // 6. Financial entries
      db.prepare(
        `INSERT INTO lancamentos (tipo, categoria, valor, descricao, ref_tipo, ref_id)
         VALUES ('entrada', 'venda_moto', ?, ?, 'venda', ?)`,
      ).run(body.valor_venda, `Venda ${moto.nome} para ${compradorNome}`, vendaId);

      if (body.vendedor_id) {
        db.prepare(
          `INSERT INTO lancamentos (tipo, categoria, valor, descricao, ref_tipo, ref_id)
           VALUES ('saida', 'comissao', ?, ?, 'venda', ?)`,
        ).run(comissaoValor, `Comissão ${vendedorTipo} — venda #${vendaId}`, vendaId);
      }

      // 7. Handle troca — create new moto entry
      let trocaMotoId: number | null = null;
      if (body.tem_troca && body.troca_valor && body.troca_valor > 0) {
        const trocaNome = `${body.troca_marca || ''} ${body.troca_modelo || ''}`.trim() || 'Moto de troca';
        const trocaResult = db
          .prepare(
            `INSERT INTO motos (nome, marca, modelo, ano, placa, km, tipo_entrada, valor_compra, nome_cliente, ativo, estado, origem, troca_venda_id)
             VALUES (?, ?, ?, ?, ?, ?, 'compra', ?, ?, 0, 'avaliacao', 'troca', ?)`,
          )
          .run(
            trocaNome,
            (body.troca_marca || '').trim(),
            (body.troca_modelo || '').trim(),
            body.troca_ano ? Number(body.troca_ano) : null,
            (body.troca_placa || '').toUpperCase().trim(),
            body.troca_km ? Number(body.troca_km) : null,
            body.troca_valor,
            (body.troca_nome_cliente || compradorNome).trim(),
            vendaId,
          );
        trocaMotoId = Number(trocaResult.lastInsertRowid);
        db.prepare('UPDATE vendas SET troca_moto_id=?, troca_valor=? WHERE id=?')
          .run(trocaMotoId, body.troca_valor, vendaId);

        // Financial: the trade-in value is basically a "purchase" cost
        db.prepare(
          `INSERT INTO lancamentos (tipo, categoria, valor, descricao, ref_tipo, ref_id)
           VALUES ('saida', 'compra_moto', ?, ?, 'moto', ?)`,
        ).run(body.troca_valor, `Troca (avaliação) — ${trocaNome}`, trocaMotoId);
      }

      return { vendaId, trocaMotoId };
    });

    const result = tx();
    return NextResponse.json({
      ok: true,
      venda_id: result.vendaId,
      troca_moto_id: result.trocaMotoId,
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Erro interno';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
