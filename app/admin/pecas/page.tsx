'use client';

import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { HeaderActionsContext } from '../HeaderActionsContext';
import { useToast } from '@/components/Toast';
import { PECAS_CATEGORIAS, CATEGORIA_LABEL } from '@/lib/pecas-categorias';
import PecaModal from './PecaModal';
import styles from './page.module.css';
import kebabStyles from '../mecanicos/page.module.css';

type Peca = {
  id: number;
  nome: string;
  categoria: string;
  preco: number | null;
  preco_original: number | null;
  imagem: string | null;
  marca_moto: string;
  modelo_compat: string;
  codigo: string;
  destaque: number;
  ativo: number;
  estoque_qtd: number;
  estoque_min: number;
  created_at: string;
};

const PAGE_SIZE = 12;

export default function PecasAdminPage() {
  const headerCtx = useContext(HeaderActionsContext);
  const { showToast } = useToast();

  const [pecas, setPecas] = useState<Peca[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [fCat, setFCat] = useState('');
  const [fStatus, setFStatus] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  // Modal de entrada/saída de estoque
  const [movTarget, setMovTarget] = useState<{ peca: Peca; tipo: 'entrada' | 'saida' } | null>(null);
  const [movQtd, setMovQtd] = useState('1');
  const [movDesc, setMovDesc] = useState('');
  const [movSaving, setMovSaving] = useState(false);

  const [menuOpenId, setMenuOpenId] = useState<number | null>(null);
  const menuWrapRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (menuOpenId == null) return;
    const onDocClick = (e: MouseEvent) => {
      if (!menuWrapRef.current) return;
      if (!menuWrapRef.current.contains(e.target as Node)) setMenuOpenId(null);
    };
    const onEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenuOpenId(null); };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onEsc);
    };
  }, [menuOpenId]);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch('/api/pecas');
      if (r.ok) setPecas(await r.json());
    } catch {
      showToast('Erro ao carregar peças', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => { reload(); }, [reload]);

  useEffect(() => {
    if (!headerCtx) return;
    headerCtx.setActions(
      <button
        className={`${styles.btn} ${styles.btnPrimary}`}
        onClick={() => { setEditingId(null); setModalOpen(true); }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
          <line x1="12" y1="5" x2="12" y2="19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <line x1="5" y1="12" x2="19" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
        Nova peça
      </button>,
    );
    return () => headerCtx.setActions(null);
  }, [headerCtx]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return pecas.filter((p) => {
      if (fCat && p.categoria !== fCat) return false;
      if (fStatus === 'ativo' && !p.ativo) return false;
      if (fStatus === 'inativo' && p.ativo) return false;
      if (q) {
        const t = `${p.nome} ${p.codigo} ${p.modelo_compat} ${p.marca_moto}`.toLowerCase();
        if (!t.includes(q)) return false;
      }
      return true;
    });
  }, [pecas, search, fCat, fStatus]);

  useEffect(() => { setCurrentPage(1); }, [search, fCat, fStatus]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const toggleAtivo = async (p: Peca) => {
    try {
      await fetch(`/api/pecas/${p.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ativo: !p.ativo }),
      });
      await reload();
    } catch {
      showToast('Erro', 'error');
    }
  };

  const remover = async (p: Peca) => {
    if (!confirm(`Excluir a peça "${p.nome}"? Esta ação não pode ser desfeita.`)) return;
    try {
      const r = await fetch(`/api/pecas/${p.id}`, { method: 'DELETE' });
      if (!r.ok) throw new Error('fail');
      showToast('Peça excluída', 'success');
      await reload();
    } catch {
      showToast('Erro ao excluir', 'error');
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
            <input type="text" placeholder="Buscar por nome, código, modelo..."
              value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <select className={styles.toolbarSelect} value={fCat} onChange={(e) => setFCat(e.target.value)}>
            <option value="">Todas as categorias</option>
            {PECAS_CATEGORIAS.map((c) => (
              <option key={c.slug} value={c.slug}>{c.label}</option>
            ))}
          </select>
          <select className={styles.toolbarSelect} value={fStatus} onChange={(e) => setFStatus(e.target.value)}>
            <option value="">Todos os status</option>
            <option value="ativo">Publicadas</option>
            <option value="inativo">Pausadas</option>
          </select>
        </div>

        <div className={styles.tableWrap} ref={menuWrapRef}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Foto</th>
                <th>Nome</th>
                <th>Categoria</th>
                <th>Estoque</th>
                <th>Preço</th>
                <th>Destaque</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {pageItems.map((p) => (
                <tr key={p.id}>
                  <td>
                    {p.imagem ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.imagem} alt={p.nome} className={styles.tdImg} />
                    ) : (
                      <div className={styles.tdImgPlaceholder}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                          <rect x="3" y="3" width="18" height="18" rx="2" stroke="#ccc" strokeWidth="2" />
                        </svg>
                      </div>
                    )}
                  </td>
                  <td>
                    <div className={styles.tdName}>{p.nome}</div>
                    <div className={styles.tdSub}>
                      {p.codigo && <span>#{p.codigo} · </span>}
                      {p.marca_moto || 'Universal'}
                      {p.modelo_compat && ` · ${p.modelo_compat}`}
                    </div>
                  </td>
                  <td>
                    <span className={`${styles.badge} ${styles.bgBlue}`}>
                      {CATEGORIA_LABEL[p.categoria] || p.categoria}
                    </span>
                  </td>
                  <td>
                    {(() => {
                      const q = Number(p.estoque_qtd) || 0;
                      const min = Number(p.estoque_min) || 0;
                      const bg = q === 0 ? '#fcdcdc' : q <= min ? '#fff3cd' : '#d4edda';
                      const color = q === 0 ? '#8b1820' : q <= min ? '#856404' : '#155724';
                      return (
                        <span className={styles.badge} style={{ background: bg, color }}>
                          {q} {q === 1 ? 'un' : 'un'}
                        </span>
                      );
                    })()}
                  </td>
                  <td className={styles.tdPreco}>
                    {p.preco ? `R$ ${Number(p.preco).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '—'}
                  </td>
                  <td className={styles.tdCenter}>
                    <span className={p.destaque ? styles.destStar : styles.destNo}>★</span>
                  </td>
                  <td>
                    <span className={`${styles.badge} ${p.ativo ? styles.bgGreen : styles.bgGray}`}>
                      {p.ativo ? 'Publicada' : 'Pausada'}
                    </span>
                  </td>
                  <td>
                    <div className={styles.actionsCell}>
                      <button
                        className={`${styles.btn} ${styles.btnPrimary} ${styles.btnSm}`}
                        onClick={() => { setEditingId(p.id); setModalOpen(true); }}
                      >
                        Editar
                      </button>
                      <div className={kebabStyles.kebabWrap}>
                        <button
                          type="button"
                          className={`${kebabStyles.kebabBtn} ${menuOpenId === p.id ? kebabStyles.kebabActive : ''}`}
                          onClick={() => setMenuOpenId((cur) => (cur === p.id ? null : p.id))}
                          aria-label="Mais ações"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                            <circle cx="12" cy="5" r="1.6" fill="currentColor" />
                            <circle cx="12" cy="12" r="1.6" fill="currentColor" />
                            <circle cx="12" cy="19" r="1.6" fill="currentColor" />
                          </svg>
                        </button>
                        {menuOpenId === p.id && (
                          <ul className={kebabStyles.menu} role="menu">
                            <li role="none">
                              <button
                                type="button" role="menuitem" className={kebabStyles.menuItem}
                                onClick={() => {
                                  setMenuOpenId(null);
                                  setMovTarget({ peca: p, tipo: 'entrada' });
                                  setMovQtd('1');
                                  setMovDesc('');
                                }}
                              >
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                                  <line x1="12" y1="5" x2="12" y2="19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                                  <polyline points="19 12 12 19 5 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                                Entrada de estoque
                              </button>
                            </li>
                            <li role="none">
                              <button
                                type="button" role="menuitem" className={kebabStyles.menuItem}
                                onClick={() => {
                                  setMenuOpenId(null);
                                  setMovTarget({ peca: p, tipo: 'saida' });
                                  setMovQtd('1');
                                  setMovDesc('');
                                }}
                              >
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                                  <line x1="12" y1="19" x2="12" y2="5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                                  <polyline points="5 12 12 5 19 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                                Saída de estoque
                              </button>
                            </li>
                            <li role="none" className={kebabStyles.menuDivider} aria-hidden="true" />
                            <li role="none">
                              <button
                                type="button" role="menuitem" className={kebabStyles.menuItem}
                                onClick={() => { setMenuOpenId(null); toggleAtivo(p); }}
                              >
                                {p.ativo ? 'Pausar publicação' : 'Publicar no site'}
                              </button>
                            </li>
                            <li role="none" className={kebabStyles.menuDivider} aria-hidden="true" />
                            <li role="none">
                              <button
                                type="button" role="menuitem"
                                className={`${kebabStyles.menuItem} ${kebabStyles.menuItemDanger}`}
                                onClick={() => { setMenuOpenId(null); remover(p); }}
                              >
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                                  <polyline points="3 6 5 6 21 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                  <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6M10 11v6M14 11v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                                Excluir
                              </button>
                            </li>
                          </ul>
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!loading && filtered.length === 0 && (
            <div className={styles.empty}>Nenhuma peça encontrada. Clique em &quot;Nova peça&quot;.</div>
          )}
          {loading && <div className={styles.empty}>Carregando...</div>}
        </div>

        <div className={styles.pagination}>
          {totalPages > 1 &&
            Array.from({ length: totalPages }).map((_, i) => {
              const pg = i + 1;
              return (
                <button key={pg}
                  className={`${styles.pageBtn} ${pg === currentPage ? styles.pageBtnActive : ''}`}
                  onClick={() => setCurrentPage(pg)}>
                  {pg}
                </button>
              );
            })}
        </div>
      </div>

      {modalOpen && (
        <PecaModal
          editingId={editingId}
          onClose={() => { setModalOpen(false); setEditingId(null); }}
          onSaved={async () => {
            setModalOpen(false);
            setEditingId(null);
            await reload();
          }}
        />
      )}

      {movTarget && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 500, background: 'rgba(0,0,0,0.6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem',
          }}
          onClick={(e) => { if (e.target === e.currentTarget && !movSaving) setMovTarget(null); }}
        >
          <div style={{ background: '#fff', width: '100%', maxWidth: 440 }}>
            <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #e4e4e0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.4rem', color: movTarget.tipo === 'entrada' ? '#155724' : '#856404' }}>
                {movTarget.tipo === 'entrada' ? '▼ Entrada de estoque' : '▲ Saída de estoque'}
              </h3>
              <button type="button" onClick={() => setMovTarget(null)} disabled={movSaving}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#aaa', padding: 4 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
            </div>
            <form onSubmit={async (e) => {
              e.preventDefault();
              const qtd = Math.floor(Number(movQtd) || 0);
              if (qtd < 1) { showToast('Quantidade deve ser >= 1', 'error'); return; }
              setMovSaving(true);
              try {
                const r = await fetch(`/api/pecas/${movTarget.peca.id}/movimentacoes`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    tipo: movTarget.tipo,
                    quantidade: qtd,
                    descricao: movDesc.trim(),
                  }),
                });
                if (!r.ok) {
                  const d = await r.json().catch(() => ({}));
                  throw new Error(d.error || 'fail');
                }
                showToast(movTarget.tipo === 'entrada' ? 'Entrada registrada' : 'Saída registrada', 'success');
                setMovTarget(null);
                await reload();
              } catch (err) {
                showToast(err instanceof Error ? err.message : 'Erro ao salvar', 'error');
              } finally {
                setMovSaving(false);
              }
            }}>
              <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <div style={{ fontSize: '0.78rem', color: '#777', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700, marginBottom: 4 }}>
                    Peça
                  </div>
                  <div style={{ fontWeight: 600 }}>{movTarget.peca.nome}</div>
                  <div style={{ fontSize: '0.82rem', color: '#777' }}>
                    Estoque atual: <strong>{Number(movTarget.peca.estoque_qtd) || 0}</strong> un
                  </div>
                </div>
                <div>
                  <label style={{ display: 'block', fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: '0.72rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#777', marginBottom: 4 }}>
                    Quantidade *
                  </label>
                  <input type="number" min="1" value={movQtd} onChange={(e) => setMovQtd(e.target.value)} required
                    style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #e4e4e0', fontSize: '0.92rem' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: '0.72rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#777', marginBottom: 4 }}>
                    Descrição / motivo
                  </label>
                  <textarea value={movDesc} onChange={(e) => setMovDesc(e.target.value)} rows={3}
                    placeholder={movTarget.tipo === 'entrada' ? 'Ex: NF 12345, fornecedor X' : 'Ex: aplicada na OS #42'}
                    style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #e4e4e0', fontSize: '0.92rem', resize: 'vertical' }} />
                </div>
              </div>
              <div style={{ padding: '1rem 1.25rem', borderTop: '1px solid #e4e4e0', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setMovTarget(null)} disabled={movSaving}
                  style={{ padding: '8px 16px', background: 'transparent', border: '1.5px solid #e4e4e0', cursor: 'pointer', fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: '0.82rem', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                  Cancelar
                </button>
                <button type="submit" disabled={movSaving}
                  style={{
                    padding: '8px 16px',
                    background: movTarget.tipo === 'entrada' ? '#155724' : '#856404',
                    color: '#fff', border: 'none', cursor: 'pointer',
                    fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: '0.82rem', letterSpacing: '0.08em', textTransform: 'uppercase',
                  }}>
                  {movSaving ? 'Salvando...' : `Registrar ${movTarget.tipo}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
