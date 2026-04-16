'use client';

import { useEffect, useState } from 'react';
import { useToast } from '@/components/Toast';
import styles from '../vendas/page.module.css';

type Lancamento = {
  id: number;
  tipo: string;
  categoria: string;
  valor: number;
  descricao: string;
  ref_tipo: string | null;
  ref_id: number | null;
  data: string;
};

type Comissao = {
  id: number;
  venda_id: number;
  vendedor_id: number;
  vendedor_nome: string;
  comprador_nome: string;
  valor_venda: number;
  valor: number;
  pago: number;
  data_pagamento: string | null;
};

type Repasse = {
  id: number;
  dono_nome: string;
  moto_nome: string;
  valor_repasse: number;
  custo_revisao: number;
  repasse_pago: number;
  status: string;
};

type FinanceiroData = {
  lancamentos: Lancamento[];
  entradas: number;
  saidas: number;
  saldo: number;
  comissoes: Comissao[];
  repasses: Repasse[];
};

const CAT_LABELS: Record<string, string> = {
  compra_moto: 'Compra de moto',
  venda_moto: 'Venda de moto',
  oficina_receita: 'Receita oficina',
  oficina_custo: 'Custo oficina',
  comissao: 'Comissão',
  repasse_consignada: 'Repasse consignada',
  sinal_reserva: 'Sinal de reserva',
  devolucao_sinal: 'Devolução de sinal',
  despesa_geral: 'Despesa geral',
};

function fmtBRL(v: number): string {
  return `R$ ${v.toLocaleString('pt-BR')}`;
}

function fmtDate(iso: string): string {
  if (!iso) return '—';
  return new Date(iso + 'T00:00:00').toLocaleDateString('pt-BR');
}

