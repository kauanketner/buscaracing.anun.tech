'use client';

import { useContext, useEffect, useMemo, useState } from 'react';
import { HeaderActionsContext } from '../HeaderActionsContext';
import { useToast } from '@/components/Toast';
import MotoModal from './MotoModal';
import DeleteConfirm from './DeleteConfirm';
import styles from './page.module.css';

const CATS: Record<string, string> = {
  'motos-rua': 'Motos de Rua',
  offroad: 'Offroad',
  quadriciclos: 'Quadriciclos',
  infantil: 'Infantil',
  outros: 'Outros',
};

const PAGE_SIZE = 12;

type Moto = {
  id: number;
  nome: string;
  marca: string;
  categoria: string;
  condicao: string;
  preco: number | null;
  preco_original?: number | null;
  descricao?: string | null;
  imagem: string | null;
  destaque: number;
  ativo: number;
  ano?: number | null;
  km?: number | null;
  created_at?: string | null;
};

function diasEmEstoque(createdAt?: string | null): number {
  if (!createdAt) return 0;
  const iso = createdAt.replace(' ', 'T');
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return 0;
  return Math.floor((Date.now() - t) / 86400000);
}

export default function MotosPage() {
  const headerCtx = useContext(HeaderActionsContext);
  const { showToast } = useToast();

  const [motos, setMotos] = useState<Moto[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [fCat, setFCat] = useState('');
  const [fCond, setFCond] = useState('');
  const [fAtivo, setFAtivo] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<{ id: number; label: string } | null>(null);

  const reload = async () => {
    setLoading(true);
    try {
      const r = await fetch('/api/admin/motos');
      const d: Moto[] = await r.json();
      setMotos(Array.isArray(d) ? d : []);
    } catch {
      showToast('Erro ao carregar motos', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Header actions — "Nova Moto" button
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
        Nova Moto
      </button>,
    );
    return () => headerCtx.setActions(null);
  }, [headerCtx]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return motos.filter((m) => {
      if (fCat && m.categoria !== fCat) return false;
      if (fCond && m.condicao !== fCond) return false;
      if (fAtivo !== '' && String(m.ativo) !== fAtivo) return false;
      if (q) {
        const t = `${m.nome} ${m.marca} ${m.categoria}`.toLowerCase();
        if (!t.includes(q)) return false;
      }
      return true;
    });
  }, [motos, search, fCat, fCond, fAtivo]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, fCat, fCond, fAtivo]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const openEdit = (id: number) => {
    setEditingId(id);
    setModalOpen(true);
  };

  const onModalSaved = async () => {
    setModalOpen(false);
    setEditingId(null);
    await reload();
  };

  const onDeleted = async () => {
    setDeleteTarget(null);
    showToast('Moto excluída!', 'success');
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
              placeholder="Buscar..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select className={styles.toolbarSelect} value={fCat} onChange={(e) => setFCat(e.target.value)}>
            <option value="">Todas as categorias</option>
            <option value="motos-rua">Motos de Rua</option>
            <option value="offroad">Offroad</option>
            <option value="quadriciclos">Quadriciclos</option>
            <option value="infantil">Infantil</option>
            <option value="outros">Outros</option>
          </select>
          <select className={styles.toolbarSelect} value={fCond} onChange={(e) => setFCond(e.target.value)}>
            <option value="">Nova / Usada</option>
            <option value="nova">Nova</option>
            <option value="usada">Usada</option>
          </select>
          <select className={styles.toolbarSelect} value={fAtivo} onChange={(e) => setFAtivo(e.target.value)}>
            <option value="">Todos status</option>
            <option value="1">Ativo</option>
            <option value="0">Inativo</option>
          </select>
        </div>

        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Foto</th>
                <th>Nome</th>
                <th>Categoria</th>
                <th>Condição</th>
                <th>Preço</th>
                <th>⭐</th>
                <th>Status</th>
                <th>Dias em estoque</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {pageItems.map((m) => {
                const dias = diasEmEstoque(m.created_at);
                const diasAlerta = dias > 30;
                return (
                  <tr key={m.id}>
                    <td>
                      {m.imagem ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={m.imagem} alt={m.nome} className={styles.tdImg} />
                      ) : (
                        <div className={styles.tdImgPlaceholder}>
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                            <rect x="3" y="3" width="18" height="18" rx="2" stroke="#ccc" strokeWidth="2" />
                            <circle cx="8.5" cy="8.5" r="1.5" fill="#ccc" />
                            <polyline points="21 15 16 10 5 21" stroke="#ccc" strokeWidth="2" strokeLinecap="round" />
                          </svg>
                        </div>
                      )}
                    </td>
                    <td>
                      <div className={styles.tdName}>{m.nome}</div>
                      <div className={styles.tdBrand}>{m.marca}</div>
                    </td>
                    <td>
                      <span className={`${styles.badge} ${styles.bgBlue}`}>
                        {CATS[m.categoria] || m.categoria}
                      </span>
                    </td>
                    <td>
                      <span
                        className={`${styles.badge} ${m.condicao === 'nova' ? styles.bgGreen : styles.bgOrange}`}
                      >
                        {m.condicao}
                      </span>
                    </td>
                    <td className={styles.tdPreco}>
                      {m.preco ? `R$ ${Number(m.preco).toLocaleString('pt-BR')}` : '—'}
                    </td>
                    <td className={styles.tdCenter}>
                      <span className={m.destaque ? styles.destStar : styles.destNo}>★</span>
                    </td>
                    <td>
                      <span className={`${styles.badge} ${m.ativo ? styles.bgGreen : styles.bgGray}`}>
                        {m.ativo ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td>
                      <span className={`${styles.badge} ${diasAlerta ? styles.bgRed : styles.bgGray}`}>
                        {dias} {dias === 1 ? 'dia' : 'dias'}
                      </span>
                    </td>
                    <td>
                      <div className={styles.actionsCell}>
                        <button
                          className={`${styles.btn} ${styles.btnGhost} ${styles.btnSm} ${styles.btnIcon}`}
                          onClick={() => openEdit(m.id)}
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
                        <button
                          className={`${styles.btn} ${styles.btnDanger} ${styles.btnSm} ${styles.btnIcon}`}
                          onClick={() =>
                            setDeleteTarget({ id: m.id, label: `${m.nome} – ${m.marca}` })
                          }
                          title="Excluir"
                          aria-label="Excluir"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                            <polyline
                              points="3 6 5 6 21 6"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                            />
                            <path
                              d="M19 6l-1 14H6L5 6M10 11v6M14 11v6"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                            />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!loading && filtered.length === 0 && (
            <div className={styles.empty}>Nenhuma moto encontrada</div>
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
            {filtered.length} moto{filtered.length !== 1 ? 's' : ''}
            {totalPages <= 1 ? ' no total' : ''}
          </span>
        </div>
      </div>

      {modalOpen && (
        <MotoModal
          editingId={editingId}
          onClose={() => {
            setModalOpen(false);
            setEditingId(null);
          }}
          onSaved={onModalSaved}
          onToast={showToast}
        />
      )}

      {deleteTarget && (
        <DeleteConfirm
          motoId={deleteTarget.id}
          label={deleteTarget.label}
          onClose={() => setDeleteTarget(null)}
          onDeleted={onDeleted}
          onError={(m) => showToast(m, 'error')}
        />
      )}
    </>
  );
}
