'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useToast } from '@/components/Toast';
import CurrencyInput, { centsToDecimal } from '@/components/CurrencyInput';
import styles from './page.module.css';

export type Servico = {
  id?: number;
  nome: string;
  codigo?: string;
  categoria?: string;
  descricao?: string;
  preco?: number | null;
  ativo?: number;
};

type Props = {
  editingId: number | null;
  onClose: () => void;
  onSaved: () => void;
};

export default function ServicoModal({ editingId, onClose, onSaved }: Props) {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [nome, setNome] = useState('');
  const [codigo, setCodigo] = useState('');
  const [categoria, setCategoria] = useState('');
  const [descricao, setDescricao] = useState('');
  const [preco, setPreco] = useState(''); // centavos
  const [ativo, setAtivo] = useState(true);

  const isEditing = editingId !== null;

  useEffect(() => {
    if (editingId === null) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const r = await fetch(`/api/servicos/${editingId}`);
        const s: Servico = await r.json();
        if (cancelled) return;
        setNome(s.nome || '');
        setCodigo(s.codigo || '');
        setCategoria(s.categoria || '');
        setDescricao(s.descricao || '');
        setPreco(s.preco != null ? String(Math.round(Number(s.preco) * 100)) : '');
        setAtivo(s.ativo == null ? true : Boolean(s.ativo));
      } catch {
        showToast('Erro ao carregar serviço', 'error');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [editingId, showToast]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) {
      showToast('Nome obrigatório', 'error');
      return;
    }
    setSaving(true);
    try {
      const body = {
        nome: nome.trim(),
        codigo: codigo.trim(),
        categoria: categoria.trim() || 'outros',
        descricao: descricao.trim(),
        preco: preco ? Number(centsToDecimal(preco)) : null,
        ativo,
      };
      const url = isEditing ? `/api/servicos/${editingId}` : '/api/servicos';
      const method = isEditing ? 'PUT' : 'POST';
      const r = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!r.ok) throw new Error('fail');
      showToast(isEditing ? 'Serviço atualizado' : 'Serviço cadastrado', 'success');
      onSaved();
    } catch {
      showToast('Erro ao salvar serviço', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={(e) => { if (e.target === e.currentTarget && !saving) onClose(); }}>
      <form className={styles.modal} onSubmit={onSubmit}>
        <div className={styles.modalHeader}>
          <h3>{isEditing ? 'Editar serviço' : 'Novo serviço'}</h3>
          <button type="button" className={styles.modalClose} onClick={onClose} disabled={saving}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <div className={styles.modalBody}>
          {loading && <p style={{ color: '#777', fontSize: '0.85rem' }}>Carregando...</p>}

          <div className={styles.formGroup}>
            <label>Nome *</label>
            <input
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex: Troca de óleo"
              required
              autoFocus
            />
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label>Código</label>
              <input
                type="text"
                value={codigo}
                onChange={(e) => setCodigo(e.target.value)}
                placeholder="OPCIONAL"
              />
            </div>
            <div className={styles.formGroup}>
              <label>Categoria</label>
              <input
                type="text"
                value={categoria}
                onChange={(e) => setCategoria(e.target.value)}
                placeholder="Ex: Manutenção, Elétrica"
              />
            </div>
          </div>

          <div className={styles.formGroup}>
            <label>Preço sugerido</label>
            <CurrencyInput value={preco} onChange={setPreco} placeholder="R$ 0,00" />
            <span style={{ fontSize: '0.72rem', color: '#777', marginTop: 4, display: 'block' }}>
              Pode ser ajustado quando lançar na OS.
            </span>
          </div>

          <div className={styles.formGroup}>
            <label>Descrição</label>
            <textarea
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Detalhes do serviço (opcional)"
              rows={3}
            />
          </div>

          <div className={styles.formGroup}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', textTransform: 'none', letterSpacing: 0, fontSize: '0.88rem', color: '#333', fontWeight: 400 }}>
              <input
                type="checkbox"
                checked={ativo}
                onChange={(e) => setAtivo(e.target.checked)}
                style={{ width: 'auto', margin: 0 }}
              />
              Ativo (aparece quando lançar serviço numa OS)
            </label>
          </div>
        </div>
        <div className={styles.modalFooter}>
          <button type="button" className={`${styles.btn} ${styles.btnGhost}`} onClick={onClose} disabled={saving}>
            Cancelar
          </button>
          <button type="submit" className={`${styles.btn} ${styles.btnPrimary}`} disabled={saving}>
            {saving ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </form>
    </div>
  );
}
