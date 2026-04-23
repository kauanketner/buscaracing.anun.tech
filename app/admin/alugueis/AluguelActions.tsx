'use client';

import { useState } from 'react';
import { useToast } from '@/components/Toast';

type Aluguel = {
  id: number;
  status: string;
  cliente_nome: string;
  telefone: string;
  valor_total: number;
  moto_nome: string;
  data_inicio: string;
  data_fim: string;
};

async function patch(id: number, body: Record<string, unknown>) {
  const r = await fetch(`/api/admin/alugueis/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!r.ok) {
    const d = await r.json().catch(() => ({}));
    throw new Error(d.error || 'fail');
  }
}

const btnStyle = {
  padding: '4px 10px',
  fontFamily: "'Barlow Condensed', sans-serif",
  fontWeight: 700 as const,
  fontSize: '0.72rem',
  letterSpacing: '0.08em',
  textTransform: 'uppercase' as const,
  border: 'none',
  cursor: 'pointer',
};

export default function AluguelActions({ aluguel, onChanged }: { aluguel: Aluguel; onChanged: () => void }) {
  const { showToast } = useToast();
  const [modal, setModal] = useState<'recusar' | 'devolver' | 'cancelar' | null>(null);
  const [motivo, setMotivo] = useState('');
  const [dano, setDano] = useState('');
  const [saving, setSaving] = useState(false);

  const run = async (fn: () => Promise<void>, okMsg: string) => {
    setSaving(true);
    try {
      await fn();
      showToast(okMsg, 'success');
      setModal(null);
      setMotivo('');
      setDano('');
      onChanged();
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Erro', 'error');
    } finally {
      setSaving(false);
    }
  };

  const whatsapp = `https://wa.me/${aluguel.telefone.replace(/\D/g, '')}?text=${encodeURIComponent(
    `Olá, ${aluguel.cliente_nome}! Sobre sua reserva de aluguel da ${aluguel.moto_nome}`,
  )}`;

  return (
    <>
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
        <a href={whatsapp} target="_blank" rel="noopener noreferrer"
          style={{ ...btnStyle, background: '#25d366', color: '#fff', textDecoration: 'none', display: 'inline-block' }}>
          WhatsApp
        </a>
        {aluguel.status === 'pendente' && (
          <>
            <button style={{ ...btnStyle, background: '#27367D', color: '#fff' }}
              onClick={() => run(() => patch(aluguel.id, { status: 'aprovada' }), 'Reserva aprovada!')}>
              Aprovar
            </button>
            <button style={{ ...btnStyle, background: 'transparent', color: '#dc3545', border: '1px solid #f0b4b9' }}
              onClick={() => setModal('recusar')}>
              Recusar
            </button>
          </>
        )}
        {aluguel.status === 'aprovada' && (
          <>
            <button style={{ ...btnStyle, background: '#27367D', color: '#fff' }}
              onClick={() => run(() => patch(aluguel.id, { status: 'ativa' }), 'Retirada registrada!')}>
              Marcar retirada
            </button>
            <button style={{ ...btnStyle, background: 'transparent', color: '#dc3545', border: '1px solid #f0b4b9' }}
              onClick={() => setModal('cancelar')}>
              Cancelar
            </button>
          </>
        )}
        {aluguel.status === 'ativa' && (
          <button style={{ ...btnStyle, background: '#27367D', color: '#fff' }}
            onClick={() => setModal('devolver')}>
            Marcar devolução
          </button>
        )}
        <a href={`/api/contratos/aluguel/${aluguel.id}`} target="_blank" rel="noopener noreferrer"
          style={{ ...btnStyle, background: 'transparent', color: '#27367D', border: '1px solid #e4e4e0',
                   textDecoration: 'none', display: 'inline-block' }}>
          PDF
        </a>
      </div>

      {modal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 500, padding: '1rem',
        }} onClick={(e) => { if (e.target === e.currentTarget) setModal(null); }}>
          <div style={{ background: '#fff', padding: '1.5rem', maxWidth: 420, width: '100%' }}>
            <h3 style={{ margin: '0 0 1rem', fontFamily: "'Bebas Neue', sans-serif", color: '#27367D', fontSize: '1.4rem' }}>
              {modal === 'recusar' && 'Recusar reserva'}
              {modal === 'cancelar' && 'Cancelar reserva'}
              {modal === 'devolver' && 'Registrar devolução'}
            </h3>
            {modal === 'devolver' ? (
              <>
                <p style={{ fontSize: '0.88rem', color: '#555', marginBottom: 12 }}>
                  Se houve dano à moto, informe o valor do ressarcimento (será somado no financeiro):
                </p>
                <input type="number" step="0.01" min="0"
                  placeholder="0,00 (sem dano, deixe vazio)" value={dano} onChange={(e) => setDano(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #e4e4e0', fontSize: '0.92rem', marginBottom: 12 }} />
              </>
            ) : (
              <>
                <p style={{ fontSize: '0.88rem', color: '#555', marginBottom: 12 }}>Motivo (opcional):</p>
                <textarea value={motivo} onChange={(e) => setMotivo(e.target.value)} rows={3}
                  style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #e4e4e0', fontSize: '0.92rem', marginBottom: 12, resize: 'vertical' }} />
              </>
            )}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button style={{ ...btnStyle, background: 'transparent', color: '#555', border: '1px solid #e4e4e0', padding: '8px 14px' }}
                onClick={() => setModal(null)} disabled={saving}>
                Voltar
              </button>
              <button
                style={{ ...btnStyle, background: modal === 'devolver' ? '#27367D' : '#dc3545', color: '#fff', padding: '8px 14px' }}
                disabled={saving}
                onClick={() => {
                  if (modal === 'recusar')
                    run(() => patch(aluguel.id, { status: 'recusada', motivo_recusa: motivo }), 'Reserva recusada');
                  else if (modal === 'cancelar')
                    run(() => patch(aluguel.id, { status: 'cancelada', motivo_recusa: motivo }), 'Reserva cancelada');
                  else if (modal === 'devolver')
                    run(() => patch(aluguel.id, { status: 'finalizada', valor_dano: Number(dano) || 0 }), 'Devolução registrada');
                }}
              >
                {saving ? 'Salvando...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
