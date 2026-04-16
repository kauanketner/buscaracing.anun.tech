'use client';

import { useState, type FormEvent } from 'react';
import { useToast } from '@/components/Toast';
import styles from './page.module.css';

type Props = {
  motoId: number;
  motoLabel: string;
  onClose: () => void;
  onSaved: () => void;
};

export default function ReservaModal({ motoId, motoLabel, onClose, onSaved }: Props) {
  const { showToast } = useToast();
  const [clienteNome, setClienteNome] = useState('');
  const [clienteTel, setClienteTel] = useState('');
  const [valorSinal, setValorSinal] = useState('500');
  const [diasPrazo, setDiasPrazo] = useState('7');
  const [saving, setSaving] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!clienteNome.trim()) {
      showToast('Nome do cliente obrigatório', 'error');
      return;
    }
    setSaving(true);
    try {
      const r = await fetch(`/api/motos/${motoId}/reserva`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cliente_nome: clienteNome.trim(),
          cliente_tel: clienteTel.trim(),
          valor_sinal: Number(valorSinal) || 500,
          dias_prazo: Number(diasPrazo) || 7,
        }),
      });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        throw new Error(d.error || 'fail');
      }
      const d = await r.json();
      showToast(`Reserva criada! Expira em ${d.data_expira}`, 'success');
      onSaved();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Erro ao reservar', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={(e) => { if (e.target === e.currentTarget && !saving) onClose(); }}>
      <div className={`${styles.modal} ${styles.modalSm}`}>
        <div className={styles.modalHeader}>
          <h3>Reservar</h3>
          <button type="button" className={styles.modalClose} onClick={onClose} disabled={saving}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <form onSubmit={onSubmit}>
          <div className={styles.modalBody}>
            <p style={{ fontSize: '0.85rem', color: '#555', marginBottom: '1rem' }}>
              {motoLabel}
            </p>
            <div className={styles.formGroup}>
              <label>Nome do cliente *</label>
              <input
                type="text"
                value={clienteNome}
                onChange={(e) => setClienteNome(e.target.value)}
                placeholder="Maria Santos"
                required
                autoFocus
              />
            </div>
            <div className={styles.formGroup}>
              <label>Telefone</label>
              <input
                type="text"
                value={clienteTel}
                onChange={(e) => setClienteTel(e.target.value)}
                placeholder="(11) 99999-9999"
              />
            </div>
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label>Valor do sinal (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  value={valorSinal}
                  onChange={(e) => setValorSinal(e.target.value)}
                />
              </div>
              <div className={styles.formGroup}>
                <label>Prazo (dias)</label>
                <input
                  type="number"
                  value={diasPrazo}
                  onChange={(e) => setDiasPrazo(e.target.value)}
                />
              </div>
            </div>
          </div>
          <div className={styles.modalFooter}>
            <button type="button" className={`${styles.btn} ${styles.btnGhost}`} onClick={onClose} disabled={saving}>
              Cancelar
            </button>
            <button type="submit" className={`${styles.btn} ${styles.btnPrimary}`} disabled={saving}>
              {saving ? 'Reservando...' : 'Confirmar reserva'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
