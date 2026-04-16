'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useToast } from '@/components/Toast';

type Ordem = {
  id: number;
  servico_descricao: string;
  status: string;
  data_entrada: string | null;
  data_conclusao: string | null;
  valor_final: number | null;
};

type CompraData = {
  id: number;
  comprador_nome: string;
  comprador_tel: string;
  valor_venda: number;
  valor_sinal: number;
  forma_pagamento: string;
  data_venda: string;
  observacoes: string;
  moto_nome: string | null;
  moto_marca: string | null;
  moto_modelo: string | null;
  ano: number | null;
  moto_imagem: string | null;
  moto_placa: string | null;
  moto_estado: string | null;
  ordens: Ordem[];
};

const FORMA_LABELS: Record<string, string> = {
  pix: 'PIX', dinheiro: 'Dinheiro', financiamento: 'Financiamento',
  cartao: 'Cartão', misto: 'Misto',
};

const STATUS_LABELS: Record<string, string> = {
  aberta: 'Aberta', diagnostico: 'Diagnóstico', em_servico: 'Em serviço',
  aguardando_peca: 'Aguardando peça', finalizada: 'Finalizada', cancelada: 'Cancelada',
};

function fmtDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso + 'T00:00:00').toLocaleDateString('pt-BR');
}

export default function CompraPage() {
  const params = useParams();
  const token = params?.token as string;
  const { showToast } = useToast();

  const [data, setData] = useState<CompraData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAgendar, setShowAgendar] = useState(false);
  const [descricao, setDescricao] = useState('');
  const [agendando, setAgendando] = useState(false);

  const load = async () => {
    try {
      const r = await fetch(`/api/vendas/public/${token}`);
      if (!r.ok) { setError(r.status === 404 ? 'Compra não encontrada.' : 'Erro ao carregar.'); return; }
      setData(await r.json());
    } catch {
      setError('Falha de conexão.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (token) load(); }, [token]);

  const agendar = async (e: React.FormEvent) => {
    e.preventDefault();
    setAgendando(true);
    try {
      const r = await fetch(`/api/vendas/public/${token}/agendar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ descricao: descricao.trim() || 'Revisão agendada pelo comprador' }),
      });
      if (!r.ok) throw new Error('fail');
      showToast('Revisão agendada! A loja entrará em contato.', 'success');
      setShowAgendar(false);
      setDescricao('');
      await load();
    } catch {
      showToast('Erro ao agendar', 'error');
    } finally {
      setAgendando(false);
    }
  };

  if (loading) return <div style={{ padding: '3rem 1.5rem', textAlign: 'center', color: '#777' }}>Carregando...</div>;
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

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: '1rem' }}>
      {/* Header */}
      <div style={{ textAlign: 'center', padding: '1.5rem 0 1rem' }}>
        <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.6rem', color: '#27367D', margin: 0 }}>
          BUSCA<span style={{ color: '#DC2627' }}> RACING</span>
        </h1>
        <p style={{ fontSize: '0.82rem', color: '#777', margin: '4px 0 0' }}>Portal do Comprador</p>
      </div>

      {/* Greeting */}
      <div style={{ background: '#27367D', color: '#fff', padding: '1rem 1.25rem', marginBottom: '1rem' }}>
        <p style={{ margin: 0, fontSize: '0.92rem' }}>
          Olá, <strong>{data.comprador_nome}</strong>
        </p>
        <p style={{ margin: '4px 0 0', fontSize: '0.78rem', opacity: 0.85 }}>
          Obrigado por comprar com a Busca Racing!
        </p>
      </div>

      {/* Moto card */}
      <div style={{ background: '#fff', border: '1px solid #e4e4e0', marginBottom: '1rem' }}>
        {data.moto_imagem && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={data.moto_imagem} alt={data.moto_nome || ''} style={{ width: '100%', height: 200, objectFit: 'cover' }} />
        )}
        <div style={{ padding: '1rem 1.25rem' }}>
          <h2 style={{ margin: '0 0 4px', fontSize: '1.1rem' }}>{data.moto_nome || 'Moto'}</h2>
          <p style={{ color: '#777', fontSize: '0.85rem', margin: 0 }}>
            {data.moto_marca} {data.moto_modelo ? `· ${data.moto_modelo}` : ''} {data.ano ? `· ${data.ano}` : ''}
          </p>
          {data.moto_placa && (
            <p style={{ color: '#555', fontSize: '0.85rem', margin: '4px 0 0', fontFamily: "'Courier New', monospace" }}>
              {data.moto_placa.toUpperCase()}
            </p>
          )}
        </div>
      </div>

      {/* Purchase details */}
      <div style={{ background: '#fff', border: '1px solid #e4e4e0', padding: '1rem 1.25rem', marginBottom: '1rem' }}>
        <div style={{ fontSize: '0.72rem', color: '#777', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 700, marginBottom: 10 }}>
          Dados da compra
        </div>
        <div style={{ fontSize: '0.88rem', color: '#333' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
            <span>Data</span>
            <span>{fmtDate(data.data_venda)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
            <span>Valor</span>
            <strong style={{ color: '#27367D' }}>R$ {Number(data.valor_venda).toLocaleString('pt-BR')}</strong>
          </div>
          {data.valor_sinal > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', color: '#666' }}>
              <span>Sinal pago</span>
              <span>R$ {Number(data.valor_sinal).toLocaleString('pt-BR')}</span>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
            <span>Forma de pagamento</span>
            <span>{FORMA_LABELS[data.forma_pagamento] || data.forma_pagamento || '—'}</span>
          </div>
        </div>
      </div>

      {/* Service history */}
      {data.ordens.length > 0 && (
        <div style={{ background: '#fff', border: '1px solid #e4e4e0', padding: '1rem 1.25rem', marginBottom: '1rem' }}>
          <div style={{ fontSize: '0.72rem', color: '#777', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 700, marginBottom: 10 }}>
            Histórico de serviços
          </div>
          {data.ordens.map((o) => (
            <div key={o.id} style={{ padding: '8px 0', borderBottom: '1px solid #f1f1ee' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 600, fontSize: '0.88rem' }}>OS #{o.id}</span>
                <span style={{
                  fontSize: '0.68rem', padding: '2px 6px', fontWeight: 700,
                  textTransform: 'uppercase', letterSpacing: '0.06em',
                  background: o.status === 'finalizada' ? '#d4edda' : o.status === 'cancelada' ? '#f5c6cb' : '#fff3cd',
                  color: o.status === 'finalizada' ? '#155724' : o.status === 'cancelada' ? '#721c24' : '#856404',
                }}>
                  {STATUS_LABELS[o.status] || o.status}
                </span>
              </div>
              <div style={{ fontSize: '0.82rem', color: '#555', marginTop: 2 }}>{o.servico_descricao}</div>
              <div style={{ fontSize: '0.78rem', color: '#999', marginTop: 2 }}>
                {fmtDate(o.data_entrada)} {o.data_conclusao ? `→ ${fmtDate(o.data_conclusao)}` : ''}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Agendar revisão */}
      <div style={{ background: '#fff', border: '1px solid #e4e4e0', padding: '1rem 1.25rem', marginBottom: '1rem' }}>
        {!showAgendar ? (
          <button
            type="button"
            onClick={() => setShowAgendar(true)}
            style={{
              display: 'block', width: '100%', padding: '12px', background: '#27367D',
              color: '#fff', border: 'none', fontWeight: 700, fontSize: '0.88rem',
              textTransform: 'uppercase', letterSpacing: '0.08em', cursor: 'pointer',
              fontFamily: "'Barlow Condensed', sans-serif",
            }}
          >
            Agendar revisão
          </button>
        ) : (
          <form onSubmit={agendar}>
            <div style={{ fontSize: '0.72rem', color: '#777', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 700, marginBottom: 8 }}>
              Agendar revisão
            </div>
            <textarea
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Descreva o que precisa (revisão, troca de óleo, barulho estranho...)"
              rows={3}
              style={{ width: '100%', padding: '10px', border: '1px solid #e4e4e0', fontSize: '0.88rem', marginBottom: 8, resize: 'vertical' }}
            />
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                onClick={() => setShowAgendar(false)}
                style={{ flex: 1, padding: '10px', background: '#fff', border: '1px solid #e4e4e0', cursor: 'pointer', fontSize: '0.82rem' }}
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={agendando}
                style={{
                  flex: 1, padding: '10px', background: '#27367D', color: '#fff',
                  border: 'none', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer',
                  opacity: agendando ? 0.5 : 1,
                }}
              >
                {agendando ? 'Enviando...' : 'Enviar'}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Contact */}
      <div style={{ background: '#fff', border: '1px solid #e4e4e0', padding: '1rem 1.25rem', marginBottom: '1rem' }}>
        <div style={{ fontSize: '0.72rem', color: '#777', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 700, marginBottom: 8 }}>
          Precisa de ajuda?
        </div>
        <p style={{ fontSize: '0.85rem', color: '#555', margin: 0 }}>
          Entre em contato pelo WhatsApp ou visite a loja.
        </p>
      </div>

      <p style={{ textAlign: 'center', fontSize: '0.72rem', color: '#aaa', marginTop: '2rem' }}>
        Busca Racing — Portal do Comprador
      </p>
    </div>
  );
}
