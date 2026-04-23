import { NextRequest, NextResponse } from 'next/server';
import { getDb, stripAdminFields } from '@/lib/db';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const db = getDb();
    const moto = db
      .prepare('SELECT * FROM motos WHERE id=? AND disponivel_aluguel=1')
      .get(Number(id)) as Record<string, unknown> | undefined;
    if (!moto) {
      return NextResponse.json({ error: 'Moto não encontrada' }, { status: 404 });
    }

    const fotosRows = db
      .prepare(
        'SELECT id, filename FROM fotos WHERE moto_id=? ORDER BY ordem ASC, id ASC',
      )
      .all(Number(id)) as { id: number; filename: string }[];
    const fotos = fotosRows.map((f) => ({
      id: f.id,
      filename: f.filename,
      url: `/fotos/${f.filename}`,
    }));

    const caucaoRow = db
      .prepare("SELECT valor FROM configuracoes WHERE chave='aluguel_caucao_padrao'")
      .get() as { valor: string } | undefined;

    return NextResponse.json({
      ...stripAdminFields(moto),
      fotos,
      valor_caucao: caucaoRow ? Number(caucaoRow.valor) || 0 : 0,
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Erro interno';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
