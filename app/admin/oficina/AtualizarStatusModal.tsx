'use client';

import { useState } from 'react';
import {
  OFICINA_STATUSES,
  OFICINA_STATUS_LABELS,
  STATUS_EXCLUIDOS_DO_MODAL,
  type OficinaStatus,
} from '@/lib/oficina-status';
import styles from './page.module.css';

type Props = {
  ordemId: number;
  label: string;
  statusAtual: string;
  onClose: () => void;
  onUpdated: () => void;
  onToast: (msg: string, type: 'success' | 'error') => void;
};

export default function AtualizarStatusModal({
  ordemId,
  label,
  statusAtual,
  onClose,
  onUpdated,
  onToast,
}: Props) {
  const opcoes = OFICINA_STATUSES.filter(
    (s) => !STATUS_EXCLUIDOS_DO_MODAL.includes(s) && s !== statusAtual,
  );
  const [novoStatus, setNovoStatus] = useState<OficinaStatus | ''>(
    (opcoes[0] as OficinaStatus | undefined) ?? '',
  );
  const [mensagem, setMensagem] = useState('');
  const [autor, setAutor] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoStatus) {
      onToast('Selecione o novo status', 'error');
      return;
    }
    setSaving(true);
    try {
      const r = await fetch(`/api/oficina/${ordemId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: novoStatus,
          mensagem_historico: mensagem.trim(),
          autor: autor.trim(),
        }),
      });
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        throw new Error(err?.error || 'fail');
      }
      onToast('Status atualizado!', 'success');
      onUpdated();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao atualizar status';
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
            <h3>Atualizar Status</h3>
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
              Atualizando <strong>{label}</strong>. Status atual:{' '}
              <strong>{OFICINA_STATUS_LABELS[statusAtual as OficinaStatus] ?? statusAtual}</strong>
            </p>
            <div className={styles.formGroup}>
              <label>Novo status *</label>
              <select
                value={novoStatus}
                onChange={(e) => setNovoStatus(e.target.value as OficinaStatus)}
                required
                autoFocus
              >
                {opcoes.map((s) => (
                  <option key={s} value={s}>
                    {OFICINA_STATUS_LABELS[s]}
                  </option>
                ))}
              </select>
              <small style={{ color: '#777', fontSize: '0.75rem', display: 'block', marginTop: 4 }}>
                Para finalizar, use o botão &quot;Fechar OS&quot; (precisa do valor final).
              </small>
            </div>
            <div className={styles.formGroup}>
              <label>Mensagem / observação (opcional)</label>
              <textarea
                value={mensagem}
                onChange={(e) => setMensagem(e.target.value)}
                rows={3}
                placeholder="Ex: peça chegou, retomando montagem"
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
              disabled={saving || !novoStatus}
            >
              {saving ? 'Salvando...' : 'Atualizar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
