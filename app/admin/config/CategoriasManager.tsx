'use client';

import { useCallback, useEffect, useState } from 'react';
import { useToast } from '@/components/Toast';
import styles from './page.module.css';

type Categoria = {
  id: number;
  tipo: 'moto' | 'peca';
  slug: string;
  label: string;
  descricao: string;
  ordem: number;
  ativo: number;
};

type Props = {
  tipo: 'moto' | 'peca';
  titulo: string;
};

export default function CategoriasManager({ tipo, titulo }: Props) {
  const { showToast } = useToast();
  const [list, setList] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(true);

  // Form
  const [novoLabel, setNovoLabel] = useState('');
  const [novaDesc, setNovaDesc] = useState('');
  const [saving, setSaving] = useState(false);

  // Edit
  const [editId, setEditId] = useState<number | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [editDesc, setEditDesc] = useState('');

  const reload = useCallback(async () => {
    try {
      const r = await fetch(`/api/categorias?tipo=${tipo}`);
      if (r.ok) setList(await r.json());
    } finally {
      setLoading(false);
    }
  }, [tipo]);

  useEffect(() => { reload(); }, [reload]);

  const criar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoLabel.trim()) return;
    setSaving(true);
    try {
      const r = await fetch('/api/categorias', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tipo, label: novoLabel.trim(), descricao: novaDesc.trim() }),
      });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        throw new Error(d.error || 'fail');
      }
      showToast('Categoria criada', 'success');
      setNovoLabel('');
      setNovaDesc('');
      await reload();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Erro', 'error');
    } finally {
      setSaving(false);
    }
  };

  const salvarEdit = async (c: Categoria) => {
    try {
      const r = await fetch(`/api/categorias/${c.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label: editLabel.trim(), descricao: editDesc.trim() }),
      });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        throw new Error(d.error || 'fail');
      }
      showToast('Atualizada', 'success');
      setEditId(null);
      await reload();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Erro', 'error');
    }
  };

  const remover = async (c: Categoria) => {
    if (!confirm(`Excluir categoria "${c.label}"?`)) return;
    try {
      const r = await fetch(`/api/categorias/${c.id}`, { method: 'DELETE' });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        throw new Error(d.error || 'Erro');
      }
      showToast('Categoria removida', 'success');
      await reload();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Erro', 'error');
    }
  };

  return (
    <section className={styles.configSection}>
      <h2 className={styles.configSectionTitle}>{titulo}</h2>

      <form onSubmit={criar} style={{ marginBottom: '1rem' }}>
        <div className={styles.formRow}>
          <div className={styles.formGroup}>
            <label>Nova categoria</label>
            <input type="text" value={novoLabel} onChange={(e) => setNovoLabel(e.target.value)}
              placeholder={tipo === 'moto' ? 'Ex: Scooters' : 'Ex: Óleos e lubrificantes'} />
          </div>
          <div className={styles.formGroup}>
            <label>Descrição (opcional)</label>
            <input type="text" value={novaDesc} onChange={(e) => setNovaDesc(e.target.value)} />
          </div>
        </div>
        <button type="submit" className={`${styles.btn} ${styles.btnPrimary}`} disabled={saving || !novoLabel.trim()}>
          + Adicionar categoria
        </button>
      </form>

      {loading ? (
        <p style={{ color: '#777' }}>Carregando...</p>
      ) : (
        <div style={{ border: '1px solid #e4e4e0', background: '#fff' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ background: '#f7f7f4', textAlign: 'left' }}>
                <th style={{ padding: '0.6rem 0.75rem' }}>Nome</th>
                <th style={{ padding: '0.6rem 0.75rem' }}>Slug</th>
                <th style={{ padding: '0.6rem 0.75rem', textAlign: 'right' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {list.map((c) => (
                <tr key={c.id} style={{ borderTop: '1px solid #e4e4e0' }}>
                  <td style={{ padding: '0.6rem 0.75rem' }}>
                    {editId === c.id ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <input type="text" value={editLabel} onChange={(e) => setEditLabel(e.target.value)}
                          style={{ padding: '6px 10px', border: '1px solid #e4e4e0', fontSize: '0.88rem' }} />
                        <input type="text" value={editDesc} onChange={(e) => setEditDesc(e.target.value)}
                          placeholder="Descrição"
                          style={{ padding: '6px 10px', border: '1px solid #e4e4e0', fontSize: '0.82rem' }} />
                      </div>
                    ) : (
                      <>
                        <div style={{ fontWeight: 600 }}>{c.label}</div>
                        {c.descricao && <div style={{ fontSize: '0.78rem', color: '#777' }}>{c.descricao}</div>}
                      </>
                    )}
                  </td>
                  <td style={{ padding: '0.6rem 0.75rem', color: '#777', fontFamily: 'monospace', fontSize: '0.82rem' }}>
                    {c.slug}
                  </td>
                  <td style={{ padding: '0.6rem 0.75rem', textAlign: 'right' }}>
                    {editId === c.id ? (
                      <>
                        <button className={`${styles.btn} ${styles.btnPrimary}`}
                          style={{ padding: '4px 10px', fontSize: '0.75rem', marginRight: 4 }}
                          onClick={() => salvarEdit(c)}>
                          Salvar
                        </button>
                        <button className={`${styles.btn} ${styles.btnGhost}`}
                          style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                          onClick={() => setEditId(null)}>
                          Cancelar
                        </button>
                      </>
                    ) : (
                      <>
                        <button className={`${styles.btn} ${styles.btnGhost}`}
                          style={{ padding: '4px 10px', fontSize: '0.75rem', marginRight: 4 }}
                          onClick={() => { setEditId(c.id); setEditLabel(c.label); setEditDesc(c.descricao); }}>
                          Editar
                        </button>
                        <button className={`${styles.btn} ${styles.btnGhost}`}
                          style={{ padding: '4px 10px', fontSize: '0.75rem', color: '#dc3545', borderColor: '#f0b4b9' }}
                          onClick={() => remover(c)}>
                          Remover
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
              {list.length === 0 && (
                <tr><td colSpan={3} style={{ padding: '1rem', color: '#777', textAlign: 'center' }}>Nenhuma categoria cadastrada.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
