'use client';

import { useContext, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { HeaderActionsContext } from '../HeaderActionsContext';
import { useToast } from '@/components/Toast';
import styles from './page.module.css';

const PAGE_SIZE = 12;

type Post = {
  id: number;
  titulo: string;
  slug: string;
  resumo?: string | null;
  imagem_capa?: string | null;
  categoria?: string | null;
  tags?: string | null;
  publicado: number;
  autor?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type ApiResponse = {
  posts: Post[];
  total: number;
  page: number;
  limit: number;
};

const CATEGORIAS = ['geral', 'Dicas', 'Novidades', 'Comparativos', 'Manutenção'];

function formatDate(dateStr?: string | null): string {
  if (!dateStr) return '—';
  try {
    const iso = dateStr.replace(' ', 'T');
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

export default function BlogAdminPage() {
  const headerCtx = useContext(HeaderActionsContext);
  const { showToast } = useToast();
  const router = useRouter();

  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [fCat, setFCat] = useState('');
  const [fStatus, setFStatus] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; label: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  const reload = async () => {
    setLoading(true);
    try {
      // Fetch up to a high limit so we can filter client-side
      const r = await fetch('/api/blog?admin=1&limit=100');
      if (!r.ok) throw new Error('fail');
      const d: ApiResponse = await r.json();
      setPosts(Array.isArray(d.posts) ? d.posts : []);
    } catch {
      showToast('Erro ao carregar posts', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Header action — "Novo Post" button
  useEffect(() => {
    if (!headerCtx) return;
    headerCtx.setActions(
      <Link href="/admin/blog/novo" className={`${styles.btn} ${styles.btnPrimary}`}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
          <line x1="12" y1="5" x2="12" y2="19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <line x1="5" y1="12" x2="19" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
        Novo Post
      </Link>,
    );
    return () => headerCtx.setActions(null);
  }, [headerCtx]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return posts.filter((p) => {
      if (fCat && p.categoria !== fCat) return false;
      if (fStatus === 'pub' && !p.publicado) return false;
      if (fStatus === 'rasc' && p.publicado) return false;
      if (q) {
        const t = `${p.titulo} ${p.slug} ${p.tags || ''}`.toLowerCase();
        if (!t.includes(q)) return false;
      }
      return true;
    });
  }, [posts, search, fCat, fStatus]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, fCat, fStatus]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const doDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const r = await fetch(`/api/blog/${deleteTarget.id}`, { method: 'DELETE' });
      if (!r.ok) throw new Error('fail');
      showToast('Post excluído!', 'success');
      setDeleteTarget(null);
      await reload();
    } catch {
      showToast('Erro ao excluir post', 'error');
    } finally {
      setDeleting(false);
    }
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
              placeholder="Buscar por título ou tags..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select className={styles.toolbarSelect} value={fCat} onChange={(e) => setFCat(e.target.value)}>
            <option value="">Todas as categorias</option>
            {CATEGORIAS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <select className={styles.toolbarSelect} value={fStatus} onChange={(e) => setFStatus(e.target.value)}>
            <option value="">Todos status</option>
            <option value="pub">Publicados</option>
            <option value="rasc">Rascunhos</option>
          </select>
        </div>

        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Capa</th>
                <th>Título</th>
                <th>Categoria</th>
                <th>Status</th>
                <th>Data</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {pageItems.map((p) => (
                <tr key={p.id}>
                  <td>
                    {p.imagem_capa ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.imagem_capa} alt={p.titulo} className={styles.tdImg} />
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
                    <div className={styles.tdName}>{p.titulo}</div>
                    <div className={styles.tdSlug}>/blog/{p.slug}</div>
                  </td>
                  <td>
                    <span className={`${styles.badge} ${styles.bgBlue}`}>
                      {p.categoria || 'geral'}
                    </span>
                  </td>
                  <td>
                    <span className={`${styles.badge} ${p.publicado ? styles.bgGreen : styles.bgGray}`}>
                      {p.publicado ? 'Publicado' : 'Rascunho'}
                    </span>
                  </td>
                  <td className={styles.tdDate}>{formatDate(p.created_at)}</td>
                  <td>
                    <div className={styles.actionsCell}>
                      <button
                        className={`${styles.btn} ${styles.btnGhost} ${styles.btnSm} ${styles.btnIcon}`}
                        onClick={() => router.push(`/admin/blog/${p.id}`)}
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
                        onClick={() => setDeleteTarget({ id: p.id, label: p.titulo })}
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
              ))}
            </tbody>
          </table>
          {!loading && filtered.length === 0 && (
            <div className={styles.empty}>Nenhum post encontrado</div>
          )}
          {loading && <div className={styles.empty}>Carregando...</div>}
        </div>

        <div className={styles.pagination}>
          {totalPages > 1 &&
            Array.from({ length: totalPages }).map((_, i) => {
              const pNum = i + 1;
              return (
                <button
                  key={pNum}
                  className={`${styles.pageBtn} ${pNum === currentPage ? styles.pageBtnActive : ''}`}
                  onClick={() => setCurrentPage(pNum)}
                >
                  {pNum}
                </button>
              );
            })}
          <span className={styles.pageInfo}>
            {filtered.length} post{filtered.length !== 1 ? 's' : ''}
            {totalPages <= 1 ? ' no total' : ''}
          </span>
        </div>
      </div>

      {deleteTarget && (
        <div
          className={styles.modalOverlay}
          onClick={(e) => {
            if (e.target === e.currentTarget) setDeleteTarget(null);
          }}
        >
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h3>Confirmar exclusão</h3>
              <button
                className={styles.modalClose}
                onClick={() => setDeleteTarget(null)}
                aria-label="Fechar"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.delIcon}>🗑️</div>
              <p className={styles.delText}>Tem certeza que deseja excluir o post</p>
              <strong className={styles.delName}>{deleteTarget.label}</strong>
              <p className={styles.delHint}>Esta ação não pode ser desfeita.</p>
            </div>
            <div className={styles.modalFooter}>
              <button
                className={`${styles.btn} ${styles.btnGhost}`}
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
              >
                Cancelar
              </button>
              <button
                className={`${styles.btn} ${styles.btnDanger}`}
                onClick={doDelete}
                disabled={deleting}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <polyline points="3 6 5 6 21 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  <path d="M19 6l-1 14H6L5 6M10 11v6M14 11v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
                {deleting ? 'Excluindo...' : 'Excluir'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
