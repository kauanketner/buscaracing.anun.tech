import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/auth';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

function parseDate(s: string | null): string | null {
  if (!s) return null;
  // expect YYYY-MM-DD
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  return s;
}

function firstOfCurrentMonthISO(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}-01`;
}

function todayISO(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export async function GET(request: NextRequest) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  try {
    const url = new URL(request.url);
    const from = parseDate(url.searchParams.get('from')) || firstOfCurrentMonthISO();
    const to = parseDate(url.searchParams.get('to')) || todayISO();
    // inclusive end-of-day
    const toEnd = `${to} 23:59:59`;
    const fromStart = `${from} 00:00:00`;

    const db = getDb();

    // Inventory (current state — not period-filtered)
    const total = (db.prepare('SELECT COUNT(*) AS c FROM motos').get() as { c: number }).c;
    const anunciadas = (
      db
        .prepare('SELECT COUNT(*) AS c FROM motos WHERE ativo=1 AND COALESCE(vendida,0)=0')
        .get() as { c: number }
    ).c;
    const destaque = (
      db
        .prepare('SELECT COUNT(*) AS c FROM motos WHERE destaque=1 AND ativo=1 AND COALESCE(vendida,0)=0')
        .get() as { c: number }
    ).c;
    const estoqueNovas = (
      db
        .prepare("SELECT COUNT(*) AS c FROM motos WHERE ativo=1 AND COALESCE(vendida,0)=0 AND condicao='nova'")
        .get() as { c: number }
    ).c;
    const estoqueUsadas = (
      db
        .prepare("SELECT COUNT(*) AS c FROM motos WHERE ativo=1 AND COALESCE(vendida,0)=0 AND condicao='usada'")
        .get() as { c: number }
    ).c;

    // Média de dias em estoque (para anunciadas)
    const mediaDiasRow = db
      .prepare(
        `SELECT AVG((julianday('now','localtime') - julianday(created_at))) AS media
         FROM motos
         WHERE ativo=1 AND COALESCE(vendida,0)=0 AND created_at IS NOT NULL`,
      )
      .get() as { media: number | null };
    const media_dias_estoque = mediaDiasRow.media != null ? Math.round(mediaDiasRow.media) : 0;

    // Faixas de dias em estoque
    const faixasDias = db
      .prepare(
        `SELECT
           SUM(CASE WHEN dias <= 30 THEN 1 ELSE 0 END) AS ate30,
           SUM(CASE WHEN dias > 30 AND dias <= 60 THEN 1 ELSE 0 END) AS de31a60,
           SUM(CASE WHEN dias > 60 AND dias <= 90 THEN 1 ELSE 0 END) AS de61a90,
           SUM(CASE WHEN dias > 90 THEN 1 ELSE 0 END) AS acima90
         FROM (
           SELECT CAST(julianday('now','localtime') - julianday(created_at) AS INTEGER) AS dias
           FROM motos WHERE ativo=1 AND COALESCE(vendida,0)=0 AND created_at IS NOT NULL
         )`,
      )
      .get() as { ate30: number | null; de31a60: number | null; de61a90: number | null; acima90: number | null };

    // Breakdown por categoria (estoque atual)
    const por_categoria = db
      .prepare(
        `SELECT categoria, COUNT(*) AS count FROM motos
         WHERE ativo=1 AND COALESCE(vendida,0)=0
         GROUP BY categoria ORDER BY count DESC`,
      )
      .all();

    // Vendas no período
    const vendasRow = db
      .prepare(
        `SELECT COUNT(*) AS count, COALESCE(SUM(valor_venda_final),0) AS receita
         FROM motos
         WHERE vendida=1 AND data_venda IS NOT NULL
           AND data_venda BETWEEN ? AND ?`,
      )
      .get(fromStart, toEnd) as { count: number; receita: number };

    // Top vendedores no período
    const top_vendedores = db
      .prepare(
        `SELECT v.id, v.nome,
                COUNT(m.id) AS vendas,
                COALESCE(SUM(m.valor_venda_final),0) AS receita
         FROM motos m
         JOIN vendedores v ON v.id = m.vendedor_id
         WHERE m.vendida=1 AND m.data_venda IS NOT NULL
           AND m.data_venda BETWEEN ? AND ?
         GROUP BY v.id, v.nome
         ORDER BY vendas DESC, receita DESC`,
      )
      .all(fromStart, toEnd);

    // Vendas por categoria no período
    const vendas_por_categoria = db
      .prepare(
        `SELECT categoria, COUNT(*) AS count
         FROM motos
         WHERE vendida=1 AND data_venda IS NOT NULL
           AND data_venda BETWEEN ? AND ?
         GROUP BY categoria ORDER BY count DESC`,
      )
      .all(fromStart, toEnd);

    // ----- New: vendas table metrics -----
    const vendasTableRow = db
      .prepare(
        `SELECT COUNT(*) AS count, COALESCE(SUM(valor_venda),0) AS receita,
                COALESCE(SUM(comissao_valor),0) AS comissoes
         FROM vendas
         WHERE data_venda BETWEEN ? AND ?`,
      )
      .get(fromStart, toEnd) as { count: number; receita: number; comissoes: number };

    // Margem: receita - custo_compra de motos vendidas no período
    const margemRow = db
      .prepare(
        `SELECT COALESCE(SUM(v.valor_venda - COALESCE(m.valor_compra,0)),0) AS margem_bruta
         FROM vendas v
         JOIN motos m ON v.moto_id = m.id
         WHERE v.data_venda BETWEEN ? AND ?
           AND m.origem != 'consignada'`,
      )
      .get(fromStart, toEnd) as { margem_bruta: number };

    // Comissões a pagar
    const comissoesPendentes = (
      db.prepare('SELECT COALESCE(SUM(valor),0) AS total FROM comissoes WHERE pago=0').get() as { total: number }
    ).total;

    // Repasses consignada pendentes
    const repassesPendentes = (
      db.prepare("SELECT COALESCE(SUM(valor_repasse),0) AS total FROM consignacoes WHERE repasse_pago=0 AND status IN ('vendida','entregue') AND valor_repasse > 0").get() as { total: number }
    ).total;

    // Reservas ativas
    const reservasAtivas = (
      db.prepare("SELECT COUNT(*) AS c FROM reservas WHERE status='ativa'").get() as { c: number }
    ).c;

    // Consignacoes ativas
    const consigAtivas = (
      db.prepare("SELECT COUNT(*) AS c FROM consignacoes WHERE status='ativa'").get() as { c: number }
    ).c;

    // Activity feed (last 20 events)
    const feed: { tipo: string; msg: string; data: string }[] = [];
    const recentVendas = db
      .prepare(
        `SELECT v.id, v.comprador_nome, v.valor_venda, v.data_venda, m.nome AS moto_nome
         FROM vendas v LEFT JOIN motos m ON v.moto_id=m.id
         ORDER BY v.id DESC LIMIT 5`,
      )
      .all() as { id: number; comprador_nome: string; valor_venda: number; data_venda: string; moto_nome: string }[];
    for (const v of recentVendas) {
      feed.push({ tipo: 'venda', msg: `Venda #${v.id}: ${v.moto_nome} para ${v.comprador_nome} — R$ ${Number(v.valor_venda).toLocaleString('pt-BR')}`, data: v.data_venda });
    }
    const recentEntradas = db
      .prepare(
        `SELECT id, nome, marca, estado, created_at FROM motos
         WHERE estado='avaliacao' OR created_at >= datetime('now','-7 days')
         ORDER BY id DESC LIMIT 5`,
      )
      .all() as { id: number; nome: string; marca: string; estado: string; created_at: string }[];
    for (const e of recentEntradas) {
      if (!recentVendas.some(v => v.moto_nome === e.nome)) {
        feed.push({ tipo: 'entrada', msg: `Entrada: ${e.nome} (${e.marca})`, data: e.created_at?.slice(0, 10) || '' });
      }
    }
    feed.sort((a, b) => (b.data || '').localeCompare(a.data || ''));

    // Alerts
    const alertas: { tipo: string; msg: string }[] = [];
    const reservasExpirando = db
      .prepare("SELECT r.id, r.cliente_nome, m.nome AS moto_nome, r.data_expira FROM reservas r LEFT JOIN motos m ON r.moto_id=m.id WHERE r.status='ativa' AND r.data_expira <= date('now','+2 days')")
      .all() as { id: number; cliente_nome: string; moto_nome: string; data_expira: string }[];
    for (const r of reservasExpirando) {
      alertas.push({ tipo: 'reserva', msg: `Reserva de ${r.cliente_nome} (${r.moto_nome}) expira em ${r.data_expira}` });
    }
    const consigParadas = db
      .prepare("SELECT c.id, c.dono_nome, m.nome AS moto_nome FROM consignacoes c LEFT JOIN motos m ON c.moto_id=m.id WHERE c.status='ativa' AND c.data_entrada <= date('now','-30 days')")
      .all() as { id: number; dono_nome: string; moto_nome: string }[];
    for (const c of consigParadas) {
      alertas.push({ tipo: 'consignada', msg: `${c.moto_nome} (consignada de ${c.dono_nome}) há mais de 30 dias sem venda` });
    }

    return NextResponse.json({
      periodo: { from, to },
      total,
      anunciadas,
      destaque,
      estoque: {
        novas: estoqueNovas,
        usadas: estoqueUsadas,
      },
      media_dias_estoque,
      dias_estoque_faixas: {
        ate30: faixasDias.ate30 || 0,
        de31a60: faixasDias.de31a60 || 0,
        de61a90: faixasDias.de61a90 || 0,
        acima90: faixasDias.acima90 || 0,
      },
      por_categoria,
      vendas_periodo: {
        count: vendasTableRow.count || vendasRow.count || 0,
        receita: vendasTableRow.receita || vendasRow.receita || 0,
        comissoes: vendasTableRow.comissoes || 0,
      },
      margem_bruta: margemRow.margem_bruta || 0,
      comissoes_pendentes: comissoesPendentes,
      repasses_pendentes: repassesPendentes,
      reservas_ativas: reservasAtivas,
      consignadas_ativas: consigAtivas,
      vendas_por_categoria,
      top_vendedores,
      feed: feed.slice(0, 10),
      alertas,
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Erro interno';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
