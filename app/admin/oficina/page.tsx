'use client';

import { useContext, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { HeaderActionsContext } from '../HeaderActionsContext';
import { useToast } from '@/components/Toast';
import OrdemModal from './OrdemModal';
import { OFICINA_STATUS_LABELS } from '@/lib/oficina-status';
import styles from './page.module.css';

const PAGE_SIZE = 12;

type Ordem = {
  id: number;
  cliente_nome: string;
  cliente_telefone: string;
  cliente_email: string;
  moto_marca: string;
  moto_modelo: string;
  moto_ano: number | null;
  moto_placa: string;
  moto_km: number | null;
  servico_descricao: string;
  observacoes: string;
  mecanico: string;
  valor_estimado: number | null;
  valor_final: number | null;
  status: string;
  data_entrada: string | null;
  data_prevista: string | null;
  data_conclusao: string | null;
  created_at: string | null;
  updated_at: string | null;
};

const STATUS_LABELS: Record<string, string> = OFICINA_STATUS_LABELS;

function badgeForStatus(status: string): string {
  switch (status) {
    case 'aberta':
    case 'diagnostico':
      return styles.bgBlue;
    case 'em_servico':
      return styles.bgOrange;
    case 'aguardando_peca':
      return styles.bgRed;
    case 'aguardando_aprovacao':
    case 'aguardando_administrativo':
      return styles.bgOrange;
    case 'agendar_entrega':
    case 'lavagem':
      return styles.bgBlue;
    case 'finalizada':
      return styles.bgGreen;
    case 'cancelada':
      return styles.bgGray;
    default:
      return styles.bgGray;
  }
}

function formatDateBR(iso?: string | null): string {
  if (!iso) return '—';
  const s = iso.slice(0, 10);
  const [y, m, d] = s.split('-');
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

function formatBRL(v: number | null): string {
  if (v == null) return '—';
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export default function OficinaPage() {
  const headerCtx = useContext(HeaderActionsContext);
  const { showToast } = useToast();

  const [ordens, setOrdens] = useState<Ordem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [fStatus, setFStatus] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const reload = async () => {
    setLoading(true);
    try {
      const r = await fetch('/api/oficina');
      if (!r.ok) throw new Error('fail');
      const d: Ordem[] = await r.json();
      setOrdens(Array.isArray(d) ? d : []);
    } catch {
      showToast('Erro ao carregar ordens', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!headerCtx) return;
    headerCtx.setActions(
      <button
        className={`${styles.btn} ${styles.btnPrimary}`}
        onClick={() => {
          setEditingId(null);
          setModalOpen(true);
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
          <line x1="12" y1="5" x2="12" y2="19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <line x1="5" y1="12" x2="19" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
        Nova Ordem
      </button>,
    );
    return () => headerCtx.setActions(null);
  }, [headerCtx]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return ordens.filter((o) => {
      if (fStatus && o.status !== fStatus) return false;
      if (q) {
        const t = `${o.cliente_nome} ${o.cliente_telefone} ${o.moto_marca} ${o.moto_modelo} ${o.moto_placa} ${o.servico_descricao}`.toLowerCase();
        if (!t.includes(q)) return false;
      }
      return true;
    });
  }, [ordens, search, fStatus]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, fStatus]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const openEdit = (id: number) => {
    setEditingId(id);
    setModalOpen(true);
  };

  const onSaved = async () => {
    setModalOpen(false);
    setEditingId(null);
    await reload();
  };

  return (
    <>
      <div className={styles.wrap}>
        <div className={styles.toolbar}>
          <div className={styles.toolbarSearch}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2" />
              <path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <input
              type="text"
              placeholder="Buscar por cliente, placa, moto ou serviço..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            className={styles.toolbarSelect}
            value={fStatus}
            onChange={(e) => setFStatus(e.target.value)}
          >
            <option value="">Todos status</option>
            {Object.entries(STATUS_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>#</th>
                <th>Cliente</th>
                <th>Moto</th>
                <th>Placa</th>
                <th>Serviço</th>
                <th>Entrada</th>
                <th>Status</th>
                <th>Valor</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {pageItems.map((o) => (
                <tr key={o.id}>
                  <td className={styles.tdMono}>#{o.id}</td>
                  <td>
                    <div className={styles.tdName}>{o.cliente_nome}</div>
                    {o.cliente_telefone && <div className={styles.tdSub}>{o.cliente_telefone}</div>}
                  </td>
                  <td>
                    <div>{[o.moto_marca, o.moto_modelo].filter(Boolean).join(' ') || '—'}</div>
                    {o.moto_ano && <div className={styles.tdSub}>{o.moto_ano}</div>}
                  </td>
                  <td className={styles.tdMono}>{o.moto_placa || '—'}</td>
                  <td className={styles.tdName} style={{ maxWidth: 260 }}>
                    {o.servico_descricao || '—'}
                  </td>
                  <td className={styles.tdDate}>{formatDateBR(o.data_entrada)}</td>
                  <td>
                    <span className={`${styles.badge} ${badgeForStatus(o.status)}`}>
                      {STATUS_LABELS[o.status] || o.status}
                    </span>
                  </td>
                  <td className={styles.tdPreco}>
                    {formatBRL(o.valor_final ?? o.valor_estimado ?? null)}
                  </td>
                  <td>
                    <div className={styles.actionsCell}>
                      <Link
                        href={`/admin/oficina/${o.id}`}
                        className={`${styles.btn} ${styles.btnPrimary} ${styles.btnSm}`}
                        title="Abrir detalhes (status, fechar, garantia, histórico)"
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                          <path
                            d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                          />
                          <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
                        </svg>
                        Detalhes
                      </Link>
                      <button
                        className={`${styles.btn} ${styles.btnGhost} ${styles.btnSm} ${styles.btnIcon}`}
                        onClick={() => openEdit(o.id)}
                        title="Editar"
                        aria-label="Editar"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                          <path
                            d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                          />
                          <path
                            d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!loading && filtered.length === 0 && (
            <div className={styles.empty}>Nenhuma ordem encontrada</div>
          )}
          {loading && <div className={styles.empty}>Carregando...</div>}
        </div>

        <div className={styles.pagination}>
          {totalPages > 1 &&
            Array.from({ length: totalPages }).map((_, i) => {
              const p = i + 1;
              return (
                <button
                  key={p}
                  className={`${styles.pageBtn} ${p === currentPage ? styles.pageBtnActive : ''}`}
                  onClick={() => setCurrentPage(p)}
                >
                  {p}
                </button>
              );
            })}
          <span className={styles.pageInfo}>
            {filtered.length} ordem{filtered.length !== 1 ? 's' : ''}
            {totalPages <= 1 ? ' no total' : ''}
          </span>
        </div>
      </div>

      {modalOpen && (
        <OrdemModal
          editingId={editingId}
          onClose={() => {
            setModalOpen(false);
            setEditingId(null);
          }}
          onSaved={onSaved}
          onToast={showToast}
        />
      )}

    </>
  );
}
