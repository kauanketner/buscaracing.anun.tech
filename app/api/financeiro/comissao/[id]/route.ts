import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/auth';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ id: string }> };

/** PATCH /api/financeiro/comissao/[id] — mark commission as paid */
export async function PATCH(request: NextRequest, context: RouteContext) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }
  const { id } = await context.params;
  const db = getDb();
  db.prepare("UPDATE comissoes SET pago=1, data_pagamento=date('now','localtime') WHERE id=?")
    .run(Number(id));
  return NextResponse.json({ ok: true });
}
