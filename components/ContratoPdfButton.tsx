'use client';

import { useState } from 'react';

type Props = {
  tipo: 'compra' | 'consignacao' | 'venda' | 'os' | 'reserva' | 'entrega';
  id: number;
  label?: string;
  className?: string;
  style?: React.CSSProperties;
};

const DEFAULT_LABELS: Record<string, string> = {
  compra: 'Contrato de compra',
  consignacao: 'Contrato de consignação',
  venda: 'Contrato de venda',
  os: 'Imprimir OS',
  reserva: 'Recibo de reserva',
  entrega: 'Termo de entrega',
};

export default function ContratoPdfButton({ tipo, id, label, className, style }: Props) {
  const [loading, setLoading] = useState(false);

  const gerar = async () => {
    setLoading(true);
    try {
      const url = `/api/contratos/${tipo}/${id}`;
      window.open(url, '_blank');
    } finally {
      setTimeout(() => setLoading(false), 1000);
    }
  };

  return (
    <button
      type="button"
      onClick={gerar}
      disabled={loading}
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        cursor: loading ? 'wait' : 'pointer',
        ...style,
      }}
    >
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
        <polyline points="14 2 14 8 20 8" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
        <line x1="16" y1="13" x2="8" y2="13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <line x1="16" y1="17" x2="8" y2="17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
      {loading ? 'Gerando...' : label || DEFAULT_LABELS[tipo] || 'Gerar PDF'}
    </button>
  );
}
