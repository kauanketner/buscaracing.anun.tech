'use client';

import { useState } from 'react';
import styles from './page.module.css';

type Props = {
  ordemId: number;
  label: string;
  onClose: () => void;
  onCreated: (newId: number) => void;
  onToast: (msg: string, type: 'success' | 'error') => void;
};

export default function GarantiaModal({
  ordemId,
  label,
  onClose,
  onCreated,
  onToast,
}: Props) {
  const [servicoDescricao, setServicoDescricao] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [autor, setAutor] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!servicoDescricao.trim()) {
      onToast('Descreva o motivo da garantia', 'error');
      return;
    }
    setSaving(true);
    try {
      const r = await fetch(`/api/oficina/${ordemId}/garantia`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          servico_descricao: servicoDescricao.trim(),
          mensagem: mensagem.trim(),
          autor: autor.trim(),
        }),
      });
      const d = (await r.json().catch(() => ({}))) as { id?: number; error?: string };
      if (!r.ok) {
        throw new Error(d?.error || 'fail');
      }
      onToast('Garantia aberta!', 'success');
      if (d.id) onCreated(d.id);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao abrir garantia';
      onToast(msg, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className={styles.modalOverlay}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className={`${styles.modal} ${styles.modalSm}`}>
        <form onSubmit={submit} className={styles.modalForm}>
          <div className={styles.modalHeader}>
            <h3>Abrir Garantia</h3>
            <button
              type="button"
              className={styles.modalClose}
              onClick={onClose}
              aria-label="Fechar"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          </div>
          <div className={styles.modalBody}>
            <p style={{ color: '#555', marginBottom: '1rem', fontSize: '0.9rem' }}>
              Abrindo uma nova OS de garantia a partir da <strong>{label}</strong>. Os dados do
              cliente e da moto serão copiados.
            </p>
            <div className={styles.formGroup}>
              <label>Motivo da garantia *</label>
              <textarea
                value={servicoDescricao}
                onChange={(e) => setServicoDescricao(e.target.value)}
                rows={3}
                required
                autoFocus
                placeholder="Ex: mesmo ruído na transmissão voltou após 15 dias"
              />
            </div>
            <div className={styles.formGroup}>
              <label>Observação inicial (opcional)</label>
              <textarea
                value={mensagem}
                onChange={(e) => setMensagem(e.target.value)}
                rows={2}
                placeholder="Anotação pra abrir no histórico"
              />
            </div>
            <div className={styles.formGroup}>
              <label>Responsável (opcional)</label>
              <input
                type="text"
                value={autor}
                onChange={(e) => setAutor(e.target.value)}
                placeholder="Seu nome"
              />
            </div>
          </div>
          <div className={styles.modalFooter}>
            <button
              type="button"
              className={`${styles.btn} ${styles.btnGhost}`}
              onClick={onClose}
              disabled={saving}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className={`${styles.btn} ${styles.btnPrimary}`}
              disabled={saving}
            >
              {saving ? 'Abrindo...' : 'Abrir Garantia'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
