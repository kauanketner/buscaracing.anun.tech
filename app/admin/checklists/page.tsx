'use client';

import { useCallback, useContext, useEffect, useState, type FormEvent } from 'react';
import { HeaderActionsContext } from '../HeaderActionsContext';
import { useToast } from '@/components/Toast';
import styles from '../vendas/page.module.css';

type Checklist = {
  id: number;
  titulo: string;
  descricao: string;
  token: string;
  ativo: number;
  total_itens: number;
  total_respostas: number;
  created_at: string;
};

type ItemDraft = { tipo: string; label: string };

export default function ChecklistsPage() {
  const headerCtx = useContext(HeaderActionsContext);
  const { showToast } = useToast();

  const [list, setList] = useState<Checklist[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  // Form state
  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [itens, setItens] = useState<ItemDraft[]>([{ tipo: 'checkbox', label: '' }]);
  const [saving, setSaving] = useState(false);

  const reload = useCallback(async () => {
    try {
      const r = await fetch('/api/checklists');
      if (r.ok) setList(await r.json());
    } catch {
      showToast('Erro ao carregar', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => { reload(); }, [reload]);

  useEffect(() => {
    if (!headerCtx) return;
    headerCtx.setActions(
      <button
        className={`${styles.badge}`}
        style={{
          background: '#27367D', color: '#fff', padding: '8px 16px', border: 'none',
          cursor: 'pointer', fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700,
          fontSize: '0.82rem', letterSpacing: '0.08em', textTransform: 'uppercase',
          display: 'inline-flex', alignItems: 'center', gap: 6,
        }}
        onClick={() => {
          setTitulo(''); setDescricao('');
          setItens([{ tipo: 'checkbox', label: '' }]);
          setShowModal(true);
        }}
      >
        + Novo checklist
      </button>,
    );
    return () => headerCtx.setActions(null);
  }, [headerCtx]);

  const addItem = () => setItens([...itens, { tipo: 'checkbox', label: '' }]);
  const removeItem = (i: number) => setItens(itens.filter((_, j) => j !== i));
  const updateItem = (i: number, field: 'tipo' | 'label', val: string) => {
    const copy = [...itens];
    copy[i] = { ...copy[i], [field]: val };
    setItens(copy);
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!titulo.trim()) { showToast('Título obrigatório', 'error'); return; }
    const validItens = itens.filter((i) => i.label.trim());
    if (validItens.length === 0) { showToast('Adicione pelo menos 1 item', 'error'); return; }
    setSaving(true);
    try {
      const r = await fetch('/api/checklists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ titulo: titulo.trim(), descricao: descricao.trim(), itens: validItens }),
      });
      if (!r.ok) throw new Error('fail');
      showToast('Checklist criado!', 'success');
      setShowModal(false);
      await reload();
    } catch {
      showToast('Erro ao criar', 'error');
    } finally {
      setSaving(false);
    }
  };

  const toggleAtivo = async (c: Checklist) => {
    try {
      await fetch(`/api/checklists/${c.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ativo: !c.ativo }),
      });
      await reload();
    } catch {
      showToast('Erro', 'error');
    }
  };

  const origin = typeof window !== 'undefined' ? window.location.origin : '';

  return (
    <div className={styles.wrap}>
      <div className={styles.cards}>
        <div className={styles.card}>
          <div className={styles.cardLabel}>Checklists ativos</div>
          <div className={styles.cardValue}>{list.filter((c) => c.ativo).length}</div>
        </div>
        <div className={styles.card}>
          <div className={styles.cardLabel}>Total preenchimentos</div>
          <div className={styles.cardValue}>{list.reduce((s, c) => s + c.total_respostas, 0)}</div>
        </div>
      </div>

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Título</th>
              <th>Itens</th>
              <th>Preenchimentos</th>
              <th>Status</th>
              <th>Link</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {list.map((c) => (
              <tr key={c.id}>
                <td>
                  <a href={`/admin/checklists/${c.id}`} className={styles.tdName} style={{ color: '#27367D', textDecoration: 'none' }}>
                    {c.titulo}
                  </a>
                  {c.descricao && <div className={styles.tdSub}>{c.descricao}</div>}
                </td>
                <td className={styles.tdSub}>{c.total_itens}</td>
                <td className={styles.tdSub}>{c.total_respostas}</td>
                <td>
                  <span className={styles.badge} style={{
                    background: c.ativo ? '#d4edda' : '#e2e3e5',
                    color: c.ativo ? '#155724' : '#555',
                  }}>
                    {c.ativo ? 'Ativo' : 'Inativo'}
                  </span>
                </td>
                <td>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(`${origin}/checklist/${c.token}`);
                      showToast('Link copiado!', 'success');
                    }}
                    style={{
                      background: 'none', border: '1px solid #e4e4e0', padding: '4px 10px',
                      fontSize: '0.72rem', cursor: 'pointer', fontFamily: "'Barlow Condensed', sans-serif",
                      fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#27367D',
                    }}
                  >
                    Copiar link
                  </button>
                </td>
                <td>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button
                      type="button"
                      onClick={() => toggleAtivo(c)}
                      style={{
                        background: 'none', border: '1px solid #e4e4e0', padding: '4px 10px',
                        fontSize: '0.72rem', cursor: 'pointer', fontFamily: "'Barlow Condensed', sans-serif",
                        fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#555',
                      }}
                    >
                      {c.ativo ? 'Desativar' : 'Ativar'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && list.length === 0 && (
          <div className={styles.empty}>Nenhum checklist criado. Clique em "+ Novo checklist".</div>
        )}
        {loading && <div className={styles.empty}>Carregando...</div>}
      </div>

      {/* Modal de criação */}
      {showModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 500, background: 'rgba(0,0,0,0.6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem',
        }} onClick={(e) => { if (e.target === e.currentTarget && !saving) setShowModal(false); }}>
          <div style={{
            background: '#FDFDFB', width: '100%', maxWidth: 600, maxHeight: '92vh',
            display: 'flex', flexDirection: 'column', boxShadow: '0 24px 60px rgba(0,0,0,0.3)',
          }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #e4e4e0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.4rem', color: '#27367D', margin: 0 }}>Novo Checklist</h3>
              <button type="button" onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#aaa', padding: 4 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
              </button>
            </div>
            <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
              <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }}>
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: '0.75rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#777', marginBottom: 6 }}>Título *</label>
                  <input type="text" value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ex: Abertura da loja" required
                    style={{ width: '100%', padding: '11px 14px', border: '1.5px solid #e4e4e0', fontSize: '0.95rem', outline: 'none' }} />
                </div>
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: '0.75rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#777', marginBottom: 6 }}>Descrição</label>
                  <input type="text" value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Opcional"
                    style={{ width: '100%', padding: '11px 14px', border: '1.5px solid #e4e4e0', fontSize: '0.95rem', outline: 'none' }} />
                </div>

                <label style={{ display: 'block', fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: '0.75rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#777', marginBottom: 8 }}>Itens do checklist</label>
                {itens.map((item, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
                    <select value={item.tipo} onChange={(e) => updateItem(i, 'tipo', e.target.value)}
                      style={{ padding: '8px', border: '1px solid #e4e4e0', fontSize: '0.82rem', width: 110 }}>
                      <option value="checkbox">Checkbox</option>
                      <option value="texto">Texto</option>
                      <option value="foto">Foto</option>
                    </select>
                    <input type="text" value={item.label} onChange={(e) => updateItem(i, 'label', e.target.value)}
                      placeholder="Descrição do item" style={{ flex: 1, padding: '8px 12px', border: '1px solid #e4e4e0', fontSize: '0.88rem' }} />
                    {itens.length > 1 && (
                      <button type="button" onClick={() => removeItem(i)} style={{ background: 'none', border: 'none', color: '#dc3545', cursor: 'pointer', padding: 4, fontSize: '1.1rem' }}>×</button>
                    )}
                  </div>
                ))}
                <button type="button" onClick={addItem}
                  style={{ background: 'none', border: '1px dashed #ccc', padding: '8px 14px', width: '100%', cursor: 'pointer', color: '#777', fontSize: '0.82rem', marginTop: 4 }}>
                  + Adicionar item
                </button>
              </div>
              <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid #e4e4e0', display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setShowModal(false)} disabled={saving}
                  style={{ padding: '8px 16px', background: 'transparent', border: '1.5px solid #e4e4e0', cursor: 'pointer', fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: '0.82rem', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                  Cancelar
                </button>
                <button type="submit" disabled={saving}
                  style={{ padding: '8px 16px', background: '#27367D', color: '#fff', border: 'none', cursor: 'pointer', fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: '0.82rem', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                  {saving ? 'Criando...' : 'Criar checklist'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
