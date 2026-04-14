import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/auth';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ id: string }> };

const STATUS_VALIDOS = new Set([
  'aberta',
  'em_andamento',
  'aguardando_peca',
  'concluida',
  'entregue',
  'cancelada',
]);

const EDITABLE_STRING_COLS = [
  'cliente_nome',
  'cliente_telefone',
  'cliente_email',
  'moto_marca',
  'moto_modelo',
  'moto_placa',
  'servico_descricao',
  'observacoes',
  'mecanico',
] as const;

const EDITABLE_NUMBER_COLS = [
  'moto_ano',
  'moto_km',
  'valor_estimado',
  'valor_final',
] as const;

const EDITABLE_DATE_COLS = ['data_entrada', 'data_prevista', 'data_conclusao'] as const;

function toStr(v: unknown): string {
  return typeof v === 'string' ? v.trim() : '';
}
function toNullableNumber(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}
function toNullableStr(v: unknown): string | null {
  const s = toStr(v);
  return s ? s : null;
}

export async function GET(request: NextRequest, context: RouteContext) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }
  try {
    const { id } = await context.params;
    const db = getDb();
    const row = db.prepare('SELECT * FROM oficina_ordens WHERE id=?').get(Number(id));
    if (!row) return NextResponse.json({ error: 'Ordem não encontrada' }, { status: 404 });
    return NextResponse.json(row);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Erro interno';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, context: RouteContext) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }
  try {
    const { id } = await context.params;
    const body = (await request.json()) as Record<string, unknown>;

    const db = getDb();
    const existing = db.prepare('SELECT id FROM oficina_ordens WHERE id=?').get(Number(id));
    if (!existing) return NextResponse.json({ error: 'Ordem não encontrada' }, { status: 404 });

    const sets: string[] = [];
    const vals: unknown[] = [];

    for (const col of EDITABLE_STRING_COLS) {
      if (col in body) {
        sets.push(`${col}=?`);
        vals.push(toStr(body[col]));
      }
    }
    for (const col of EDITABLE_NUMBER_COLS) {
      if (col in body) {
        sets.push(`${col}=?`);
        vals.push(toNullableNumber(body[col]));
      }
    }
    for (const col of EDITABLE_DATE_COLS) {
      if (col in body) {
        sets.push(`${col}=?`);
        vals.push(toNullableStr(body[col]));
      }
    }
    if ('status' in body) {
      const s = toStr(body.status);
      if (!STATUS_VALIDOS.has(s)) {
        return NextResponse.json({ error: 'Status inválido' }, { status: 400 });
      }
      sets.push('status=?');
      vals.push(s);
      // Se marcar como concluída e não tiver data_conclusao, preencher com hoje
      if (s === 'concluida' && !('data_conclusao' in body)) {
        sets.push('data_conclusao=?');
        vals.push(new Date().toISOString().slice(0, 10));
      }
    }

    if (sets.length === 0) {
      return NextResponse.json({ ok: true, changed: 0 });
    }

    sets.push("updated_at=datetime('now','localtime')");
    vals.push(Number(id));

    db.prepare(`UPDATE oficina_ordens SET ${sets.join(', ')} WHERE id=?`).run(...vals);
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Erro interno';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }
  try {
    const { id } = await context.params;
    const db = getDb();
    const r = db.prepare('DELETE FROM oficina_ordens WHERE id=?').run(Number(id));
    if (r.changes === 0) {
      return NextResponse.json({ error: 'Ordem não encontrada' }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Erro interno';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
