import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/auth';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ id: string }> };

function toStr(v: unknown): string {
  return typeof v === 'string' ? v.trim() : '';
}

/**
 * Abre uma OS de garantia baseada em uma OS finalizada.
 *
 * Body: { servico_descricao?: string, mensagem?: string, autor?: string }
 *
 * A nova OS:
 *  - herda cliente_* + moto_id + moto_marca/modelo/placa/ano (km vazio, pra ser
 *    atualizado na entrada da garantia)
 *  - fica com status = 'aberta'
 *  - grava garantia_de_id apontando para a OS pai
 *  - usa a data de hoje como data_entrada
 *  - grava entrada inicial no histórico mencionando a origem
 */
export async function POST(request: NextRequest, context: RouteContext) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }
  try {
    const { id } = await context.params;
    const paiId = Number(id);
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const servico_descricao = toStr(body.servico_descricao);
    const mensagem = toStr(body.mensagem);
    const autor = toStr(body.autor);

    const db = getDb();
    const pai = db
      .prepare(
        `SELECT id, status, cliente_nome, cliente_telefone, cliente_email,
                moto_id, moto_marca, moto_modelo, moto_ano, moto_placa,
                mecanico
         FROM oficina_ordens WHERE id=?`,
      )
      .get(paiId) as
      | {
          id: number;
          status: string;
          cliente_nome: string;
          cliente_telefone: string;
          cliente_email: string;
          moto_id: number | null;
          moto_marca: string;
          moto_modelo: string;
          moto_ano: number | null;
          moto_placa: string;
          mecanico: string;
        }
      | undefined;
    if (!pai) {
      return NextResponse.json({ error: 'OS de origem não encontrada' }, { status: 404 });
    }
    if (pai.status !== 'finalizada') {
      return NextResponse.json(
        { error: 'Só é possível abrir garantia a partir de uma OS finalizada.' },
        { status: 400 },
      );
    }

    const today = new Date().toISOString().slice(0, 10);
    const tx = db.transaction(() => {
      const r = db
        .prepare(
          `INSERT INTO oficina_ordens (
             cliente_nome, cliente_telefone, cliente_email,
             moto_id, moto_marca, moto_modelo, moto_ano, moto_placa, moto_km,
             servico_descricao, observacoes, mecanico,
             valor_estimado, valor_final,
             status, data_entrada, data_prevista, data_conclusao,
             garantia_de_id
           ) VALUES (?,?,?,?,?,?,?,?,NULL,?,'',?,NULL,NULL,'aberta',?,NULL,NULL,?)`,
        )
        .run(
          pai.cliente_nome,
          pai.cliente_telefone,
          pai.cliente_email,
          pai.moto_id,
          pai.moto_marca,
          pai.moto_modelo,
          pai.moto_ano,
          pai.moto_placa,
          servico_descricao,
          pai.mecanico,
          today,
          paiId,
        );
      const newId = Number(r.lastInsertRowid);
      db.prepare(
        `INSERT INTO oficina_historico (ordem_id, status_anterior, status_novo, mensagem, autor)
         VALUES (?, NULL, 'aberta', ?, ?)`,
      ).run(
        newId,
        mensagem || `OS aberta como garantia da OS #${paiId}`,
        autor,
      );
      return newId;
    });

    const newId = tx();
    return NextResponse.json({ ok: true, id: newId }, { status: 201 });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Erro interno';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
