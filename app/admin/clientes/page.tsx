'use client';

import { useEffect, useState } from 'react';
import { useToast } from '@/components/Toast';
import styles from './page.module.css';

type Touchpoint = {
  tipo: string;
  ref_id: number;
  valor: number | null;
  data: string;
  moto_nome: string | null;
};

type Cliente = {
  nome: string;
  telefone: string;
  email: string;
  compras: number;
  os: number;
  leads: number;
  reservas: number;
  total_gasto: number;
  ultima_interacao: string;
  total_interacoes: number;
  touchpoints: Touchpoint[];
};

const TIPO_LABELS: Record<string, { label: string; bg: string; color: string }> = {
  compra: { label: 'Compra', bg: '#d4edda', color: '#155724' },
  oficina: { label: 'Oficina', bg: '#cce5ff', color: '#004085' },
  lead: { label: 'Lead', bg: '#fff3cd', color: '#856404' },
  reserva: { label: 'Reserva', bg: '#d6d8ff', color: '#27367D' },
};

function fmtDate(iso: string): string {
  if (!iso) return '—';
  const d = iso.slice(0, 10);
  return new Date(d + 'T00:00:00').toLocaleDateString('pt-BR');
}

export default function ClientesPage() {
  const { showToast } = useToast();
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch('/api/clientes');
        if (!r.ok) throw new Error('fail');
        setClientes(await r.json());
      } catch {
        showToast('Erro ao carregar clientes', 'error');
      } finally {
        setLoading(false);
      }
    })();
  }, [showToast]);

  const filtered = search
    ? clientes.filter((c) =>
        `${c.nome} ${c.telefone} ${c.email}`.toLowerCase().includes(search.toLowerCase()),
      )
    : clientes;

  const totalClientes = clientes.length;
  const compradores = clientes.filter((c) => c.compras > 0).length;
  const totalGasto = clientes.reduce((s, c) => s + c.total_gasto, 0);

  const toggleExpand = (key: string) => {
    setExpanded((prev) => (prev === key ? null : key));
  };

  return (
    <div className={styles.wrap}>
      {/* Summary cards */}
      <div className={styles.cards}>
        <div className={styles.card}>
          <div className={styles.cardLabel}>Clientes</div>
          <div className={styles.cardValue}>{totalClientes}</div>
        </div>
        <div className={styles.card}>
          <div className={styles.cardLabel}>Compradores</div>
          <div className={styles.cardValue}>{compradores}</div>
        </div>
        <div className={styles.card}>
          <div className={styles.cardLabel}>Total gasto</div>
          <div className={styles.cardValue}>R$ {totalGasto.toLocaleString('pt-BR')}</div>
        </div>
      </div>

      {/* Search */}
      <div className={styles.searchWrap}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
          <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2" />
          <path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
        <input
          type="text"
          placeholder="Buscar por nome, telefone ou email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Client list */}
      <div className={styles.listWrap}>
        {loading && <div className={styles.empty}>Carregando...</div>}
        {!loading && filtered.length === 0 && (
          <div className={styles.empty}>
            {search ? 'Nenhum cliente encontrado.' : 'Nenhum cliente registrado. Clientes aparecem automaticamente ao registrar vendas, OSs e leads.'}
          </div>
        )}
        {filtered.map((c) => {
          const key = `${c.nome}|${c.telefone}`;
          const isOpen = expanded === key;
          return (
            <div key={key} className={styles.clientCard}>
              <div className={styles.clientHeader} onClick={() => toggleExpand(key)}>
                <div className={styles.clientInfo}>
                  <div className={styles.clientName}>{c.nome}</div>
                  <div className={styles.clientSub}>
                    {c.telefone || '—'}
                    {c.email ? ` · ${c.email}` : ''}
                  </div>
                </div>
                <div className={styles.clientBadges}>
                  {c.compras > 0 && (
                    <span className={styles.badge} style={{ background: '#d4edda', color: '#155724' }}>
                      {c.compras} compra{c.compras > 1 ? 's' : ''}
                    </span>
                  )}
                  {c.os > 0 && (
                    <span className={styles.badge} style={{ background: '#cce5ff', color: '#004085' }}>
                      {c.os} OS{c.os > 1 ? 's' : ''}
                    </span>
                  )}
                  {c.leads > 0 && (
                    <span className={styles.badge} style={{ background: '#fff3cd', color: '#856404' }}>
                      {c.leads} lead{c.leads > 1 ? 's' : ''}
                    </span>
                  )}
                  {c.reservas > 0 && (
                    <span className={styles.badge} style={{ background: '#d6d8ff', color: '#27367D' }}>
                      {c.reservas} reserva{c.reservas > 1 ? 's' : ''}
                    </span>
                  )}
                </div>
                <div className={styles.clientMeta}>
                  {c.total_gasto > 0 && (
                    <span className={styles.clientGasto}>R$ {c.total_gasto.toLocaleString('pt-BR')}</span>
                  )}
                  <span className={styles.clientDate}>{fmtDate(c.ultima_interacao)}</span>
                  <svg
                    width="14" height="14" viewBox="0 0 24 24" fill="none"
                    style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', color: '#999' }}
                  >
                    <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              </div>
              {isOpen && (
                <div className={styles.clientTimeline}>
                  <div className={styles.timelineTitle}>Histórico completo</div>
                  {c.touchpoints.map((tp, i) => {
                    const tl = TIPO_LABELS[tp.tipo] || TIPO_LABELS.lead;
                    return (
                      <div key={i} className={styles.timelineItem}>
                        <span className={styles.timelineDot} style={{ background: tl.color }} />
                        <div className={styles.timelineContent}>
                          <div className={styles.timelineRow}>
                            <span className={styles.badge} style={{ background: tl.bg, color: tl.color, fontSize: '0.65rem' }}>
                              {tl.label}
                            </span>
                            {tp.moto_nome && (
                              <span className={styles.timelineMoto}>{tp.moto_nome}</span>
                            )}
                            {tp.valor != null && tp.valor > 0 && (
                              <span className={styles.timelineValor}>
                                R$ {Number(tp.valor).toLocaleString('pt-BR')}
                              </span>
                            )}
                          </div>
                          <span className={styles.timelineDate}>{fmtDate(tp.data)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
