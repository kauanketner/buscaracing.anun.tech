import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { OFICINA_STATUSES, isOficinaStatus } from '@/lib/oficina-status';

export const dynamic = 'force-dynamic';

function toNullableNumber(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}
function toStr(v: unknown): string {
  return typeof v === 'string' ? v.trim() : '';
}
function toNullableStr(v: unknown): string | null {
  const s = toStr(v);
  return s ? s : null;
}

export async function GET(request: NextRequest) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }
  try {
    const db = getDb();
    const rows = db
      .prepare(
        `SELECT o.*, m.nome AS moto_nome
         FROM oficina_ordens o
         LEFT JOIN motos m ON m.id = o.moto_id
         ORDER BY o.id DESC`,
      )
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
    const body = (await request.json()) as Record<string, unknown>;
    const cliente_nome = toStr(body.cliente_nome);
    if (!cliente_nome) {
      return NextResponse.json({ error: 'Informe o nome do cliente' }, { status: 400 });
    }
    const status = toStr(body.status) || 'aberta';
    if (!isOficinaStatus(status)) {
      return NextResponse.json(
        { error: `Status inválido. Valores aceitos: ${OFICINA_STATUSES.join(', ')}` },
        { status: 400 },
      );
    }
    const autor = toStr(body.autor);
    const garantia_de_id = toNullableNumber(body.garantia_de_id);

    const db = getDb();
    // Tudo numa transação pra garantir que a OS e o histórico inicial andem juntos.
    const tx = db.transaction(() => {
      const stmt = db.prepare(
        `INSERT INTO oficina_ordens (
           cliente_nome, cliente_telefone, cliente_email,
           moto_id, moto_marca, moto_modelo, moto_ano, moto_placa, moto_km,
           servico_descricao, observacoes, mecanico, tecnico_id,
           valor_estimado, valor_final,
           status, data_entrada, data_prevista, data_conclusao,
           garantia_de_id
         ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      );
      const result = stmt.run(
        cliente_nome,
        toStr(body.cliente_telefone),
        toStr(body.cliente_email),
        toNullableNumber(body.moto_id),
        toStr(body.moto_marca),
        toStr(body.moto_modelo),
        toNullableNumber(body.moto_ano),
        toStr(body.moto_placa),
        toNullableNumber(body.moto_km),
        toStr(body.servico_descricao),
        toStr(body.observacoes),
        toStr(body.mecanico),
        toNullableNumber(body.tecnico_id),
        toNullableNumber(body.valor_estimado),
        toNullableNumber(body.valor_final),
        status,
        toNullableStr(body.data_entrada) || new Date().toISOString().slice(0, 10),
        toNullableStr(body.data_prevista),
        toNullableStr(body.data_conclusao),
        garantia_de_id,
      );
      const newId = Number(result.lastInsertRowid);

      // Entrada inicial no histórico (status_anterior = null).
      db.prepare(
        `INSERT INTO oficina_historico (ordem_id, status_anterior, status_novo, mensagem, autor)
         VALUES (?, NULL, ?, ?, ?)`,
      ).run(
        newId,
        status,
        garantia_de_id ? `OS aberta como garantia da OS #${garantia_de_id}` : 'OS aberta',
        autor,
      );

      return newId;
    });

    const id = tx();
    return NextResponse.json({ ok: true, id }, { status: 201 });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Erro interno';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
