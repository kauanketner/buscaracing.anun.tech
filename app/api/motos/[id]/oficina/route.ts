import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/auth';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ id: string }> };

/** POST /api/motos/[id]/oficina — cria OS vinculada a esta moto e transiciona estado */
export async function POST(request: NextRequest, context: RouteContext) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }
  try {
    const { id } = await context.params;
    const db = getDb();
    const moto = db
      .prepare('SELECT id, nome, marca, modelo, ano, placa, km, nome_cliente, estado FROM motos WHERE id=?')
      .get(Number(id)) as Record<string, unknown> | undefined;
    if (!moto) {
      return NextResponse.json({ error: 'Moto não encontrada' }, { status: 404 });
    }
    if (moto.estado !== 'avaliacao' && moto.estado !== 'disponivel') {
      return NextResponse.json(
        { error: 'Moto não pode ir pra oficina neste estado' },
        { status: 400 },
      );
    }

    const body = (await request.json().catch(() => ({}))) as { descricao?: string };
    const descricao = (body.descricao || 'Revisão / preparação para venda').trim();

    const result = db
      .prepare(
        `INSERT INTO oficina_ordens
          (cliente_nome, moto_id, moto_marca, moto_modelo, moto_ano, moto_placa, moto_km, servico_descricao, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'aberta')`,
      )
      .run(
        (moto.nome_cliente as string) || 'Estoque',
        moto.id,
        moto.marca || '',
        (moto.modelo as string) || (moto.nome as string) || '',
        moto.ano ?? null,
        (moto.placa as string) || '',
        moto.km ?? null,
        descricao,
      );

    // Transition moto → em_oficina
    db.prepare("UPDATE motos SET estado='em_oficina', ativo=0 WHERE id=?").run(moto.id);

    return NextResponse.json({
      ok: true,
      ordem_id: Number(result.lastInsertRowid),
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Erro interno';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
