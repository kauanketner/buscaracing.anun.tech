'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useToast } from '@/components/Toast';
import { useHeaderActions } from '../HeaderActionsContext';
import ServicoModal from './ServicoModal';
import styles from './page.module.css';

type Servico = {
  id: number;
  nome: string;
  codigo: string;
  categoria: string;
  descricao: string;
  preco: number | null;
  ativo: number;
  created_at: string;
};

function fmtBRL(v: number | null): string {
  if (v == null) return '—';
  return `R$ ${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function ServicosPage() {
  const { showToast } = useToast();
  const [items, setItems] = useState<Servico[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const reload = useCallback(async () => {
    try {
      const r = await fetch('/api/servicos');
      if (!r.ok) throw new Error('fail');
      const d = await r.json();
      setItems(Array.isArray(d) ? d : []);
    } catch {
      showToast('Erro ao carregar serviços', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => { reload(); }, [reload]);

  const openNew = useCallback(() => {
    setEditingId(null);
    setModalOpen(true);
  }, []);

  // Botão "+ Novo serviço" no header
  useHeaderActions(
    <button
      type="button"
      className={`${styles.btn} ${styles.btnPrimary}`}
      onClick={openNew}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
        <line x1="12" y1="5" x2="12" y2="19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <line x1="5" y1="12" x2="19" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
      Novo serviço
    </button>,
    [openNew],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((s) =>
      s.nome.toLowerCase().includes(q)
      || (s.codigo || '').toLowerCase().includes(q)
      || (s.categoria || '').toLowerCase().includes(q),
    );
  }, [items, search]);

  const onEdit = (id: number) => {
    setEditingId(id);
    setModalOpen(true);
  };

  const onDelete = async (s: Servico) => {
    if (!confirm(`Excluir serviço "${s.nome}"? Lançamentos antigos em OS continuam intactos.`)) return;
    try {
      const r = await fetch(`/api/servicos/${s.id}`, { method: 'DELETE' });
      if (!r.ok) throw new Error('fail');
      showToast('Serviço excluído', 'success');
      reload();
    } catch {
      showToast('Erro ao excluir', 'error');
    }
  };

  return (
    <div className={styles.wrap}>
      <div className={styles.toolbar}>
        <div className={styles.toolbarSearch}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome, código ou categoria..."
          />
        </div>
      </div>

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Serviço</th>
              <th>Categoria</th>
              <th style={{ textAlign: 'right' }}>Preço sugerido</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((s) => (
              <tr key={s.id}>
                <td>
                  <div className={styles.tdName}>{s.nome}</div>
                  {s.codigo && <div className={styles.tdSub}>#{s.codigo}</div>}
                  {s.descricao && <div className={styles.tdSub} style={{ marginTop: 2 }}>{s.descricao}</div>}
                </td>
                <td className={styles.tdSub}>{s.categoria || '—'}</td>
                <td className={styles.tdPreco} style={{ textAlign: 'right' }}>
                  {fmtBRL(s.preco)}
                </td>
                <td>
                  <span className={`${styles.badge} ${s.ativo ? styles.badgeAtivo : styles.badgeInativo}`}>
                    {s.ativo ? 'Ativo' : 'Inativo'}
                  </span>
                </td>
                <td>
                  <div className={styles.actions}>
                    <button type="button" className={styles.btnIcon} onClick={() => onEdit(s.id)} title="Editar">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                        <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                        <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      className={`${styles.btnIcon} ${styles.btnIconDanger}`}
                      onClick={() => onDelete(s)}
                      title="Excluir"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                        <polyline points="3 6 5 6 21 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6M10 11v6M14 11v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && filtered.length === 0 && (
          <div className={styles.empty}>
            {items.length === 0
              ? 'Nenhum serviço cadastrado. Clique em "+ Novo serviço".'
              : 'Nenhum resultado para a busca.'}
          </div>
        )}
        {loading && <div className={styles.empty}>Carregando...</div>}
      </div>

      {modalOpen && (
        <ServicoModal
          editingId={editingId}
          onClose={() => setModalOpen(false)}
          onSaved={() => {
            setModalOpen(false);
            reload();
          }}
        />
      )}
    </div>
  );
}
