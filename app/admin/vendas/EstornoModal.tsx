'use client';

/**
 * Modal de confirmação de estorno de venda. Usado em /admin/vendas e
 * /admin/motos (na coluna Ações de motos vendidas).
 */

import { useState } from 'react';
import { useToast } from '@/components/Toast';

export type EstornoVenda = {
  id: number;
  moto_nome: string | null;
  moto_origem: string | null;
  comprador_nome: string;
  valor_venda: number;
  troca_moto_id: number | null;
};

type Props = {
  venda: EstornoVenda;
  onClose: () => void;
  onDone: () => void;
};

export default function EstornoModal({ venda, onClose, onDone }: Props) {
  const { showToast } = useToast();
  const [motivo, setMotivo] = useState('');
  const [senha, setSenha] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!senha.trim()) {
      showToast('Senha obrigatória', 'error');
      return;
    }
    setSaving(true);
    try {
      const r = await fetch(`/api/vendas/${venda.id}/estornar`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ senha, motivo: motivo.trim() }),
      });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        throw new Error(d.error || 'fail');
      }
      showToast('Venda estornada com sucesso', 'success');
      onDone();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Erro ao estornar', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 600,
        background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem',
      }}
      onClick={(e) => { if (e.target === e.currentTarget && !saving) onClose(); }}
    >
      <form
        onSubmit={submit}
        style={{
          background: '#FDFDFB', width: '100%', maxWidth: 460,
          maxHeight: '92vh', display: 'flex', flexDirection: 'column',
          boxShadow: '0 24px 60px rgba(0,0,0,0.3)',
        }}
      >
        <div style={{ padding: '1.1rem 1.5rem', borderBottom: '1px solid #e4e4e0' }}>
          <h3 style={{ margin: 0, fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.4rem', color: '#dc3545' }}>
            Estornar venda #{venda.id}
          </h3>
          <p style={{ fontSize: '0.86rem', color: '#777', margin: '6px 0 0' }}>
            <strong>{venda.moto_nome}</strong> — {venda.comprador_nome}
            <br />
            R$ {Number(venda.valor_venda).toLocaleString('pt-BR')}
            {venda.troca_moto_id ? ` · Moto de troca #${venda.troca_moto_id}` : ''}
          </p>
        </div>

        <div style={{ padding: '1.25rem 1.5rem', flex: 1, overflowY: 'auto' }}>
          <div
            style={{
              padding: '0.85rem 1rem',
              background: '#fff8ec',
              border: '1px solid #f0b429',
              fontSize: '0.84rem',
              color: '#856404',
              marginBottom: '1rem',
              lineHeight: 1.5,
            }}
          >
            <strong>O que será revertido:</strong>
            <ul style={{ margin: '6px 0 0 1rem', padding: 0 }}>
              <li>Moto volta pro estoque (estado &ldquo;Anunciada&rdquo;)</li>
              <li>Lançamento financeiro de venda + comissão removidos</li>
              {venda.moto_origem === 'consignada' && (
                <li>Consignação volta pra ativa + OS de revisão é apagada</li>
              )}
              {venda.troca_moto_id && (
                <li>Moto de troca #{venda.troca_moto_id} é apagada (se ainda intacta)</li>
              )}
              <li>Comprovantes ficam preservados (auditoria)</li>
            </ul>
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label
              style={{
                display: 'block', fontFamily: "'Barlow Condensed', sans-serif",
                fontWeight: 700, fontSize: '0.72rem', letterSpacing: '0.18em',
                textTransform: 'uppercase', color: '#777', marginBottom: 5,
              }}
            >
              Motivo do estorno
            </label>
            <textarea
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Ex: cliente desistiu, erro de digitação, falha no pagamento..."
              rows={3}
              style={{
                width: '100%', padding: '10px 12px', border: '1.5px solid #e4e4e0',
                background: '#fafaf8', fontFamily: 'inherit', fontSize: '0.92rem',
                color: '#333', outline: 'none', resize: 'vertical',
              }}
            />
          </div>

          <div>
            <label
              style={{
                display: 'block', fontFamily: "'Barlow Condensed', sans-serif",
                fontWeight: 700, fontSize: '0.72rem', letterSpacing: '0.18em',
                textTransform: 'uppercase', color: '#777', marginBottom: 5,
              }}
            >
              Senha de confirmação *
            </label>
            <input
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              autoFocus
              required
              style={{
                width: '100%', padding: '10px 12px', border: '1.5px solid #e4e4e0',
                background: '#fafaf8', fontFamily: 'inherit', fontSize: '0.92rem',
                color: '#333', outline: 'none',
              }}
            />
            <span style={{ fontSize: '0.74rem', color: '#999', marginTop: 4, display: 'block' }}>
              A mesma senha de exclusão de moto.
            </span>
          </div>
        </div>

        <div
          style={{
            padding: '1rem 1.5rem', borderTop: '1px solid #e4e4e0',
            display: 'flex', gap: 10, justifyContent: 'flex-end',
          }}
        >
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            style={{
              padding: '9px 18px', background: 'transparent',
              border: '1.5px solid #e4e4e0', color: '#777',
              fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700,
              fontSize: '0.85rem', letterSpacing: '0.08em', textTransform: 'uppercase',
              cursor: 'pointer',
            }}
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving}
            style={{
              padding: '9px 22px', background: '#dc3545', color: '#fff',
              border: 'none', fontFamily: "'Barlow Condensed', sans-serif",
              fontWeight: 700, fontSize: '0.85rem', letterSpacing: '0.08em',
              textTransform: 'uppercase', cursor: 'pointer',
              opacity: saving ? 0.6 : 1,
            }}
          >
            {saving ? 'Estornando...' : 'Confirmar estorno'}
          </button>
        </div>
      </form>
    </div>
  );
}
