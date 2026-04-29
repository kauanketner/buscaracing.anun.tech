import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { upsertClientePorSnapshot } from '@/lib/clientes-helper';

export const dynamic = 'force-dynamic';

function daysBetween(inicio: string, fim: string): number {
  const a = new Date(inicio + 'T12:00:00').getTime();
  const b = new Date(fim + 'T12:00:00').getTime();
  return Math.round((b - a) / 86400000) + 1; // inclusive
}

const CPF_RE = /^\d{11}$/;
const CNH_RE = /^\d{9,11}$/;

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      moto_id: number;
      data_inicio: string;
      data_fim: string;
      cliente_nome: string;
      telefone: string;
      email?: string;
      cpf: string;
      cnh: string;
      observacoes?: string;
    };

    const motoId = Number(body.moto_id);
    const inicio = (body.data_inicio || '').trim();
    const fim = (body.data_fim || '').trim();
    const nome = (body.cliente_nome || '').trim();
    const tel = (body.telefone || '').trim();
    const cpf = (body.cpf || '').replace(/\D/g, '');
    const cnh = (body.cnh || '').replace(/\D/g, '');

    // Validações
    if (!motoId) return NextResponse.json({ error: 'moto_id inválido' }, { status: 400 });
    if (!/^\d{4}-\d{2}-\d{2}$/.test(inicio) || !/^\d{4}-\d{2}-\d{2}$/.test(fim))
      return NextResponse.json({ error: 'Datas inválidas' }, { status: 400 });
    if (inicio > fim)
      return NextResponse.json({ error: 'data_fim deve ser ≥ data_inicio' }, { status: 400 });
    const hoje = new Date().toISOString().slice(0, 10);
    if (inicio < hoje)
      return NextResponse.json({ error: 'Data de início não pode ser no passado' }, { status: 400 });
    if (!nome || !tel)
      return NextResponse.json({ error: 'Nome e telefone são obrigatórios' }, { status: 400 });
    if (!CPF_RE.test(cpf))
      return NextResponse.json({ error: 'CPF inválido (11 dígitos)' }, { status: 400 });
    if (!CNH_RE.test(cnh))
      return NextResponse.json({ error: 'CNH inválida (9 a 11 dígitos)' }, { status: 400 });

    const db = getDb();

    const moto = db
      .prepare('SELECT id, valor_diaria, disponivel_aluguel FROM motos WHERE id=?')
      .get(motoId) as { id: number; valor_diaria: number | null; disponivel_aluguel: number } | undefined;
    if (!moto || !moto.disponivel_aluguel || !moto.valor_diaria) {
      return NextResponse.json({ error: 'Moto indisponível para aluguel' }, { status: 404 });
    }

    // Conflito com aprovada/ativa (overlap)
    const conflitos = db
      .prepare(
        `SELECT id FROM alugueis WHERE moto_id=? AND status IN ('aprovada','ativa')
         AND NOT (data_fim < ? OR data_inicio > ?)`,
      )
      .all(motoId, inicio, fim) as { id: number }[];
    if (conflitos.length > 0) {
      return NextResponse.json({ error: 'As datas selecionadas estão indisponíveis' }, { status: 409 });
    }

    const dias = daysBetween(inicio, fim);
    const valorTotal = dias * moto.valor_diaria;

    const caucaoRow = db
      .prepare("SELECT valor FROM configuracoes WHERE chave='aluguel_caucao_padrao'")
      .get() as { valor: string } | undefined;
    const caucao = caucaoRow ? Number(caucaoRow.valor) || 0 : 0;

    // Auto-vincula cliente no banco central (cria ou encontra)
    const clienteId = upsertClientePorSnapshot(db, {
      nome,
      telefone: tel,
      email: (body.email || '').trim(),
      cpf_cnpj: cpf,
    });

    const result = db
      .prepare(
        `INSERT INTO alugueis (
          moto_id, cliente_id, status, data_inicio, data_fim, dias,
          valor_diaria, valor_total, valor_caucao,
          cliente_nome, telefone, email, cpf, cnh, observacoes
        ) VALUES (?, ?, 'pendente', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        motoId, clienteId, inicio, fim, dias,
        moto.valor_diaria, valorTotal, caucao,
        nome, tel, (body.email || '').trim(),
        cpf, cnh, (body.observacoes || '').trim(),
      );

    return NextResponse.json({
      ok: true,
      id: Number(result.lastInsertRowid),
      valor_total: valorTotal,
      dias,
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Erro interno';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
