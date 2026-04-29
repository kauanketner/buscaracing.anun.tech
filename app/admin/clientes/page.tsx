'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useToast } from '@/components/Toast';
import { useHeaderActions } from '../HeaderActionsContext';
import styles from './page.module.css';

type Cliente = {
  id: number;
  nome: string;
  telefone: string;
  email: string;
  cpf_cnpj: string;
  endereco: string;
  observacoes: string;
  ativo: number;
  compras: number;
  os: number;
  leads: number;
  reservas: number;
  alugueis: number;
  pdv: number;
  total_gasto: number;
  ultima_interacao: string | null;
  created_at: string;
};

const TIPO_LABELS: Record<string, { label: string; bg: string; color: string }> = {
  compra: { label: 'Compra', bg: '#d4edda', color: '#155724' },
  oficina: { label: 'Oficina', bg: '#cce5ff', color: '#004085' },
  lead: { label: 'Lead', bg: '#fff3cd', color: '#856404' },
  reserva: { label: 'Reserva', bg: '#d6d8ff', color: '#27367D' },
  aluguel: { label: 'Aluguel', bg: '#e2d5f0', color: '#5d2e8c' },
  pdv: { label: 'PDV', bg: '#fde2c5', color: '#8b4a00' },
};

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const s = String(iso).slice(0, 10);
  return new Date(s + 'T00:00:00').toLocaleDateString('pt-BR');
}

function fmtBRL(v: number): string {
  return v ? `R$ ${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—';
}

export default function ClientesPage() {
  const { showToast } = useToast();
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const url = search.trim()
        ? `/api/clientes?q=${encodeURIComponent(search.trim())}&ativo=1`
        : '/api/clientes?ativo=1';
      const r = await fetch(url);
      if (!r.ok) throw new Error('fail');
      setClientes(await r.json());
    } catch {
      showToast('Erro ao carregar clientes', 'error');
    } finally {
      setLoading(false);
    }
  }, [search, showToast]);

  useEffect(() => {
    const t = setTimeout(reload, 220);
    return () => clearTimeout(t);
  }, [reload]);

  // Botão "+ Novo cliente" no header
  useHeaderActions(
    <Link
      href="/admin/clientes/novo"
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
      Novo cliente
    </Link>,
    [],
  );

  const stats = useMemo(() => {
    const totalGasto = clientes.reduce((s, c) => s + (c.total_gasto || 0), 0);
    const compradores = clientes.filter((c) => c.compras > 0 || c.pdv > 0).length;
    return { total: clientes.length, compradores, totalGasto };
  }, [clientes]);

  return (
    <div className={styles.wrap}>
      {/* Cards resumo */}
      <div className={styles.cards}>
        <div className={styles.card}>
          <div className={styles.cardLabel}>Clientes ativos</div>
          <div className={styles.cardValue}>{stats.total}</div>
        </div>
        <div className={styles.card}>
          <div className={styles.cardLabel}>Compradores</div>
          <div className={styles.cardValue}>{stats.compradores}</div>
        </div>
        <div className={styles.card}>
          <div className={styles.cardLabel}>Faturamento total</div>
          <div className={styles.cardValue}>{fmtBRL(stats.totalGasto)}</div>
        </div>
      </div>

      {/* Busca */}
      <div className={styles.searchWrap}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
          <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nome, telefone, CPF/CNPJ ou e-mail..."
        />
      </div>

      {loading && <div className={styles.empty}>Carregando...</div>}
      {!loading && clientes.length === 0 && (
        <div className={styles.empty}>
          {search.trim()
            ? 'Nenhum cliente encontrado pra esse termo.'
            : 'Nenhum cliente cadastrado ainda. Use o botão "+ Novo cliente".'}
        </div>
      )}

      {!loading && clientes.length > 0 && (
        <div className={styles.listWrap}>
          {clientes.map((c) => {
            const totalInteracoes =
              (c.compras || 0) + (c.os || 0) + (c.leads || 0) + (c.reservas || 0) + (c.alugueis || 0) + (c.pdv || 0);
            return (
              <Link
                key={c.id}
                href={`/admin/clientes/${c.id}`}
                className={styles.clientCard}
                style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}
              >
                <div className={styles.clientHeader}>
                  <div className={styles.clientInfo}>
                    <div className={styles.clientName}>{c.nome}</div>
                    <div className={styles.clientSub}>
                      {[c.telefone, c.cpf_cnpj, c.email].filter(Boolean).join(' · ') || 'Sem dados de contato'}
                    </div>
                  </div>
                  <div className={styles.clientBadges}>
                    {c.compras > 0 && <span className={styles.badge} style={{ background: TIPO_LABELS.compra.bg, color: TIPO_LABELS.compra.color }}>{c.compras} compra{c.compras > 1 ? 's' : ''}</span>}
                    {c.pdv > 0 && <span className={styles.badge} style={{ background: TIPO_LABELS.pdv.bg, color: TIPO_LABELS.pdv.color }}>{c.pdv} PDV</span>}
                    {c.os > 0 && <span className={styles.badge} style={{ background: TIPO_LABELS.oficina.bg, color: TIPO_LABELS.oficina.color }}>{c.os} OS</span>}
                    {c.alugueis > 0 && <span className={styles.badge} style={{ background: TIPO_LABELS.aluguel.bg, color: TIPO_LABELS.aluguel.color }}>{c.alugueis} aluguel{c.alugueis > 1 ? 's' : ''}</span>}
                    {c.reservas > 0 && <span className={styles.badge} style={{ background: TIPO_LABELS.reserva.bg, color: TIPO_LABELS.reserva.color }}>{c.reservas} reserva{c.reservas > 1 ? 's' : ''}</span>}
                    {c.leads > 0 && <span className={styles.badge} style={{ background: TIPO_LABELS.lead.bg, color: TIPO_LABELS.lead.color }}>{c.leads} lead{c.leads > 1 ? 's' : ''}</span>}
                    {totalInteracoes === 0 && <span className={styles.badge} style={{ background: '#e2e3e5', color: '#6c757d' }}>Sem interações</span>}
                  </div>
                  <div className={styles.clientMeta}>
                    <div className={styles.clientGasto}>{fmtBRL(c.total_gasto)}</div>
                    <div className={styles.clientDate}>{fmtDate(c.ultima_interacao)}</div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
