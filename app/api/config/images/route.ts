import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const db = getDb();
    const rows = db.prepare(
      "SELECT chave, valor FROM configuracoes WHERE chave IN ('hero_img','cat_rua_img','cat_offroad_img','cat_quad_img','cat_infantil_img')"
    ).all() as { chave: string; valor: string }[];
    return NextResponse.json(Object.fromEntries(rows.map(r => [r.chave, r.valor])));
  } catch {
    return NextResponse.json({});
  }
}
