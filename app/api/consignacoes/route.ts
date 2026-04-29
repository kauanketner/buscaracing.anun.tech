import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { isAuthenticated } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { upsertClientePorSnapshot } from '@/lib/clientes-helper';

export const dynamic = 'force-dynamic';

/** GET /api/consignacoes — list all consignments (admin) */
export async function GET(request: NextRequest) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT c.*,
              m.nome AS moto_nome, m.marca AS moto_marca, m.imagem AS moto_imagem,
              m.estado AS moto_estado, m.preco AS moto_preco
       FROM consignacoes c
       LEFT JOIN motos m ON c.moto_id = m.id
       ORDER BY c.id DESC`,
    )
    .all();
  return NextResponse.json(rows);
}

/** POST /api/consignacoes — create consignment for a moto */
export async function POST(request: NextRequest) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }
  try {
    const db = getDb();
    const body = (await request.json()) as {
      moto_id: number;
      dono_nome: string;
      dono_telefone?: string;
      dono_email?: string;
      dono_pix?: string;
      margem_pct?: number;
      valor_repasse?: number | null;
    };

    if (!body.moto_id || !(body.dono_nome || '').trim()) {
      return NextResponse.json({ error: 'moto_id e dono_nome obrigatórios' }, { status: 400 });
    }

    // Auto-vincula cliente no banco central (cria ou encontra)
    const clienteId = upsertClientePorSnapshot(db, {
      nome: body.dono_nome,
      telefone: body.dono_telefone,
      email: body.dono_email,
    });

    // Generate unique token for consignante app
    const token = crypto.randomBytes(16).toString('hex');

    const result = db
      .prepare(
        `INSERT INTO consignacoes (moto_id, cliente_id, dono_nome, dono_telefone, dono_email, dono_pix, margem_pct, valor_repasse, token)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        body.moto_id,
        clienteId,
        body.dono_nome.trim(),
        (body.dono_telefone || '').trim(),
        (body.dono_email || '').trim(),
        (body.dono_pix || '').trim(),
        body.margem_pct ?? 0,
        body.valor_repasse ?? null,
        token,
      );

    const consigId = Number(result.lastInsertRowid);

    // Link moto to this consignment
    db.prepare('UPDATE motos SET consignacao_id=?, origem=? WHERE id=?')
      .run(consigId, 'consignada', body.moto_id);

    return NextResponse.json({ ok: true, id: consigId, token });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Erro interno';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
