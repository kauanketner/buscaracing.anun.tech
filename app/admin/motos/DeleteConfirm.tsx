'use client';

import { useState } from 'react';
import styles from './page.module.css';

type Props = {
  label: string;
  motoId: number;
  onClose: () => void;
  onDeleted: () => void;
  onError: (msg: string) => void;
};

export default function DeleteConfirm({ label, motoId, onClose, onDeleted, onError }: Props) {
  const [submitting, setSubmitting] = useState(false);
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);

  const doDelete = async () => {
    if (!password) {
      onError('Informe a senha para excluir');
      return;
    }
    setSubmitting(true);
    try {
      const r = await fetch(`/api/motos/${motoId}`, {
        method: 'DELETE',
        headers: { 'x-delete-password': password },
      });
      if (r.status === 403) {
        onError('Senha incorreta');
        setSubmitting(false);
        return;
      }
      if (!r.ok) throw new Error('fail');
      onDeleted();
    } catch {
      onError('Erro ao excluir');
      setSubmitting(false);
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
        <div className={styles.modalHeader}>
          <h3>Confirmar exclusão</h3>
          <button className={styles.modalClose} onClick={onClose} aria-label="Fechar">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <div className={`${styles.modalBody} ${styles.modalBodyCentered}`}>
          <div className={styles.delIcon}>🗑️</div>
          <p className={styles.delText}>Tem certeza que deseja excluir</p>
          <strong className={styles.delName}>{label}</strong>
          <p className={styles.delHint}>Esta ação não pode ser desfeita.</p>

          <div className={styles.formGroup} style={{ marginTop: '1.25rem', textAlign: 'left' }}>
            <label>Senha de confirmação *</label>
            <div style={{ display: 'flex', gap: 8, alignItems: 'stretch' }}>
              <input
                type={showPwd ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Digite a senha"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !submitting) {
                    e.preventDefault();
                    doDelete();
                  }
                }}
                style={{ flex: 1 }}
              />
              <button
                type="button"
                className={`${styles.btn} ${styles.btnGhost} ${styles.btnSm}`}
                onClick={() => setShowPwd((v) => !v)}
                tabIndex={-1}
                style={{ flexShrink: 0 }}
              >
                {showPwd ? 'Ocultar' : 'Mostrar'}
              </button>
            </div>
          </div>
        </div>
        <div className={styles.modalFooter}>
          <button className={`${styles.btn} ${styles.btnGhost}`} onClick={onClose} disabled={submitting}>
            Cancelar
          </button>
          <button className={`${styles.btn} ${styles.btnDanger}`} onClick={doDelete} disabled={submitting || !password}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <polyline points="3 6 5 6 21 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <path d="M19 6l-1 14H6L5 6M10 11v6M14 11v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            {submitting ? 'Excluindo...' : 'Excluir'}
          </button>
        </div>
      </div>
    </div>
  );
}
