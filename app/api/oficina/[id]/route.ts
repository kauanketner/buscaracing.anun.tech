import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/auth';
import { getDb } from '@/lib/db';
import {
  OFICINA_STATUSES,
  isOficinaStatus,
  isTerminal,
} from '@/lib/oficina-status';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ id: string }> };

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
  'moto_id',
  'moto_ano',
  'moto_km',
  'valor_estimado',
  'valor_final',
  'tecnico_id',
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

type OrdemRow = {
  id: number;
  status: string;
  data_entrada: string | null;
  garantia_de_id: number | null;
  [k: string]: unknown;
};

type HistoricoRow = {
  id: number;
  ordem_id: number;
  status_anterior: string | null;
  status_novo: string;
  mensagem: string;
  autor: string;
  created_at: string;
};

function fetchHistorico(
  db: ReturnType<typeof getDb>,
  ordemId: number,
  ordemFallback?: { status: string; data_entrada: string | null },
): HistoricoRow[] {
  let rows = db
    .prepare(
      `SELECT id, ordem_id, status_anterior, status_novo, mensagem, autor, created_at
       FROM oficina_historico
       WHERE ordem_id = ?
       ORDER BY id ASC`,
    )
    .all(ordemId) as HistoricoRow[];

  // Backfill retroativo: ordens criadas antes do feature de histórico não têm
  // nenhuma entrada. Gera uma síntese a partir do próprio status/data_entrada
  // da OS para que a timeline não apareça vazia no detalhe.
  if (rows.length === 0 && ordemFallback) {
    db.prepare(
      `INSERT INTO oficina_historico (ordem_id, status_anterior, status_novo, mensagem, autor, created_at)
       VALUES (?, NULL, ?, ?, '', COALESCE(?, datetime('now','localtime')))`,
    ).run(
      ordemId,
      ordemFallback.status,
      '(entrada retroativa — criada antes do histórico existir)',
      ordemFallback.data_entrada,
    );
    rows = db
      .prepare(
        `SELECT id, ordem_id, status_anterior, status_novo, mensagem, autor, created_at
         FROM oficina_historico
         WHERE ordem_id = ?
         ORDER BY id ASC`,
      )
      .all(ordemId) as HistoricoRow[];
  }
  return rows;
}

export async function GET(request: NextRequest, context: RouteContext) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }
  try {
    const { id } = await context.params;
    const numericId = Number(id);
    const db = getDb();
    const row = db
      .prepare(
        `SELECT o.*, m.nome AS moto_nome
         FROM oficina_ordens o
         LEFT JOIN motos m ON m.id = o.moto_id
         WHERE o.id = ?`,
      )
      .get(numericId) as OrdemRow | undefined;
    if (!row) return NextResponse.json({ error: 'Ordem não encontrada' }, { status: 404 });

    const historico = fetchHistorico(db, numericId, {
      status: row.status,
      data_entrada: row.data_entrada,
    });

    // Se é uma garantia, traz o resumo da OS pai + o histórico dela (read-only).
    let garantiaDe: (OrdemRow & { historico: HistoricoRow[] }) | null = null;
    if (row.garantia_de_id) {
      const pai = db
        .prepare(
          `SELECT o.*, m.nome AS moto_nome
           FROM oficina_ordens o
           LEFT JOIN motos m ON m.id = o.moto_id
           WHERE o.id = ?`,
        )
        .get(row.garantia_de_id) as OrdemRow | undefined;
      if (pai) {
        garantiaDe = {
          ...pai,
          historico: fetchHistorico(db, pai.id, {
            status: pai.status,
            data_entrada: pai.data_entrada,
          }),
        };
      }
    }

    // Garantias-filhas: OSs que foram abertas COMO garantia desta.
    const garantias = db
      .prepare(
        `SELECT id, status, data_entrada, servico_descricao
         FROM oficina_ordens
         WHERE garantia_de_id = ?
         ORDER BY id DESC`,
      )
      .all(numericId);

    return NextResponse.json({ ...row, historico, garantia_de: garantiaDe, garantias });
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
    const numericId = Number(id);
    const body = (await request.json()) as Record<string, unknown>;

    const db = getDb();
    const existing = db
      .prepare('SELECT id, status FROM oficina_ordens WHERE id=?')
      .get(numericId) as { id: number; status: string } | undefined;
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

    let novoStatus: string | null = null;
    if ('status' in body) {
      const s = toStr(body.status);
      if (!isOficinaStatus(s)) {
        return NextResponse.json(
          { error: `Status inválido. Valores aceitos: ${OFICINA_STATUSES.join(', ')}` },
          { status: 400 },
        );
      }
      // Não permite sair de um status terminal.
      if (s !== existing.status && isTerminal(existing.status)) {
        return NextResponse.json(
          {
            error:
              'Esta OS já está finalizada ou cancelada. Para continuar atendendo o mesmo problema, abra uma garantia.',
          },
          { status: 400 },
        );
      }
      if (s !== existing.status) {
        novoStatus = s;
        sets.push('status=?');
        vals.push(s);
        if (s === 'finalizada' && !('data_conclusao' in body)) {
          sets.push('data_conclusao=?');
          vals.push(new Date().toISOString().slice(0, 10));
        }
      }
    }

    if (sets.length === 0) {
      return NextResponse.json({ ok: true, changed: 0 });
    }

    sets.push("updated_at=datetime('now','localtime')");
    vals.push(numericId);

    // Quando muda o status, grava a mudança + o UPDATE numa transação só.
    const tx = db.transaction(() => {
      db.prepare(`UPDATE oficina_ordens SET ${sets.join(', ')} WHERE id=?`).run(...vals);
      if (novoStatus) {
        const mensagem = toStr(body.mensagem_historico) || toStr(body.observacoes);
        const autor = toStr(body.autor);
        db.prepare(
          `INSERT INTO oficina_historico (ordem_id, status_anterior, status_novo, mensagem, autor)
           VALUES (?, ?, ?, ?, ?)`,
        ).run(numericId, existing.status, novoStatus, mensagem, autor);
      }
    });
    tx();

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
