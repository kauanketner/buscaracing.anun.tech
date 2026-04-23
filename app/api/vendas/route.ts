import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
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
              ve.nome AS vendedor_nome,
              (SELECT COUNT(*) FROM venda_comprovantes vc WHERE vc.venda_id = v.id) AS comprovantes_count
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
      comprador_cpf?: string;
      comprador_endereco?: string;
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

    const futurasRow = db
      .prepare(
        `SELECT COUNT(*) AS c FROM alugueis
         WHERE moto_id=? AND status IN ('aprovada','ativa')
           AND data_fim >= date('now','localtime')`,
      )
      .get(body.moto_id) as { c: number };
    if (futurasRow.c > 0) {
      return NextResponse.json({
        error: `Moto tem ${futurasRow.c} reserva(s) de aluguel futura(s). Cancele antes de vender.`,
      }, { status: 409 });
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
          `INSERT INTO vendas (moto_id, comprador_nome, comprador_tel, comprador_email, comprador_cpf, comprador_endereco,
             vendedor_id, vendedor_tipo, valor_venda, valor_sinal, forma_pagamento,
             troca_moto_id, troca_valor, comissao_valor, observacoes)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(
          body.moto_id,
          compradorNome,
          (body.comprador_tel || '').trim(),
          (body.comprador_email || '').trim(),
          (body.comprador_cpf || '').trim(),
          (body.comprador_endereco || '').trim(),
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

      // Generate comprador portal token
      const compradorToken = crypto.randomBytes(16).toString('hex');
      db.prepare('UPDATE vendas SET token=? WHERE id=?').run(compradorToken, vendaId);

      // 2. Transition moto → vendida (or em_revisao if consignada)
      const newState = moto.origem === 'consignada' ? 'em_revisao' : 'vendida';
      db.prepare('UPDATE motos SET estado=?, ativo=0, vendida=1, vendedor_id=?, comprador_nome=?, valor_venda_final=?, data_venda=date(\'now\',\'localtime\') WHERE id=?')
        .run(newState, body.vendedor_id || null, compradorNome, body.valor_venda, body.moto_id);

      // 3. If consignada → auto-create OS for post-sale revision + calculate repasse
      if (moto.origem === 'consignada') {
        db.prepare(
          `INSERT INTO oficina_ordens (cliente_nome, moto_id, moto_marca, moto_modelo, servico_descricao, status)
           VALUES (?, ?, ?, ?, 'Revisão pós-venda (consignada)', 'aberta')`,
        ).run(compradorNome, body.moto_id, moto.marca || '', moto.nome || '');

        // Record repasse pendente.
        // valor_repasse é o valor ACORDADO na entrada (preenchido no form).
        // Se não foi informado, cai no modelo antigo com margem_pct (retrocompat).
        const consig = db
          .prepare("SELECT id, margem_pct, valor_repasse, dono_nome FROM consignacoes WHERE moto_id=? AND status='ativa' ORDER BY id DESC LIMIT 1")
          .get(body.moto_id) as { id: number; margem_pct: number; valor_repasse: number | null; dono_nome: string } | undefined;
        if (consig) {
          let repasseBase: number;
          if (consig.valor_repasse != null && consig.valor_repasse > 0) {
            // Modelo novo: valor fixo acordado com o dono
            repasseBase = consig.valor_repasse;
          } else {
            // Modelo antigo: margem % calculada sobre o preço de venda
            const margemPct = consig.margem_pct || 12;
            repasseBase = body.valor_venda * (1 - margemPct / 100);
          }
          // custo_revisao será descontado quando a OS pós-venda fechar
          db.prepare("UPDATE consignacoes SET valor_repasse=?, status='vendida' WHERE id=?")
            .run(repasseBase, consig.id);

          // Financial: repasse pendente
          db.prepare(
            `INSERT INTO lancamentos (tipo, categoria, valor, descricao, ref_tipo, ref_id)
             VALUES ('saida', 'repasse_consignada', ?, ?, 'consignacao', ?)`,
          ).run(repasseBase, `Repasse pendente — ${consig.dono_nome}`, consig.id);
        }
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

      return { vendaId, trocaMotoId, compradorToken };
    });

    const result = tx();

    // Obs.: notificação WhatsApp é disparada pelo frontend via POST /api/vendas/[id]/notify
    // depois que os comprovantes são uploaded (pra que o {{10}} do template mostre o número real).

    return NextResponse.json({
      ok: true,
      venda_id: result.vendaId,
      troca_moto_id: result.trocaMotoId,
      comprador_token: result.compradorToken,
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Erro interno';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
