import { NextRequest, NextResponse } from 'next/server';
import { getVendedorFromRequest } from '@/lib/vendedor-auth';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

/** GET /api/vendedor/motos — motos available for sale (anunciada/reservada) */
export async function GET(request: NextRequest) {
  const vend = getVendedorFromRequest(request);
  if (!vend) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const db = getDb();
  const rows = db
    .prepare(
      `SELECT id, nome, marca, modelo, ano, preco, imagem, estado, categoria, km,
              CAST(julianday('now','localtime') - julianday(created_at) AS INTEGER) AS dias_estoque
       FROM motos
       WHERE estado IN ('anunciada','reservada')
       ORDER BY id DESC`,
    )
    .all();
  return NextResponse.json(rows);
}