function pad2(n: number) { return String(n).padStart(2, '0'); }
function toISO(d: Date) { return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`; }

export default function FinanceiroPage() {
  const { showToast } = useToast();
  const [data, setData] = useState<FinanceiroData | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'lancamentos' | 'comissoes' | 'repasses'>('lancamentos');

  const now = new Date();
  const [from, setFrom] = useState(() => toISO(new Date(now.getFullYear(), now.getMonth(), 1)));
  const [to, setTo] = useState(() => toISO(now));

  const reload = async () => {
    setLoading(true);
    try {
      const r = await fetch(`/api/financeiro?from=${from}&to=${to}`);
      if (!r.ok) throw new Error('fail');
      setData(await r.json());
    } catch {
      showToast('Erro ao carregar financeiro', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { reload(); }, [from, to]);

  const marcarComissaoPaga = async (id: number) => {
    try {
      const r = await fetch(`/api/financeiro/comissao/${id}`, { method: 'PATCH' });
      if (!r.ok) throw new Error('fail');
      showToast('Comissão marcada como paga', 'success');
      await reload();
    } catch {
      showToast('Erro', 'error');
    }
  };

  const marcarRepassePago = async (id: number) => {
    try {
      const r = await fetch(`/api/financeiro/repasse/${id}`, { method: 'PATCH' });
      if (!r.ok) throw new Error('fail');
      showToast('Repasse marcado como pago', 'success');
      await reload();
    } catch {
      showToast('Erro', 'error');
    }
  };

  const comissoesPendentes = data?.comissoes.filter((c) => !c.pago) || [];
  const repassesPendentes = data?.repasses.filter((r) => !r.repasse_pago) || [];

  return (
    <div className={styles.wrap}>
      {/* Summary cards */}
      <div className={styles.cards}>
        <div className={styles.card}>
          <div className={styles.cardLabel}>Entradas</div>
          <div className={styles.cardValue} style={{ color: '#155724' }}>
            {data ? fmtBRL(data.entradas) : '—'}
          </div>
        </div>
        <div className={styles.card}>
          <div className={styles.cardLabel}>Saídas</div>
          <div className={styles.cardValue} style={{ color: '#dc3545' }}>
            {data ? fmtBRL(data.saidas) : '—'}
          </div>
        </div>
        <div className={styles.card}>
          <div className={styles.cardLabel}>Saldo</div>
          <div className={styles.cardValue} style={{ color: data && data.saldo >= 0 ? '#155724' : '#dc3545' }}>
            {data ? fmtBRL(data.saldo) : '—'}
          </div>
        </div>
      </div>

      {/* Date filter */}
      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <label style={{ fontSize: '0.82rem', color: '#555' }}>
          De <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} style={{ marginLeft: 4, padding: '6px 8px', border: '1px solid #e4e4e0', fontSize: '0.85rem' }} />
        </label>
        <label style={{ fontSize: '0.82rem', color: '#555' }}>
          Até <input type="date" value={to} onChange={(e) => setTo(e.target.value)} style={{ marginLeft: 4, padding: '6px 8px', border: '1px solid #e4e4e0', fontSize: '0.85rem' }} />
        </label>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
        {([
          ['lancamentos', 'Lançamentos'] as const,
          ['comissoes', `Comissões (${comissoesPendentes.length})`] as const,
          ['repasses', `Repasses (${repassesPendentes.length})`] as const,
        ]).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            style={{
              padding: '8px 16px',
              fontFamily: "'Barlow Condensed', sans-serif",
              fontWeight: 700,
              fontSize: '0.82rem',
              letterSpacing: '0.08em',
              textTransform: 'uppercase' as const,
              border: 'none',
              cursor: 'pointer',
              background: tab === key ? '#27367D' : '#e4e4e0',
              color: tab === key ? '#fff' : '#555',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Lancamentos tab */}
      {tab === 'lancamentos' && (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Data</th>
                <th>Tipo</th>
                <th>Categoria</th>
                <th>Descrição</th>
                <th style={{ textAlign: 'right' }}>Valor</th>
              </tr>
            </thead>
            <tbody>
              {(data?.lancamentos || []).map((l) => (
                <tr key={l.id}>
                  <td className={styles.tdSub}>{fmtDate(l.data)}</td>
                  <td>
                    <span className={styles.badge} style={{
                      background: l.tipo === 'entrada' ? '#d4edda' : '#fcdcdc',
                      color: l.tipo === 'entrada' ? '#155724' : '#721c24',
                    }}>
                      {l.tipo === 'entrada' ? 'Entrada' : 'Saída'}
                    </span>
                  </td>
                  <td className={styles.tdSub}>{CAT_LABELS[l.categoria] || l.categoria}</td>
                  <td style={{ maxWidth: 300 }}>{l.descricao}</td>
                  <td style={{ textAlign: 'right', fontWeight: 600, color: l.tipo === 'entrada' ? '#155724' : '#dc3545' }}>
                    {l.tipo === 'entrada' ? '+' : '-'} {fmtBRL(l.valor)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!loading && (!data || data.lancamentos.length === 0) && (
            <div className={styles.empty}>Nenhum lançamento no período.</div>
          )}
          {loading && <div className={styles.empty}>Carregando...</div>}
        </div>
      )}

      {/* Comissoes tab */}
      {tab === 'comissoes' && (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Vendedor</th>
                <th>Venda</th>
                <th>Valor</th>
                <th>Status</th>
                <th>Ação</th>
              </tr>
            </thead>
            <tbody>
              {(data?.comissoes || []).map((c) => (
                <tr key={c.id}>
                  <td className={styles.tdName}>{c.vendedor_nome || '—'}</td>
                  <td className={styles.tdSub}>Venda #{c.venda_id} — {c.comprador_nome}</td>
                  <td className={styles.tdPreco}>R$ {c.valor}</td>
                  <td>
                    <span className={styles.badge} style={{
                      background: c.pago ? '#d4edda' : '#fff3cd',
                      color: c.pago ? '#155724' : '#856404',
                    }}>
                      {c.pago ? 'Pago' : 'Pendente'}
                    </span>
                  </td>
                  <td>
                    {!c.pago && (
                      <button
                        type="button"
                        onClick={() => marcarComissaoPaga(c.id)}
                        style={{
                          background: 'none', border: '1px solid #d4edda', padding: '4px 10px',
                          fontSize: '0.72rem', cursor: 'pointer', fontFamily: "'Barlow Condensed', sans-serif",
                          fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
                          color: '#155724',
                        }}
                      >
                        Marcar pago
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!loading && (!data || data.comissoes.length === 0) && (
            <div className={styles.empty}>Nenhuma comissão registrada.</div>
          )}
        </div>
      )}

      {/* Repasses tab */}
      {tab === 'repasses' && (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Dono</th>
                <th>Moto</th>
                <th>Repasse</th>
                <th>Revisão</th>
                <th>Status</th>
                <th>Ação</th>
              </tr>
            </thead>
            <tbody>
              {(data?.repasses || []).map((r) => (
                <tr key={r.id}>
                  <td className={styles.tdName}>{r.dono_nome}</td>
                  <td className={styles.tdSub}>{r.moto_nome || '—'}</td>
                  <td className={styles.tdPreco}>{fmtBRL(r.valor_repasse)}</td>
                  <td className={styles.tdSub}>
                    {r.custo_revisao > 0 ? `- ${fmtBRL(r.custo_revisao)}` : '—'}
                  </td>
                  <td>
                    <span className={styles.badge} style={{
                      background: r.repasse_pago ? '#d4edda' : '#fff3cd',
                      color: r.repasse_pago ? '#155724' : '#856404',
                    }}>
                      {r.repasse_pago ? 'Pago' : 'Pendente'}
                    </span>
                  </td>
                  <td>
                    {!r.repasse_pago && (
                      <button
                        type="button"
                        onClick={() => marcarRepassePago(r.id)}
                        style={{
                          background: 'none', border: '1px solid #d4edda', padding: '4px 10px',
                          fontSize: '0.72rem', cursor: 'pointer', fontFamily: "'Barlow Condensed', sans-serif",
                          fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
                          color: '#155724',
                        }}
                      >
                        Marcar pago
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!loading && (!data || data.repasses.length === 0) && (
            <div className={styles.empty}>Nenhum repasse de consignada.</div>
          )}
        </div>
      )}
    </div>
  );
}
