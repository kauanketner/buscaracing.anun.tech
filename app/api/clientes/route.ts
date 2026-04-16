import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/auth';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * GET /api/clientes — unified CRM view
 *
 * Aggregates clients from: vendas (compradores), oficina (clientes),
 * leads, and reservas. Groups by normalized name + phone.
 */
export async function GET(request: NextRequest) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const db = getDb();

  // Pull all client touchpoints
  const compradores = db
    .prepare(
      `SELECT comprador_nome AS nome, comprador_tel AS telefone, comprador_email AS email,
              'compra' AS tipo, v.id AS ref_id, v.valor_venda AS valor,
              v.data_venda AS data, m.nome AS moto_nome
       FROM vendas v LEFT JOIN motos m ON v.moto_id = m.id`,
    )
    .all() as Record<string, unknown>[];

  const oficina = db
    .prepare(
      `SELECT cliente_nome AS nome, cliente_telefone AS telefone, cliente_email AS email,
              'oficina' AS tipo, o.id AS ref_id, o.valor_final AS valor,
              o.data_entrada AS data, COALESCE(m.nome, o.moto_marca || ' ' || o.moto_modelo) AS moto_nome
       FROM oficina_ordens o LEFT JOIN motos m ON o.moto_id = m.id`,
    )
    .all() as Record<string, unknown>[];

  const leadsRows = db
    .prepare(
      `SELECT l.nome, l.telefone, '' AS email,
              'lead' AS tipo, l.id AS ref_id, NULL AS valor,
              l.created_at AS data, m.nome AS moto_nome
       FROM leads l LEFT JOIN motos m ON l.moto_id = m.id`,
    )
    .all() as Record<string, unknown>[];

  const reservasRows = db
    .prepare(
      `SELECT r.cliente_nome AS nome, r.cliente_tel AS telefone, '' AS email,
              'reserva' AS tipo, r.id AS ref_id, r.valor_sinal AS valor,
              r.data_inicio AS data, m.nome AS moto_nome
       FROM reservas r LEFT JOIN motos m ON r.moto_id = m.id`,
    )
    .all() as Record<string, unknown>[];

  // Merge all into touchpoints
  const allTouchpoints = [...compradores, ...oficina, ...leadsRows, ...reservasRows];

  // Group by normalized key (lowercase name + phone digits)
  const normalize = (nome: string, tel: string): string => {
    const n = (nome || '').trim().toLowerCase().replace(/\s+/g, ' ');
    const t = (tel || '').replace(/\D/g, '');
    return `${n}|${t}`;
  };

  type ClienteGroup = {
    nome: string;
    telefone: string;
    email: string;
    touchpoints: {
      tipo: string;
      ref_id: number;
      valor: number | null;
      data: string;
      moto_nome: string | null;
    }[];
  };

  const map = new Map<string, ClienteGroup>();

  for (const tp of allTouchpoints) {
    const nome = (tp.nome as string) || '';
    const telefone = (tp.telefone as string) || '';
    const email = (tp.email as string) || '';
    if (!nome.trim()) continue;

    const key = normalize(nome, telefone);
    let group = map.get(key);
    if (!group) {
      group = { nome: nome.trim(), telefone: telefone.trim(), email: email.trim(), touchpoints: [] };
      map.set(key, group);
    }
    // Update email if we have a better one
    if (email.trim() && !group.email) group.email = email.trim();

    group.touchpoints.push({
      tipo: tp.tipo as string,
      ref_id: tp.ref_id as number,
      valor: tp.valor as number | null,
      data: (tp.data as string) || '',
      moto_nome: (tp.moto_nome as string) || null,
    });
  }

  // Convert to array and sort by most recent interaction
  const clientes = Array.from(map.values()).map((c) => {
    c.touchpoints.sort((a, b) => (b.data || '').localeCompare(a.data || ''));
    const compras = c.touchpoints.filter((t) => t.tipo === 'compra').length;
    const os = c.touchpoints.filter((t) => t.tipo === 'oficina').length;
    const leads = c.touchpoints.filter((t) => t.tipo === 'lead').length;
    const reservas = c.touchpoints.filter((t) => t.tipo === 'reserva').length;
    const totalGasto = c.touchpoints
      .filter((t) => t.tipo === 'compra' && t.valor)
      .reduce((s, t) => s + (t.valor || 0), 0);
    const ultimaInteracao = c.touchpoints[0]?.data || '';

    return {
      ...c,
      compras,
      os,
      leads,
      reservas,
      total_gasto: totalGasto,
      ultima_interacao: ultimaInteracao,
      total_interacoes: c.touchpoints.length,
    };
  });

  clientes.sort((a, b) => (b.ultima_interacao || '').localeCompare(a.ultima_interacao || ''));

  return NextResponse.json(clientes);
}
