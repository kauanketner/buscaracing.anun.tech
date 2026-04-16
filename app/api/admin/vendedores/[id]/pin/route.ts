import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { hashPin } from '@/lib/vendedor-auth';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ id: string }> };

/** POST — set or generate PIN for a vendedor */
export async function POST(request: NextRequest, context: RouteContext) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }
  const { id } = await context.params;
  const db = getDb();
  const vend = db.prepare('SELECT id FROM vendedores WHERE id=?').get(Number(id));
  if (!vend) return NextResponse.json({ error: 'Vendedor não encontrado' }, { status: 404 });

  const body = (await request.json()) as { pin?: string; gerar?: boolean };
  let pin: string;
  if (body.gerar) {
    pin = String(crypto.randomInt(100000, 999999));
  } else {
    pin = (body.pin || '').trim();
    if (!/^\d{6}$/.test(pin)) {
      return NextResponse.json({ error: 'PIN deve ter 6 dígitos' }, { status: 400 });
    }
  }

  const hashed = hashPin(pin);
  db.prepare(
    "UPDATE vendedores SET pin_hash=?, pin_ativo=1, pin_trocado_em=datetime('now','localtime') WHERE id=?",
  ).run(hashed, Number(id));

  return NextResponse.json({ ok: true, pin });
}

/** DELETE — revoke PIN access */
export async function DELETE(request: NextRequest, context: RouteContext) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }
  const { id } = await context.params;
  const db = getDb();
  db.prepare('UPDATE vendedores SET pin_ativo=0 WHERE id=?').run(Number(id));
  return NextResponse.json({ ok: true });
}
