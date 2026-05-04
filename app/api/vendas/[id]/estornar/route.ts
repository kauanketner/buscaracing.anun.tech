import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/auth';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

/**
 * PATCH /api/vendas/[id]/estornar
 *
 * Estorna uma venda concluída (soft-delete) e reverte os efeitos colaterais:
 * - Moto volta pra estado 'anunciada' (limpa comprador_nome/valor_venda_final/etc)
 * - Apaga lançamento financeiro da venda + lançamento de comissão
 * - Apaga registro em comissoes
 * - Se reserva foi convertida -> volta pra 'cancelada'
 * - Se era consignada -> consignacoes.status='ativa' + apaga lancamento
 *   de repasse pendente + apaga OS de revisão pós-venda automática
 * - Se gerou moto de troca, tenta apagar (só se está em 'avaliacao' e
 *   sem histórico). Se já foi modificada, BLOQUEIA o estorno.
 * - Marca venda status='estornada' + grava motivo
 * - Comprovantes ficam preservados (auditoria)
 *
 * Body: { senha: string, motivo?: string }
 */
export async function PATCH(request: NextRequest, ctx: Ctx) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  // Senha (mesma do delete de moto)
  const DELETE_PASSWORD = process.env.DELETE_PASSWORD || 'Anuntech@2001';

  try {
    const { id } = await ctx.params;
    const vendaId = Number(id);
    if (!Number.isFinite(vendaId)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
    }

    const body = await request.json().catch(() => ({})) as {
      senha?: string;
      motivo?: string;
    };
    if ((body.senha || '') !== DELETE_PASSWORD) {
      return NextResponse.json({ error: 'Senha incorreta' }, { status: 403 });
    }

    const db = getDb();
    const venda = db
      .prepare(
        `SELECT id, moto_id, status, troca_moto_id, vendedor_id
         FROM vendas WHERE id = ?`,
      )
      .get(vendaId) as
      | { id: number; moto_id: number; status: string; troca_moto_id: number | null; vendedor_id: number | null }
      | undefined;
    if (!venda) {
      return NextResponse.json({ error: 'Venda não encontrada' }, { status: 404 });
    }
    if (venda.status === 'estornada') {
      return NextResponse.json({ error: 'Venda já estornada' }, { status: 400 });
    }

    // Pré-validação: moto de troca pode ser apagada?
    let trocaMotoIdParaApagar: number | null = null;
    if (venda.troca_moto_id) {
      const tm = db
        .prepare(
          `SELECT id, estado, ativo,
                  (SELECT COUNT(*) FROM vendas v WHERE v.moto_id = motos.id AND v.id != ?) AS outras_vendas,
                  (SELECT COUNT(*) FROM oficina_ordens o WHERE o.moto_id = motos.id) AS ordens,
                  (SELECT COUNT(*) FROM alugueis a WHERE a.moto_id = motos.id) AS alugueis_count,
                  (SELECT COUNT(*) FROM reservas r WHERE r.moto_id = motos.id) AS reservas_count,
                  (SELECT COUNT(*) FROM fotos f WHERE f.moto_id = motos.id) AS fotos_count
           FROM motos WHERE id = ?`,
        )
        .get(vendaId, venda.troca_moto_id) as
        | {
            id: number;
            estado: string;
            ativo: number;
            outras_vendas: number;
            ordens: number;
            alugueis_count: number;
            reservas_count: number;
            fotos_count: number;
          }
        | undefined;

      if (!tm) {
        // Moto de troca já foi apagada (manualmente?) — segue o fluxo
      } else {
        const seguraParaApagar =
          tm.estado === 'avaliacao' &&
          tm.ativo === 0 &&
          tm.outras_vendas === 0 &&
          tm.ordens === 0 &&
          tm.alugueis_count === 0 &&
          tm.reservas_count === 0 &&
          tm.fotos_count === 0;
        if (!seguraParaApagar) {
          return NextResponse.json(
            {
              error:
                `A moto de troca (#${venda.troca_moto_id}) já foi modificada (estado=${tm.estado}, ` +
                `${tm.fotos_count} fotos, ${tm.ordens} OS, ${tm.outras_vendas} venda(s), ` +
                `${tm.alugueis_count} aluguel(éis), ${tm.reservas_count} reserva(s)). ` +
                `Não é possível estornar automaticamente — desfaça as modificações na moto de troca primeiro ou apague-a manualmente.`,
            },
            { status: 409 },
          );
        }
        trocaMotoIdParaApagar = tm.id;
      }
    }

    const motivo = (body.motivo || '').trim();

    const tx = db.transaction(() => {
      // 1. Volta a moto pro estado vendável anterior + limpa campos da venda
      const moto = db
        .prepare('SELECT origem FROM motos WHERE id = ?')
        .get(venda.moto_id) as { origem: string } | undefined;
      const origem = moto?.origem || '';

      db.prepare(
        `UPDATE motos
         SET estado = 'anunciada',
             ativo = 1,
             vendida = 0,
             vendedor_id = NULL,
             comprador_nome = '',
             valor_venda_final = NULL,
             data_venda = NULL
         WHERE id = ?`,
      ).run(venda.moto_id);

      // 2. Apaga registros financeiros relacionados à venda
      // (lancamento de venda_moto + lancamento de comissao + lancamento de
      //  repasse pendente se consignada)
      db.prepare("DELETE FROM lancamentos WHERE ref_tipo = 'venda' AND ref_id = ?").run(vendaId);

      // 3. Apaga comissão (FK sem cascade)
      db.prepare('DELETE FROM comissoes WHERE venda_id = ?').run(vendaId);

      // 4. Reserva convertida -> volta pra cancelada (cliente já não tá ativo)
      db.prepare(
        "UPDATE reservas SET status = 'cancelada' WHERE venda_id = ?",
      ).run(vendaId);

      // 5. Consignada — reverte tudo da revisão pós-venda
      if (origem === 'consignada') {
        // Apaga OS de revisão pós-venda automática (mesma moto, descrição padrão)
        const osRevisao = db
          .prepare(
            `SELECT id FROM oficina_ordens
             WHERE moto_id = ? AND servico_descricao = 'Revisão pós-venda (consignada)'
             ORDER BY id DESC LIMIT 1`,
          )
          .get(venda.moto_id) as { id: number } | undefined;
        if (osRevisao) {
          db.prepare('DELETE FROM oficina_ordens WHERE id = ?').run(osRevisao.id);
        }

        // Volta consignacoes pra ativa + apaga lancamento de repasse pendente
        const consig = db
          .prepare(
            "SELECT id FROM consignacoes WHERE moto_id = ? AND status = 'vendida' ORDER BY id DESC LIMIT 1",
          )
          .get(venda.moto_id) as { id: number } | undefined;
        if (consig) {
          db.prepare("UPDATE consignacoes SET status = 'ativa', valor_repasse = NULL WHERE id = ?")
            .run(consig.id);
          db.prepare(
            "DELETE FROM lancamentos WHERE ref_tipo = 'consignacao' AND ref_id = ?",
          ).run(consig.id);
        }
      }

      // 6. Apaga moto de troca (já validamos que é seguro)
      if (trocaMotoIdParaApagar) {
        // Apaga lancamento de compra_moto referente à troca
        db.prepare(
          "DELETE FROM lancamentos WHERE ref_tipo = 'moto' AND ref_id = ?",
        ).run(trocaMotoIdParaApagar);
        db.prepare('DELETE FROM motos WHERE id = ?').run(trocaMotoIdParaApagar);
      }

      // 7. Marca venda como estornada (soft delete)
      db.prepare(
        `UPDATE vendas
         SET status = 'estornada',
             estornada_em = datetime('now','localtime'),
             estornada_motivo = ?,
             troca_moto_id = NULL
         WHERE id = ?`,
      ).run(motivo, vendaId);
    });

    tx();
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Erro interno';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
