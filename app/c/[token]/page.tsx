'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

type ConsigData = {
  id: number;
  dono_nome: string;
  margem_pct: number;
  custo_revisao: number;
  valor_repasse: number | null;
  repasse_pago: number;
  status: string;
  data_entrada: string;
  moto_nome: string | null;
  moto_marca: string | null;
  moto_imagem: string | null;
  moto_estado: string | null;
  moto_preco: number | null;
  total_leads: number;
};

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  ativa: { label: 'Anunciada', color: '#155724', bg: '#d4edda' },
  vendida: { label: 'Vendida — em revisão', color: '#856404', bg: '#fff3cd' },
  entregue: { label: 'Entregue ao comprador', color: '#155724', bg: '#d4edda' },
  retirada: { label: 'Retirada pelo dono', color: '#721c24', bg: '#f5c6cb' },
};

export default function ConsignantePage() {
  const params = useParams();
  const token = params?.token as string;
  const [data, setData] = useState<ConsigData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const r = await fetch(`/api/consignacoes/public/${token}`);
        if (!r.ok) {
          setError(r.status === 404 ? 'Consignação não encontrada.' : 'Erro ao carregar.');
          return;
        }
        setData(await r.json());
      } catch {
        setError('Falha de conexão.');
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  if (loading) {
    return (
      <div style={{ padding: '3rem 1.5rem', textAlign: 'center', color: '#777' }}>
        Carregando...
      </div>
    );
  }
  if (error || !data) {
    return (
      <div style={{ padding: '3rem 1.5rem', textAlign: 'center' }}>
        <h2 style={{ color: '#27367D', fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.8rem', marginBottom: 8 }}>
          BUSCA<span style={{ color: '#DC2627' }}> RACING</span>
        </h2>
        <p style={{ color: '#777' }}>{error || 'Página não encontrada.'}</p>
      </div>
    );
  }

  const st = STATUS_LABELS[data.status] || STATUS_LABELS.ativa;

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: '1rem' }}>
      {/* Header */}
      <div style={{ textAlign: 'center', padding: '1.5rem 0 1rem' }}>
        <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.6rem', color: '#27367D', margin: 0 }}>
          BUSCA<span style={{ color: '#DC2627' }}> RACING</span>
        </h1>
        <p style={{ fontSize: '0.82rem', color: '#777', margin: '4px 0 0' }}>Acompanhe sua consignação</p>
      </div>

      {/* Moto card */}
      <div style={{ background: '#fff', border: '1px solid #e4e4e0', marginBottom: '1rem' }}>
        {data.moto_imagem && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={data.moto_imagem}
            alt={data.moto_nome || ''}
            style={{ width: '100%', height: 200, objectFit: 'cover' }}
          />
        )}
        <div style={{ padding: '1rem 1.25rem' }}>
          <h2 style={{ margin: '0 0 4px', fontSize: '1.1rem', color: '#222' }}>
            {data.moto_nome || 'Moto'}
          </h2>
          <p style={{ color: '#777', fontSize: '0.85rem', margin: 0 }}>
            {data.moto_marca}
          </p>
          {data.moto_preco != null && data.status === 'ativa' && (
            <p style={{ fontSize: '1.1rem', fontWeight: 700, color: '#27367D', margin: '8px 0 0' }}>
              Anunciada por R$ {Number(data.moto_preco).toLocaleString('pt-BR')}
            </p>
          )}
        </div>
      </div>

      {/* Status */}
      <div style={{ background: '#fff', border: '1px solid #e4e4e0', padding: '1rem 1.25rem', marginBottom: '1rem' }}>
        <div style={{ fontSize: '0.72rem', color: '#777', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 700, marginBottom: 8 }}>
          Status
        </div>
        <span style={{
          display: 'inline-block',
          padding: '4px 12px',
          background: st.bg,
          color: st.color,
          fontWeight: 700,
          fontSize: '0.85rem',
        }}>
          {st.label}
        </span>
        <div style={{ marginTop: 12, fontSize: '0.85rem', color: '#555' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
            <span>Entrada</span>
            <span>{data.data_entrada ? new Date(data.data_entrada + 'T00:00:00').toLocaleDateString('pt-BR') : '—'}</span>
          </div>
          {data.status === 'ativa' && (
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
              <span>Interessados</span>
              <strong>{data.total_leads}</strong>
            </div>
          )}
        </div>
      </div>

      {/* Financial — only show after sale */}
      {(data.status === 'vendida' || data.status === 'entregue') && (
        <div style={{ background: '#fff', border: '1px solid #e4e4e0', padding: '1rem 1.25rem', marginBottom: '1rem' }}>
          <div style={{ fontSize: '0.72rem', color: '#777', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 700, marginBottom: 8 }}>
            Detalhes financeiros
          </div>
          <div style={{ fontSize: '0.88rem', color: '#333' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
              <span>Margem da loja</span>
              <span>{data.margem_pct}%</span>
            </div>
            {data.custo_revisao > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                <span>Custo da revisão</span>
                <span>- R$ {Number(data.custo_revisao).toLocaleString('pt-BR')}</span>
              </div>
            )}
            {data.valor_repasse != null && (
              <div style={{
                display: 'flex', justifyContent: 'space-between', padding: '8px 0',
                borderTop: '1px solid #e4e4e0', marginTop: 4,
                fontWeight: 700, fontSize: '1rem',
                color: '#155724',
              }}>
                <span>Você recebe</span>
                <span>R$ {Number(data.valor_repasse).toLocaleString('pt-BR')}</span>
              </div>
            )}
            {data.repasse_pago ? (
              <span style={{ fontSize: '0.78rem', color: '#155724', fontWeight: 600 }}>Repasse efetuado</span>
            ) : (
              <span style={{ fontSize: '0.78rem', color: '#856404' }}>Repasse pendente</span>
            )}
          </div>
        </div>
      )}

      {/* Footer */}
      <p style={{ textAlign: 'center', fontSize: '0.72rem', color: '#aaa', marginTop: '2rem' }}>
        Busca Racing — Acompanhamento de consignação
      </p>
    </div>
  );
}
