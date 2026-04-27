'use client';

import { useRef, useState, type FormEvent } from 'react';
import { useToast } from '@/components/Toast';
import styles from './page.module.css';

type Props = {
  motoId: number;
  motoLabel: string;
  onClose: () => void;
  onSaved: () => void;
};

const MAX_COMPROVANTES = 10;

export default function ReservaModal({ motoId, motoLabel, onClose, onSaved }: Props) {
  const { showToast } = useToast();
  const [clienteNome, setClienteNome] = useState('');
  const [clienteTel, setClienteTel] = useState('');
  const [valorSinal, setValorSinal] = useState('500');
  const [diasPrazo, setDiasPrazo] = useState('7');
  const [saving, setSaving] = useState(false);

  // Comprovantes (uploaded depois que a reserva for criada)
  const [comprovantes, setComprovantes] = useState<File[]>([]);
  const comprovanteInputRef = useRef<HTMLInputElement>(null);

  const onAddComprovantes = (files: FileList | null) => {
    if (!files) return;
    const novos = Array.from(files);
    const total = comprovantes.length + novos.length;
    if (total > MAX_COMPROVANTES) {
      showToast(`Máximo ${MAX_COMPROVANTES} comprovantes`, 'error');
      return;
    }
    setComprovantes((cur) => [...cur, ...novos]);
    if (comprovanteInputRef.current) comprovanteInputRef.current.value = '';
  };
  const removeComprovante = (idx: number) => {
    setComprovantes((cur) => cur.filter((_, i) => i !== idx));
  };

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

      // Upload dos comprovantes anexados (se houver)
      if (comprovantes.length > 0 && d.reserva_id) {
        let fail = 0;
        for (const file of comprovantes) {
          const fd = new FormData();
          fd.append('file', file);
          try {
            const up = await fetch(`/api/reservas/${d.reserva_id}/comprovantes`, {
              method: 'POST',
              body: fd,
            });
            if (!up.ok) fail++;
          } catch { fail++; }
        }
        if (fail > 0) {
          showToast(`Reserva criada, mas ${fail} comprovante(s) falharam.`, 'error');
        }
      }

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
        <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
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

            {/* Comprovantes */}
            <div className={styles.formGroup}>
              <label>
                Comprovantes do sinal{' '}
                <span style={{ fontWeight: 400, color: '#999', textTransform: 'none', letterSpacing: 0, fontSize: '0.75rem' }}>
                  ({comprovantes.length}/{MAX_COMPROVANTES})
                </span>
              </label>
              <div style={{ border: '1.5px dashed #e4e4e0', padding: 10, background: '#fafaf8' }}>
                <input
                  ref={comprovanteInputRef}
                  type="file"
                  accept="image/*,application/pdf"
                  multiple
                  onChange={(e) => onAddComprovantes(e.target.files)}
                  style={{ display: 'none' }}
                />
                <button
                  type="button"
                  onClick={() => comprovanteInputRef.current?.click()}
                  disabled={comprovantes.length >= MAX_COMPROVANTES}
                  style={{
                    background: '#fff', border: '1.5px solid #e4e4e0', padding: '8px 14px',
                    fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: '0.78rem',
                    letterSpacing: '0.08em', textTransform: 'uppercase', color: '#27367D',
                    cursor: comprovantes.length >= MAX_COMPROVANTES ? 'not-allowed' : 'pointer',
                    opacity: comprovantes.length >= MAX_COMPROVANTES ? 0.5 : 1,
                  }}
                >
                  + Adicionar
                </button>
                <span style={{ fontSize: '0.75rem', color: '#777', marginLeft: 8 }}>
                  Imagens (PIX, print) ou PDF
                </span>

                {comprovantes.length > 0 && (
                  <ul style={{ listStyle: 'none', margin: '10px 0 0', padding: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {comprovantes.map((f, i) => (
                      <li key={i} style={{
                        display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px',
                        background: '#fff', border: '1px solid #e4e4e0', fontSize: '0.82rem',
                      }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0, color: '#27367D' }}>
                          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
                          <polyline points="14 2 14 8 20 8" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
                        </svg>
                        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {f.name}
                        </span>
                        <span style={{ fontSize: '0.72rem', color: '#777' }}>
                          {(f.size / 1024).toFixed(0)} KB
                        </span>
                        <button type="button" onClick={() => removeComprovante(i)}
                          style={{ background: 'none', border: 'none', color: '#dc3545', cursor: 'pointer', padding: 2 }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                            <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                          </svg>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
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
