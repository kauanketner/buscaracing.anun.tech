'use client';

import { useState } from 'react';
import styles from './page.module.css';

type Props = {
  ordemId: number;
  label: string;
  defaultValor: number | null;
  onClose: () => void;
  onClosed: () => void;
  onToast: (msg: string, type: 'success' | 'error') => void;
};

export default function FecharModal({
  ordemId,
  label,
  defaultValor,
  onClose,
  onClosed,
  onToast,
}: Props) {
  const [valorFinal, setValorFinal] = useState<string>(
    defaultValor != null ? String(defaultValor) : '',
  );
  const [dataConclusao, setDataConclusao] = useState<string>(
    new Date().toISOString().slice(0, 10),
  );
  const [observacoes, setObservacoes] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valorFinal.trim()) {
      onToast('Informe o valor final', 'error');
      return;
    }
    const n = Number(valorFinal);
    if (!Number.isFinite(n) || n < 0) {
      onToast('Valor final inválido', 'error');
      return;
    }
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        valor_final: valorFinal,
        status: 'concluida',
        data_conclusao: dataConclusao || null,
      };
      if (observacoes.trim()) {
        payload.observacoes = observacoes.trim();
      }
      const r = await fetch(`/api/oficina/${ordemId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        throw new Error(err?.error || 'fail');
      }
      onToast('Ordem fechada!', 'success');
      onClosed();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao fechar ordem';
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
            <h3>Fechar Ordem</h3>
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
              Fechando a ordem <strong>{label}</strong>. Informe o valor final cobrado e
              a data de conclusão.
            </p>
            <div className={styles.formGroup}>
              <label>Valor final (R$) *</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={valorFinal}
                onChange={(e) => setValorFinal(e.target.value)}
                required
                autoFocus
              />
            </div>
            <div className={styles.formGroup}>
              <label>Data de conclusão</label>
              <input
                type="date"
                value={dataConclusao}
                onChange={(e) => setDataConclusao(e.target.value)}
              />
            </div>
            <div className={styles.formGroup}>
              <label>Observações finais (opcional)</label>
              <textarea
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                rows={2}
                placeholder="Ex: troca de óleo + revisão geral concluída"
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
              {saving ? 'Fechando...' : 'Fechar Ordem'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
