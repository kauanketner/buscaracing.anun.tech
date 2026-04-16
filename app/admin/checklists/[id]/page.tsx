'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { useParams } from 'next/navigation';
import { useToast } from '@/components/Toast';
import styles from '../../vendas/page.module.css';

type Item = { id: number; tipo: string; label: string; ordem: number };
type Resposta = { id: number; preenchido_por: string; created_at: string };
type ChecklistDetail = {
  id: number;
  titulo: string;
  descricao: string;
  token: string;
  ativo: number;
  itens: Item[];
  respostas: Resposta[];
};

type ItemDraft = { tipo: string; label: string };

function fmtDateTime(iso: string): string {
  if (!iso) return '—';
  const d = new Date(iso.replace(' ', 'T'));
  return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

const TIPO_ICONS: Record<string, string> = { checkbox: '☑', texto: '✏', foto: '📷' };

export default function ChecklistDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const { showToast } = useToast();

  const [data, setData] = useState<ChecklistDetail | null>(null);
  const [loading, setLoading] = useState(true);

  // Edit mode
  const [editing, setEditing] = useState(false);
  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [itens, setItens] = useState<ItemDraft[]>([]);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await fetch(`/api/checklists/${id}`);
      if (r.ok) {
        const d: ChecklistDetail = await r.json();
        setData(d);
      }
    } catch {
      showToast('Erro ao carregar', 'error');
    } finally {
      setLoading(false);
    }
  }, [id, showToast]);

  useEffect(() => { load(); }, [load]);

  const startEdit = () => {
    if (!data) return;
    setTitulo(data.titulo);
    setDescricao(data.descricao || '');
    setItens(data.itens.map((i) => ({ tipo: i.tipo, label: i.label })));
    setEditing(true);
  };

  const cancelEdit = () => setEditing(false);

  const addItem = () => setItens([...itens, { tipo: 'checkbox', label: '' }]);
  const removeItem = (i: number) => setItens(itens.filter((_, j) => j !== i));
  const updateItem = (i: number, field: 'tipo' | 'label', val: string) => {
    const copy = [...itens];
    copy[i] = { ...copy[i], [field]: val };
    setItens(copy);
  };
  const moveItem = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= itens.length) return;
    const copy = [...itens];
    [copy[i], copy[j]] = [copy[j], copy[i]];
    setItens(copy);
  };

  const onSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!titulo.trim()) { showToast('Título obrigatório', 'error'); return; }
    const validItens = itens.filter((i) => i.label.trim());
    if (validItens.length === 0) { showToast('Adicione pelo menos 1 item', 'error'); return; }
    setSaving(true);
    try {
      const r = await fetch(`/api/checklists/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ titulo: titulo.trim(), descricao: descricao.trim(), itens: validItens }),
      });
      if (!r.ok) throw new Error('fail');
      showToast('Checklist atualizado!', 'success');
      setEditing(false);
      await load();
    } catch {
      showToast('Erro ao salvar', 'error');
    } finally {
      setSaving(false);
    }
  };

  const origin = typeof window !== 'undefined' ? window.location.origin : '';

  if (loading) return <div className={styles.wrap} style={{ padding: '2rem', color: '#777' }}>Carregando...</div>;
  if (!data) return <div className={styles.wrap} style={{ padding: '2rem', color: '#777' }}>Checklist não encontrado.</div>;

  return (
    <div className={styles.wrap}>
      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
          <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.6rem', color: '#27367D', margin: 0, flex: 1 }}>
            {data.titulo}
          </h2>
          {!editing && (
            <button
              type="button"
              onClick={startEdit}
              style={{
                background: '#27367D', color: '#fff', border: 'none', padding: '6px 14px',
                cursor: 'pointer', fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700,
                fontSize: '0.78rem', letterSpacing: '0.08em', textTransform: 'uppercase',
                display: 'inline-flex', alignItems: 'center', gap: 6,
              }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Editar
            </button>
          )}
        </div>
        {data.descricao && !editing && <p style={{ color: '#777', fontSize: '0.88rem', margin: 0 }}>{data.descricao}</p>}
        <div style={{ marginTop: 10, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <span className={styles.badge} style={{
            background: data.ativo ? '#d4edda' : '#e2e3e5',
            color: data.ativo ? '#155724' : '#555',
          }}>
            {data.ativo ? 'Ativo' : 'Inativo'}
          </span>
          <code style={{ fontSize: '0.78rem', color: '#27367D', background: '#f8f8f5', padding: '4px 8px', border: '1px solid #e4e4e0' }}>
            {origin}/checklist/{data.token}
          </code>
          <button
            type="button"
            onClick={() => {
              navigator.clipboard.writeText(`${origin}/checklist/${data.token}`);
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
        </div>
      </div>

      {/* Edit mode */}
      {editing ? (
        <form onSubmit={onSave} style={{ background: '#fff', border: '1px solid #e4e4e0', padding: '1.25rem', marginBottom: '1.5rem' }}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: '0.75rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#777', marginBottom: 6 }}>Título *</label>
            <input type="text" value={titulo} onChange={(e) => setTitulo(e.target.value)} required
              style={{ width: '100%', padding: '11px 14px', border: '1.5px solid #e4e4e0', fontSize: '0.95rem', outline: 'none' }} />
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: '0.75rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#777', marginBottom: 6 }}>Descrição</label>
            <input type="text" value={descricao} onChange={(e) => setDescricao(e.target.value)}
              style={{ width: '100%', padding: '11px 14px', border: '1.5px solid #e4e4e0', fontSize: '0.95rem', outline: 'none' }} />
          </div>

          <label style={{ display: 'block', fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: '0.75rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#777', marginBottom: 8 }}>Itens</label>
          {itens.map((item, i) => (
            <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 8, alignItems: 'center' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <button type="button" onClick={() => moveItem(i, -1)} disabled={i === 0}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: i === 0 ? '#ddd' : '#777', padding: 0, fontSize: '0.7rem', lineHeight: 1 }}>▲</button>
                <button type="button" onClick={() => moveItem(i, 1)} disabled={i === itens.length - 1}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: i === itens.length - 1 ? '#ddd' : '#777', padding: 0, fontSize: '0.7rem', lineHeight: 1 }}>▼</button>
              </div>
              <select value={item.tipo} onChange={(e) => updateItem(i, 'tipo', e.target.value)}
                style={{ padding: '8px', border: '1px solid #e4e4e0', fontSize: '0.82rem', width: 110 }}>
                <option value="checkbox">Checkbox</option>
                <option value="texto">Texto</option>
                <option value="foto">Foto</option>
              </select>
              <input type="text" value={item.label} onChange={(e) => updateItem(i, 'label', e.target.value)}
                placeholder="Descrição do item" style={{ flex: 1, padding: '8px 12px', border: '1px solid #e4e4e0', fontSize: '0.88rem' }} />
              {itens.length > 1 && (
                <button type="button" onClick={() => removeItem(i)}
                  style={{ background: 'none', border: 'none', color: '#dc3545', cursor: 'pointer', padding: 4, fontSize: '1.1rem' }}>×</button>
              )}
            </div>
          ))}
          <button type="button" onClick={addItem}
            style={{ background: 'none', border: '1px dashed #ccc', padding: '8px 14px', width: '100%', cursor: 'pointer', color: '#777', fontSize: '0.82rem', marginTop: 4, marginBottom: '1rem' }}>
            + Adicionar item
          </button>

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button type="button" onClick={cancelEdit} disabled={saving}
              style={{ padding: '8px 16px', background: 'transparent', border: '1.5px solid #e4e4e0', cursor: 'pointer', fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: '0.82rem', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              Cancelar
            </button>
            <button type="submit" disabled={saving}
              style={{ padding: '8px 16px', background: '#27367D', color: '#fff', border: 'none', cursor: 'pointer', fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: '0.82rem', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              {saving ? 'Salvando...' : 'Salvar alterações'}
            </button>
          </div>
        </form>
      ) : (
        /* View mode — Items */
        <div style={{ background: '#fff', border: '1px solid #e4e4e0', padding: '1rem 1.25rem', marginBottom: '1.5rem' }}>
          <div style={{ fontSize: '0.72rem', color: '#777', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 700, marginBottom: 10 }}>
            Itens ({data.itens.length})
          </div>
          {data.itens.map((item, i) => (
            <div key={item.id} style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '6px 0', borderBottom: i < data.itens.length - 1 ? '1px solid #f1f1ee' : 'none' }}>
              <span style={{ fontSize: '0.9rem', width: 24, textAlign: 'center' }}>{TIPO_ICONS[item.tipo] || '·'}</span>
              <span style={{ flex: 1, fontSize: '0.9rem' }}>{item.label}</span>
              <span className={styles.badge} style={{ background: '#f0f0ed', color: '#777', fontSize: '0.65rem' }}>{item.tipo}</span>
            </div>
          ))}
        </div>
      )}

      {/* History */}
      <div style={{ background: '#fff', border: '1px solid #e4e4e0', padding: '1rem 1.25rem' }}>
        <div style={{ fontSize: '0.72rem', color: '#777', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 700, marginBottom: 10 }}>
          Historico de preenchimentos ({data.respostas.length})
        </div>
        {data.respostas.length === 0 ? (
          <p style={{ color: '#999', fontSize: '0.85rem' }}>Nenhum preenchimento ainda.</p>
        ) : (
          <table className={styles.table} style={{ margin: 0 }}>
            <thead>
              <tr>
                <th>#</th>
                <th>Preenchido por</th>
                <th>Data/Hora</th>
              </tr>
            </thead>
            <tbody>
              {data.respostas.map((r, i) => (
                <tr key={r.id}>
                  <td className={styles.tdSub}>{data.respostas.length - i}</td>
                  <td className={styles.tdName}>{r.preenchido_por}</td>
                  <td className={styles.tdSub}>{fmtDateTime(r.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
