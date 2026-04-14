'use client';

import { useEffect, useState } from 'react';
import styles from './page.module.css';

type Vendedor = {
  id: number;
  nome: string;
  ativo: number;
};

type Props = {
  motoId: number;
  motoLabel: string;
  onClose: () => void;
  onSold: () => void;
  onError: (msg: string) => void;
};

export default function SellModal({ motoId, motoLabel, onClose, onSold, onError }: Props) {
  const [vendedores, setVendedores] = useState<Vendedor[]>([]);
  const [loadingVendedores, setLoadingVendedores] = useState(true);
  const [vendedorId, setVendedorId] = useState<string>('');
  const [compradorNome, setCompradorNome] = useState('');
  const [valorVenda, setValorVenda] = useState('');
  const [dataVenda, setDataVenda] = useState(() => new Date().toISOString().slice(0, 10));
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch('/api/config/vendedores');
        const d: Vendedor[] = r.ok ? await r.json() : [];
        if (!cancelled) {
          const ativos = Array.isArray(d) ? d.filter((v) => v.ativo) : [];
          setVendedores(ativos);
        }
      } catch {
        if (!cancelled) setVendedores([]);
      } finally {
        if (!cancelled) setLoadingVendedores(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const comprador = compradorNome.trim();
    if (!vendedorId) {
      onError('Selecione o vendedor');
      return;
    }
    if (!comprador) {
      onError('Informe o nome do comprador');
      return;
    }
    setSubmitting(true);
    try {
      const r = await fetch(`/api/motos/${motoId}/venda`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vendedor_id: Number(vendedorId),
          comprador_nome: comprador,
          valor_venda_final: valorVenda ? Number(valorVenda) : null,
          data_venda: dataVenda,
        }),
      });
      if (!r.ok) throw new Error('fail');
      onSold();
    } catch {
      onError('Erro ao registrar venda');
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
      <form className={`${styles.modal} ${styles.modalSm}`} onSubmit={onSubmit}>
        <div className={styles.modalHeader}>
          <h3>Registrar Venda</h3>
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
          <p style={{ fontSize: '0.85rem', color: '#555', marginBottom: '1rem' }}>
            Registrando venda de: <strong>{motoLabel}</strong>
          </p>

          <div className={styles.formGroup}>
            <label>Vendedor (quem vendeu) *</label>
            {loadingVendedores ? (
              <div style={{ color: '#777', fontSize: '0.85rem' }}>Carregando vendedores...</div>
            ) : vendedores.length === 0 ? (
              <div
                style={{
                  background: '#fff8ec',
                  border: '1px solid #f0b429',
                  padding: '0.75rem',
                  fontSize: '0.82rem',
                  color: '#b54708',
                }}
              >
                Nenhum vendedor cadastrado. Cadastre em <strong>Configurações → Vendedores</strong>.
              </div>
            ) : (
              <select value={vendedorId} onChange={(e) => setVendedorId(e.target.value)} required>
                <option value="">Selecione um vendedor</option>
                {vendedores.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.nome}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className={styles.formGroup}>
            <label>Nome do Comprador *</label>
            <input
              type="text"
              value={compradorNome}
              onChange={(e) => setCompradorNome(e.target.value)}
              placeholder="Ex: João da Silva"
              required
            />
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label>Valor da Venda (R$)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={valorVenda}
                onChange={(e) => setValorVenda(e.target.value)}
                placeholder="0,00"
              />
            </div>
            <div className={styles.formGroup}>
              <label>Data da Venda</label>
              <input
                type="date"
                value={dataVenda}
                onChange={(e) => setDataVenda(e.target.value)}
              />
            </div>
          </div>
        </div>
        <div className={styles.modalFooter}>
          <button
            type="button"
            className={`${styles.btn} ${styles.btnGhost}`}
            onClick={onClose}
            disabled={submitting}
          >
            Cancelar
          </button>
          <button
            type="submit"
            className={`${styles.btn} ${styles.btnPrimary}`}
            disabled={submitting || vendedores.length === 0}
          >
            {submitting ? 'Salvando...' : 'Confirmar Venda'}
          </button>
        </div>
      </form>
    </div>
  );
}
