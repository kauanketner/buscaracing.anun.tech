import { NextRequest, NextResponse } from 'next/server';
import { getVendedorFromRequest } from '@/lib/vendedor-auth';
import { getDb } from '@/lib/db';
import { upsertClientePorSnapshot } from '@/lib/clientes-helper';

export const dynamic = 'force-dynamic';

/** GET /api/vendedor/leads — leads registered by this vendedor */
export async function GET(request: NextRequest) {
  const vend = getVendedorFromRequest(request);
  if (!vend) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const db = getDb();
  const rows = db
    .prepare(
      `SELECT l.*, m.nome AS moto_nome, m.marca AS moto_marca
       FROM leads l
       LEFT JOIN motos m ON l.moto_id = m.id
       WHERE l.vendedor_id = ?
       ORDER BY l.id DESC`,
    )
    .all(vend.id);
  return NextResponse.json(rows);
}

/** POST /api/vendedor/leads — register new lead */
export async function POST(request: NextRequest) {
  const vend = getVendedorFromRequest(request);
  if (!vend) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  try {
    const db = getDb();
    const body = (await request.json()) as {
      moto_id?: number;
      nome: string;
      telefone?: string;
      origem?: string;
      notas?: string;
    };
    const nome = (body.nome || '').trim();
    if (!nome) return NextResponse.json({ error: 'Nome obrigatório' }, { status: 400 });

    // Auto-vincula cliente no banco central (cria ou encontra)
    const clienteId = upsertClientePorSnapshot(db, {
      nome,
      telefone: body.telefone,
    });

    const result = db
      .prepare(
        'INSERT INTO leads (moto_id, vendedor_id, cliente_id, nome, telefone, origem, notas) VALUES (?, ?, ?, ?, ?, ?, ?)',
      )
      .run(
        body.moto_id || null,
        vend.id,
        clienteId,
        nome,
        (body.telefone || '').trim(),
        (body.origem || '').trim(),
        (body.notas || '').trim(),
      );
    return NextResponse.json({ ok: true, id: Number(result.lastInsertRowid) });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Erro interno';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
