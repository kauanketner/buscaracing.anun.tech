import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/auth';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

const STATUS_VALIDOS = new Set([
  'aberta',
  'em_andamento',
  'aguardando_peca',
  'concluida',
  'entregue',
  'cancelada',
]);

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
    if (!STATUS_VALIDOS.has(status)) {
      return NextResponse.json({ error: 'Status inválido' }, { status: 400 });
    }

    const db = getDb();
    const stmt = db.prepare(
      `INSERT INTO oficina_ordens (
         cliente_nome, cliente_telefone, cliente_email,
         moto_id, moto_marca, moto_modelo, moto_ano, moto_placa, moto_km,
         servico_descricao, observacoes, mecanico,
         valor_estimado, valor_final,
         status, data_entrada, data_prevista, data_conclusao
       ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
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
      toNullableNumber(body.valor_estimado),
      toNullableNumber(body.valor_final),
      status,
      toNullableStr(body.data_entrada) || new Date().toISOString().slice(0, 10),
      toNullableStr(body.data_prevista),
      toNullableStr(body.data_conclusao),
    );

    return NextResponse.json({ ok: true, id: Number(result.lastInsertRowid) }, { status: 201 });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Erro interno';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
