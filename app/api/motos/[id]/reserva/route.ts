import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/auth';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ id: string }> };

/** POST /api/motos/[id]/reserva — cria reserva + transiciona moto */
export async function POST(request: NextRequest, context: RouteContext) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }
  try {
    const { id } = await context.params;
    const db = getDb();
    const moto = db
      .prepare('SELECT id, estado, nome, marca FROM motos WHERE id=?')
      .get(Number(id)) as { id: number; estado: string; nome: string; marca: string } | undefined;
    if (!moto) {
      return NextResponse.json({ error: 'Moto não encontrada' }, { status: 404 });
    }
    if (moto.estado !== 'anunciada') {
      return NextResponse.json({ error: 'Só motos anunciadas podem ser reservadas' }, { status: 400 });
    }

    const body = (await request.json()) as {
      cliente_id?: number | null;
      cliente_nome?: string;
      cliente_tel?: string;
      valor_sinal?: number;
      dias_prazo?: number;
    };
    const clienteNome = (body.cliente_nome || '').trim();
    if (!clienteNome) {
      return NextResponse.json({ error: 'Nome do cliente obrigatório' }, { status: 400 });
    }

    const sinal = body.valor_sinal ?? 500;
    const dias = body.dias_prazo ?? 7;
    const hoje = new Date();
    const expira = new Date(hoje);
    expira.setDate(expira.getDate() + dias);
    const dataExpira = expira.toISOString().slice(0, 10);

    const tx = db.transaction(() => {
      const result = db
        .prepare(
          `INSERT INTO reservas (moto_id, cliente_id, cliente_nome, cliente_tel, valor_sinal, dias_prazo, data_expira)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(moto.id, body.cliente_id || null, clienteNome, (body.cliente_tel || '').trim(), sinal, dias, dataExpira);

      // Transition moto → reservada
      db.prepare("UPDATE motos SET estado='reservada', ativo=1 WHERE id=?").run(moto.id);

      // Financial entry: sinal received
      if (sinal > 0) {
        db.prepare(
          `INSERT INTO lancamentos (tipo, categoria, valor, descricao, ref_tipo, ref_id)
           VALUES ('entrada', 'sinal_reserva', ?, ?, 'reserva', ?)`,
        ).run(sinal, `Sinal de ${clienteNome} — ${moto.nome}`, Number(result.lastInsertRowid));
      }

      return Number(result.lastInsertRowid);
    });

    const reservaId = tx();
    return NextResponse.json({ ok: true, reserva_id: reservaId, data_expira: dataExpira });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Erro interno';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/** DELETE /api/motos/[id]/reserva — cancela reserva ativa + volta pra anunciada */
export async function DELETE(request: NextRequest, context: RouteContext) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }
  try {
    const { id } = await context.params;
    const db = getDb();
    const reserva = db
      .prepare("SELECT id, valor_sinal, cliente_nome FROM reservas WHERE moto_id=? AND status='ativa' ORDER BY id DESC LIMIT 1")
      .get(Number(id)) as { id: number; valor_sinal: number; cliente_nome: string } | undefined;
    if (!reserva) {
      return NextResponse.json({ error: 'Nenhuma reserva ativa' }, { status: 404 });
    }

    const tx = db.transaction(() => {
      db.prepare("UPDATE reservas SET status='cancelada' WHERE id=?").run(reserva.id);
      db.prepare("UPDATE motos SET estado='anunciada', ativo=1 WHERE id=?").run(Number(id));

      // Financial entry: sinal returned
      if (reserva.valor_sinal > 0) {
        db.prepare(
          `INSERT INTO lancamentos (tipo, categoria, valor, descricao, ref_tipo, ref_id)
           VALUES ('saida', 'devolucao_sinal', ?, ?, 'reserva', ?)`,
        ).run(reserva.valor_sinal, `Devolução sinal — ${reserva.cliente_nome}`, reserva.id);
      }
    });
    tx();

    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Erro interno';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
