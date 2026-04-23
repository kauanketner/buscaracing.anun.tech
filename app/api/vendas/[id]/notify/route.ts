import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { enviarNotificacaoVenda } from '@/lib/wts-chat';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

/**
 * POST /api/vendas/[id]/notify
 *
 * Dispara a notificação WhatsApp do template venda_realizada.
 * Chamado pelo VendaModal DEPOIS dos uploads de comprovantes
 * pra que {{10}} (comprovantes) mostre o número real.
 *
 * Idempotente: pode ser chamado várias vezes sem problema.
 */
export async function POST(request: NextRequest, ctx: Ctx) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  try {
    const { id } = await ctx.params;
    const vendaId = Number(id);
    const db = getDb();

    const notifData = db
      .prepare(
        `SELECT v.valor_venda, v.forma_pagamento, v.comprador_nome, v.comprador_endereco,
                v.comprador_cpf,
                m.nome AS moto_nome, m.chassi AS moto_chassi, m.numero_motor AS moto_numero_motor,
                ve.nome AS vendedor_nome,
                (SELECT COUNT(*) FROM venda_comprovantes vc WHERE vc.venda_id = v.id) AS comprovantes_count
         FROM vendas v
         LEFT JOIN motos m ON v.moto_id = m.id
         LEFT JOIN vendedores ve ON v.vendedor_id = ve.id
         WHERE v.id = ?`,
      )
      .get(vendaId) as
      | {
          valor_venda: number;
          forma_pagamento: string;
          comprador_nome: string;
          comprador_endereco: string;
          comprador_cpf: string;
          moto_nome: string;
          moto_chassi: string;
          moto_numero_motor: string;
          vendedor_nome: string | null;
          comprovantes_count: number;
        }
      | undefined;

    if (!notifData) {
      return NextResponse.json({ error: 'Venda não encontrada' }, { status: 404 });
    }

    const fmtValor = Number(notifData.valor_venda).toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

    const FORMA_LABELS: Record<string, string> = {
      pix: 'PIX',
      dinheiro: 'Dinheiro',
      financiamento: 'Financiamento',
      cartao: 'Cartão',
      misto: 'Misto',
    };
    const pagamento = FORMA_LABELS[notifData.forma_pagamento] || notifData.forma_pagamento || '—';

    const compCount = Number(notifData.comprovantes_count) || 0;
    const comprovantesStr =
      compCount === 0
        ? 'Nenhum anexado'
        : compCount === 1
        ? '1 anexado'
        : `${compCount} anexados`;

    const result = await enviarNotificacaoVenda({
      vendedor: notifData.vendedor_nome || 'Loja',
      moto: notifData.moto_nome || '—',
      chassi: notifData.moto_chassi || '—',
      motor: notifData.moto_numero_motor || '—',
      cliente: notifData.comprador_nome || '—',
      endereco: notifData.comprador_endereco || '—',
      valor: fmtValor,
      pagamento,
      cpf: notifData.comprador_cpf || '—',
      comprovantes: comprovantesStr,
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Erro interno';
    console.error('[venda-notify] erro:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
