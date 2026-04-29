'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useToast } from '@/components/Toast';
import { useHeaderActions } from '../../HeaderActionsContext';
import styles from '../../vendas/page.module.css';

type Venda = {
  id: number;
  cliente_nome: string;
  cliente_tel: string;
  cliente_cpf: string;
  vendedor_id: number | null;
  vendedor_nome: string | null;
  canal: string;
  forma_pagamento: string;
  parcelas: number;
  valor_bruto: number;
  desconto: number;
  valor_total: number;
  status: string;
  data_venda: string;
  itens_count: number;
};

const FORMA_LABELS: Record<string, string> = {
  pix: 'PIX',
  dinheiro: 'Dinheiro',
  debito: 'Débito',
  credito: 'Crédito',
};

const CANAL_LABELS: Record<string, string> = {
  balcao: 'Balcão',
  site: 'Site',
  whatsapp: 'WhatsApp',
  outro: 'Outro',
};

function fmtDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso.slice(0, 10) + 'T12:00:00').toLocaleDateString('pt-BR');
}
function toISO(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export default function HistoricoPDVPage() {
  const { showToast } = useToast();
  const [vendas, setVendas] = useState<Venda[]>([]);
  const [loading, setLoading] = useState(true);

  const now = new Date();
  const [from, setFrom] = useState(() => toISO(new Date(now.getFullYear(), now.getMonth(), 1)));
  const [to, setTo] = useState(() => toISO(now));
  const [canal, setCanal] = useState('');
  const [status, setStatus] = useState('');

  // Botão "+ Nova venda" no header
  useHeaderActions(
    <Link
      href="/admin/pdv"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '8px 16px',
        background: '#27367D',
        color: '#FDFDFB',
        textDecoration: 'none',
        fontFamily: "'Barlow Condensed', sans-serif",
        fontWeight: 700,
        fontSize: '0.85rem',
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        clipPath: 'polygon(8px 0%, 100% 0%, calc(100% - 8px) 100%, 0% 100%)',
        border: 'none',
        cursor: 'pointer',
      }}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
        <line x1="12" y1="5" x2="12" y2="19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <line x1="5" y1="12" x2="19" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
      Nova venda
    </Link>,
    [],
  );

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (from) params.append('from', from);
      if (to) params.append('to', to);
      if (canal) params.append('canal', canal);
      if (status) params.append('status', status);
      const r = await fetch(`/api/pdv?${params.toString()}`);
      if (!r.ok) throw new Error('fail');
      setVendas(await r.json());
    } catch {
      showToast('Erro ao carregar histórico', 'error');
    } finally {
      setLoading(false);
    }
  }, [from, to, canal, status, showToast]);

  useEffect(() => { reload(); }, [reload]);

  const totalReais = useMemo(
    () => vendas.filter((v) => v.status === 'concluida').reduce((s, v) => s + v.valor_total, 0),
    [vendas],
  );
  const totalConcluidas = vendas.filter((v) => v.status === 'concluida').length;
  const totalCanceladas = vendas.filter((v) => v.status === 'cancelada').length;

  const cancelar = async (v: Venda) => {
    const motivo = window.prompt(
      `Cancelar venda #${v.id} de "${v.cliente_nome}"?\n\n` +
      `Estoque será devolvido e o lançamento financeiro removido.\n\n` +
      `Motivo (opcional):`,
      '',
    );
    if (motivo === null) return;
    try {
      const r = await fetch(`/api/pdv/${v.id}/cancelar`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ motivo }),
      });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        throw new Error(d.error || 'fail');
      }
      showToast('Venda cancelada', 'success');
      await reload();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Erro ao cancelar', 'error');
    }
  };

  return (
    <div className={styles.wrap}>
      {/* Cards resumo */}
      <div className={styles.cards}>
        <div className={styles.card}>
          <div className={styles.cardLabel}>Vendas concluídas</div>
          <div className={styles.cardValue}>{totalConcluidas}</div>
        </div>
        <div className={styles.card}>
          <div className={styles.cardLabel}>Faturamento</div>
          <div className={styles.cardValue}>R$ {totalReais.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
        </div>
        <div className={styles.card}>
          <div className={styles.cardLabel}>Canceladas</div>
          <div className={styles.cardValue}>{totalCanceladas}</div>
        </div>
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 12, alignItems: 'flex-end' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <label style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: '0.7rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#777' }}>De</label>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)}
            style={{ padding: '7px 10px', border: '1.5px solid #e4e4e0', background: '#fafaf8', fontSize: '0.86rem' }} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <label style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: '0.7rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#777' }}>Até</label>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)}
            style={{ padding: '7px 10px', border: '1.5px solid #e4e4e0', background: '#fafaf8', fontSize: '0.86rem' }} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <label style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: '0.7rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#777' }}>Canal</label>
          <select value={canal} onChange={(e) => setCanal(e.target.value)}
            style={{ padding: '7px 10px', border: '1.5px solid #e4e4e0', background: '#fafaf8', fontSize: '0.86rem' }}>
            <option value="">Todos</option>
            {Object.entries(CANAL_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <label style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: '0.7rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#777' }}>Status</label>
          <select value={status} onChange={(e) => setStatus(e.target.value)}
            style={{ padding: '7px 10px', border: '1.5px solid #e4e4e0', background: '#fafaf8', fontSize: '0.86rem' }}>
            <option value="">Todos</option>
            <option value="concluida">Concluídas</option>
            <option value="cancelada">Canceladas</option>
          </select>
        </div>
      </div>

      {/* Tabela */}
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>#</th>
              <th>Data</th>
              <th>Cliente</th>
              <th>Vendedor</th>
              <th>Canal</th>
              <th>Itens</th>
              <th>Pagto</th>
              <th style={{ textAlign: 'right' }}>Total</th>
              <th>Status</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {vendas.map((v) => (
              <tr key={v.id} style={v.status === 'cancelada' ? { opacity: 0.55 } : undefined}>
                <td className={styles.tdId}>{v.id}</td>
                <td className={styles.tdSub}>{fmtDate(v.data_venda)}</td>
                <td>
                  <div className={styles.tdName}>{v.cliente_nome}</div>
                  {v.cliente_tel && <div className={styles.tdSub}>{v.cliente_tel}</div>}
                </td>
                <td className={styles.tdSub}>{v.vendedor_nome || '—'}</td>
                <td>
                  <span className={styles.badge}>{CANAL_LABELS[v.canal] || v.canal}</span>
                </td>
                <td className={styles.tdSub}>{v.itens_count}</td>
                <td className={styles.tdSub}>
                  {FORMA_LABELS[v.forma_pagamento] || v.forma_pagamento}
                  {v.forma_pagamento === 'credito' && v.parcelas > 1 && ` ${v.parcelas}x`}
                </td>
                <td className={styles.tdPreco} style={{ textAlign: 'right' }}>
                  R$ {Number(v.valor_total).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </td>
                <td>
                  {v.status === 'cancelada' ? (
                    <span className={styles.badge} style={{ background: '#fcdcdc', color: '#721c24' }}>Cancelada</span>
                  ) : (
                    <span className={styles.badge} style={{ background: '#d4edda', color: '#155724' }}>Concluída</span>
                  )}
                </td>
                <td>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <a
                      href={`/api/contratos/pdv/${v.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        background: 'none',
                        border: '1px solid #e4e4e0',
                        padding: '4px 10px',
                        fontFamily: "'Barlow Condensed', sans-serif",
                        fontWeight: 700,
                        fontSize: '0.7rem',
                        letterSpacing: '0.06em',
                        textTransform: 'uppercase',
                        color: '#27367D',
                        textDecoration: 'none',
                      }}
                    >
                      Recibo
                    </a>
                    {v.status === 'concluida' && (
                      <button
                        type="button"
                        onClick={() => cancelar(v)}
                        style={{
                          background: 'none',
                          border: '1px solid #e4e4e0',
                          padding: '4px 10px',
                          fontFamily: "'Barlow Condensed', sans-serif",
                          fontWeight: 700,
                          fontSize: '0.7rem',
                          letterSpacing: '0.06em',
                          textTransform: 'uppercase',
                          color: '#dc3545',
                          cursor: 'pointer',
                        }}
                      >
                        Cancelar
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && vendas.length === 0 && (
          <div className={styles.empty}>
            Nenhuma venda PDV no período. Use o botão &ldquo;Nova venda&rdquo; pra registrar.
          </div>
        )}
        {loading && <div className={styles.empty}>Carregando...</div>}
      </div>
    </div>
  );
}
