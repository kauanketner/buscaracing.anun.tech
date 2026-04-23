import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/auth';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

/** GET /api/admin/motos/[id]/detalhes — tudo que existe sobre a moto */
export async function GET(request: NextRequest, ctx: Ctx) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }
  try {
    const { id } = await ctx.params;
    const motoId = Number(id);
    if (!Number.isFinite(motoId)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
    }

    const db = getDb();
    const moto = db.prepare('SELECT * FROM motos WHERE id=?').get(motoId) as
      | Record<string, unknown> | undefined;
    if (!moto) {
      return NextResponse.json({ error: 'Moto não encontrada' }, { status: 404 });
    }

    const fotosRaw = db
      .prepare('SELECT id, filename, ordem FROM fotos WHERE moto_id=? ORDER BY ordem ASC, id ASC')
      .all(motoId) as { id: number; filename: string; ordem: number }[];
    const fotos = fotosRaw.map((f) => ({
      id: f.id,
      ordem: f.ordem,
      // filename pode já vir com path absoluto ("/uploads/...") ou só o nome do arquivo
      url: f.filename && f.filename.startsWith('/') ? f.filename : `/fotos/${f.filename}`,
    }));

    // OSs + total de peças de cada uma
    const ordens = db
      .prepare(
        `SELECT o.*,
                (SELECT COALESCE(SUM(op.quantidade * op.preco_unitario), 0)
                 FROM os_pecas op WHERE op.ordem_id = o.id) AS pecas_total,
                (SELECT COUNT(*) FROM os_pecas op2 WHERE op2.ordem_id = o.id) AS pecas_count,
                me.nome AS mecanico_nome
         FROM oficina_ordens o
         LEFT JOIN mecanicos me ON o.mecanico_id = me.id
         WHERE o.moto_id = ?
         ORDER BY o.id DESC`,
      )
      .all(motoId);

    // Vendas + vendedor
    const vendas = db
      .prepare(
        `SELECT v.*, ve.nome AS vendedor_nome,
                (SELECT COUNT(*) FROM venda_comprovantes vc WHERE vc.venda_id = v.id) AS comprovantes_count
         FROM vendas v
         LEFT JOIN vendedores ve ON v.vendedor_id = ve.id
         WHERE v.moto_id = ?
         ORDER BY v.id DESC`,
      )
      .all(motoId);

    // Comprovantes de todas as vendas desta moto (carregados de uma vez)
    const comprovantes = db
      .prepare(
        `SELECT vc.*
         FROM venda_comprovantes vc
         JOIN vendas v ON v.id = vc.venda_id
         WHERE v.moto_id = ?
         ORDER BY vc.venda_id DESC, vc.id ASC`,
      )
      .all(motoId);

    // Reservas (com sinal) — tabela `reservas`
    const reservas = db
      .prepare(
        'SELECT * FROM reservas WHERE moto_id = ? ORDER BY id DESC',
      )
      .all(motoId);

    // Aluguéis
    const alugueis = db
      .prepare(
        'SELECT * FROM alugueis WHERE moto_id = ? ORDER BY id DESC',
      )
      .all(motoId);

    // Consignação (1 por moto normalmente)
    const consignacao = db
      .prepare('SELECT * FROM consignacoes WHERE moto_id = ? ORDER BY id DESC LIMIT 1')
      .get(motoId);

    // Lançamentos financeiros relacionados
    const lancamentos = db
      .prepare(
        `SELECT * FROM lancamentos
         WHERE (ref_tipo='moto' AND ref_id=?)
            OR (ref_tipo='venda' AND ref_id IN (SELECT id FROM vendas WHERE moto_id=?))
            OR (ref_tipo='reserva' AND ref_id IN (SELECT id FROM reservas WHERE moto_id=?))
            OR (ref_tipo='aluguel' AND ref_id IN (SELECT id FROM alugueis WHERE moto_id=?))
            OR (ref_tipo='consignacao' AND ref_id IN (SELECT id FROM consignacoes WHERE moto_id=?))
         ORDER BY data DESC, id DESC`,
      )
      .all(motoId, motoId, motoId, motoId, motoId);

    // Totais agregados
    type OrdRow = Record<string, unknown>;
    const totalOficinaGasto = (ordens as OrdRow[]).reduce(
      (s, o) => s + (Number(o.valor_final) || 0) + (Number(o.pecas_total) || 0),
      0,
    );
    const totalOficinaEstimado = (ordens as OrdRow[]).reduce(
      (s, o) => s + (Number(o.valor_estimado) || 0),
      0,
    );

    const vendaAtiva = (vendas as OrdRow[]).find((v) => v && v.id) as OrdRow | undefined;
    const custoCompra = Number(moto.valor_compra) || 0;
    const valorVendaReal = Number(vendaAtiva?.valor_venda) || 0;
    const comissao = Number(vendaAtiva?.comissao_valor) || 0;
    const margem = valorVendaReal > 0
      ? valorVendaReal - custoCompra - totalOficinaGasto - comissao
      : null;

    return NextResponse.json({
      moto,
      fotos,
      ordens,
      vendas,
      comprovantes,
      reservas,
      alugueis,
      consignacao: consignacao || null,
      lancamentos,
      totais: {
        oficina_gasto: totalOficinaGasto,
        oficina_estimado: totalOficinaEstimado,
        qtd_ordens: ordens.length,
        qtd_vendas: vendas.length,
        qtd_reservas: reservas.length,
        qtd_alugueis: alugueis.length,
        custo_compra: custoCompra,
        valor_venda_real: valorVendaReal,
        margem_bruta: margem,
      },
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Erro interno';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
