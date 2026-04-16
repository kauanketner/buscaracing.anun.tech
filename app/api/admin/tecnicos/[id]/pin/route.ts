import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getDb } from '@/lib/db';
import { isAuthenticated } from '@/lib/auth';
import { hashPin } from '@/lib/tecnico-auth';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ id: string }> };

/** POST: define/substitui PIN de um técnico e ativa o acesso. */
export async function POST(request: NextRequest, context: RouteContext) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }
  const { id: idParam } = await context.params;
  const id = Number(idParam);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
  }
  const body = (await request.json().catch(() => ({}))) as {
    pin?: unknown;
    gerar?: unknown;
  };
  let pin = typeof body.pin === 'string' ? body.pin.trim() : '';
  if (body.gerar === true) {
    // Gera PIN aleatório de 6 dígitos
    pin = String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
  }
  if (!/^\d{6}$/.test(pin)) {
    return NextResponse.json(
      { error: 'PIN deve ter exatamente 6 dígitos' },
      { status: 400 },
    );
  }

  const db = getDb();
  const exists = db.prepare('SELECT id FROM mecanicos WHERE id = ?').get(id);
  if (!exists) {
    return NextResponse.json({ error: 'Técnico não encontrado' }, { status: 404 });
  }
  const hash = hashPin(pin);
  db.prepare(
    `UPDATE mecanicos
     SET pin_hash = ?, pin_ativo = 1, pin_trocado_em = datetime('now','localtime')
     WHERE id = ?`,
  ).run(hash, id);

  // Retorna o PIN em texto puro APENAS nesta resposta (pra admin anotar/avisar o técnico)
  return NextResponse.json({ ok: true, pin });
}

/** DELETE: desativa o acesso (zera pin_ativo e apaga o hash). */
export async function DELETE(request: NextRequest, context: RouteContext) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }
  const { id: idParam } = await context.params;
  const id = Number(idParam);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
  }
  const db = getDb();
  db.prepare(
    "UPDATE mecanicos SET pin_ativo = 0, pin_hash = '' WHERE id = ?",
  ).run(id);
  return NextResponse.json({ ok: true });
}
