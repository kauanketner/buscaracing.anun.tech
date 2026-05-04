'use client';

import { useCallback, useEffect, useState } from 'react';
import { useToast } from '@/components/Toast';
import ContratoPdfButton from '@/components/ContratoPdfButton';
import ComprovantesVendaModal from './ComprovantesVendaModal';
import styles from './page.module.css';

type Venda = {
  id: number;
  moto_id: number;
  moto_nome: string | null;
  moto_marca: string | null;
  moto_imagem: string | null;
  moto_origem: string | null;
  moto_custo: number | null;
  comprador_nome: string;
  comprador_tel: string;
  vendedor_nome: string | null;
  vendedor_tipo: string;
  valor_venda: number;
  valor_sinal: number;
  forma_pagamento: string;
  troca_moto_id: number | null;
  troca_valor: number | null;
  comissao_valor: number;
  observacoes: string;
  data_venda: string;
  token: string;
  comprovantes_count: number;
  status: string; // 'concluida' | 'estornada'
  estornada_em: string | null;
  estornada_motivo: string;
};

const FORMA_LABELS: Record<string, string> = {
  pix: 'PIX',
  dinheiro: 'Dinheiro',
  financiamento: 'Financiamento',
  cartao: 'Cartão',
  misto: 'Misto',
};

export default function VendasPage() {
  const { showToast } = useToast();
  const [vendas, setVendas] = useState<Venda[]>([]);
  const [loading, setLoading] = useState(true);
  const [compModal, setCompModal] = useState<Venda | null>(null);
  const [estornoModal, setEstornoModal] = useState<Venda | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await fetch('/api/vendas');
      if (!r.ok) throw new Error('fail');
      const d = await r.json();
      setVendas(Array.isArray(d) ? d : []);
    } catch {
      showToast('Erro ao carregar vendas', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => { load(); }, [load]);

  // Cards só consideram vendas concluídas (estornadas não contam pra faturamento)
  const vendasAtivas = vendas.filter((v) => v.status !== 'estornada');
  const totalVendas = vendasAtivas.reduce((s, v) => s + v.valor_venda, 0);
  const totalComissoes = vendasAtivas.reduce((s, v) => s + v.comissao_valor, 0);
  const totalEstornadas = vendas.length - vendasAtivas.length;

  return (
    <div className={styles.wrap}>
      {/* Summary cards */}
      <div className={styles.cards}>
        <div className={styles.card}>
          <div className={styles.cardLabel}>Vendas concluídas</div>
          <div className={styles.cardValue}>{vendasAtivas.length}</div>
        </div>
        <div className={styles.card}>
          <div className={styles.cardLabel}>Faturamento</div>
          <div className={styles.cardValue}>R$ {totalVendas.toLocaleString('pt-BR')}</div>
        </div>
        <div className={styles.card}>
          <div className={styles.cardLabel}>Comissões</div>
          <div className={styles.cardValue}>R$ {totalComissoes.toLocaleString('pt-BR')}</div>
        </div>
        {totalEstornadas > 0 && (
          <div className={styles.card}>
            <div className={styles.cardLabel}>Estornadas</div>
            <div className={styles.cardValue} style={{ color: '#777' }}>{totalEstornadas}</div>
          </div>
        )}
      </div>

      {/* Table */}
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>#</th>
              <th>Status</th>
              <th>Moto</th>
              <th>Comprador</th>
              <th>Vendedor</th>
              <th>Valor</th>
              <th>Forma</th>
              <th>Data</th>
              <th>Link</th>
              <th>Comprovantes</th>
              <th>Contratos</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {vendas.map((v) => {
              const estornada = v.status === 'estornada';
              return (
              <tr key={v.id} style={estornada ? { opacity: 0.55 } : undefined}>
                <td className={styles.tdId}>{v.id}</td>
                <td>
                  {estornada ? (
                    <span
                      className={styles.badge}
                      style={{ background: '#fcdcdc', color: '#721c24' }}
                      title={v.estornada_motivo || ''}
                    >
                      Estornada
                    </span>
                  ) : (
                    <span
                      className={styles.badge}
                      style={{ background: '#d4edda', color: '#155724' }}
                    >
                      Concluída
                    </span>
                  )}
                </td>
                <td>
                  <div className={styles.tdName} style={estornada ? { textDecoration: 'line-through' } : undefined}>
                    {v.moto_nome || '—'}
                  </div>
                  <div className={styles.tdSub}>{v.moto_marca || ''}</div>
                </td>
                <td>
                  <div className={styles.tdName}>{v.comprador_nome}</div>
                  {v.comprador_tel && <div className={styles.tdSub}>{v.comprador_tel}</div>}
                </td>
                <td>
                  {v.vendedor_nome ? (
                    <>
                      <div className={styles.tdName}>{v.vendedor_nome}</div>
                      <div className={styles.tdSub}>{v.vendedor_tipo}</div>
                    </>
                  ) : (
                    <span className={styles.tdSub}>—</span>
                  )}
                </td>
                <td className={styles.tdPreco}>
                  R$ {Number(v.valor_venda).toLocaleString('pt-BR')}
                  {v.troca_valor ? (
                    <div className={styles.tdSub} style={{ color: '#856404' }}>
                      Troca: R$ {Number(v.troca_valor).toLocaleString('pt-BR')}
                    </div>
                  ) : null}
                </td>
                <td>
                  <span className={styles.badge}>
                    {FORMA_LABELS[v.forma_pagamento] || v.forma_pagamento || '—'}
                  </span>
                </td>
                <td className={styles.tdSub}>
                  {v.data_venda
                    ? new Date(v.data_venda + 'T00:00:00').toLocaleDateString('pt-BR')
                    : '—'}
                </td>
                <td>
                  {v.token ? (
                    <button
                      type="button"
                      onClick={() => {
                        const link = `${window.location.origin}/compra/${v.token}`;
                        navigator.clipboard.writeText(link);
                        showToast('Link copiado!', 'success');
                      }}
                      style={{
                        background: 'none', border: '1px solid #e4e4e0', padding: '4px 10px',
                        fontSize: '0.72rem', cursor: 'pointer', fontFamily: "'Barlow Condensed', sans-serif",
                        fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
                        color: '#27367D',
                      }}
                    >
                      Copiar link
                    </button>
                  ) : '—'}
                </td>
                <td>
                  <button
                    type="button"
                    onClick={() => setCompModal(v)}
                    className={`${styles.compBtn} ${v.comprovantes_count > 0 ? styles.compBtnHas : ''}`}
                    title="Gerenciar comprovantes desta venda"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    {v.comprovantes_count > 0 ? `${v.comprovantes_count} anexo${v.comprovantes_count > 1 ? 's' : ''}` : 'Anexar'}
                  </button>
                </td>
                <td>
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    <ContratoPdfButton tipo="venda" id={v.id} label="Venda"
                      style={{ background: 'none', border: '1px solid #e4e4e0', padding: '4px 8px', fontSize: '0.68rem', fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#27367D' }} />
                    <ContratoPdfButton tipo="entrega" id={v.id} label="Entrega"
                      style={{ background: 'none', border: '1px solid #e4e4e0', padding: '4px 8px', fontSize: '0.68rem', fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#555' }} />
                  </div>
                </td>
                <td>
                  {!estornada ? (
                    <button
                      type="button"
                      onClick={() => setEstornoModal(v)}
                      title="Estornar venda — devolve a moto pro estoque"
                      style={{
                        background: 'none',
                        border: '1px solid #e4e4e0',
                        padding: '4px 10px',
                        fontFamily: "'Barlow Condensed', sans-serif",
                        fontWeight: 700,
                        fontSize: '0.7rem',
                        letterSpacing: '0.06em',
                        textTransform: 'uppercase',
                        color: '#dc3545',
                        cursor: 'pointer',
                      }}
                    >
                      Estornar
                    </button>
                  ) : (
                    <span className={styles.tdSub} title={v.estornada_motivo || ''}>
                      {v.estornada_em
                        ? `em ${new Date(v.estornada_em).toLocaleDateString('pt-BR')}`
                        : '—'}
                    </span>
                  )}
                </td>
              </tr>
              );
            })}
          </tbody>
        </table>
        {!loading && vendas.length === 0 && (
          <div className={styles.empty}>
            Nenhuma venda registrada ainda. Feche vendas pelo Estoque.
          </div>
        )}
        {loading && <div className={styles.empty}>Carregando...</div>}
      </div>

      {compModal && (
        <ComprovantesVendaModal
          vendaId={compModal.id}
          vendaLabel={`${compModal.moto_nome || 'Moto'} — ${compModal.comprador_nome}`}
          onClose={() => setCompModal(null)}
          onChanged={load}
        />
      )}

      {estornoModal && (
        <EstornoModal
          venda={estornoModal}
          onClose={() => setEstornoModal(null)}
          onDone={() => {
            setEstornoModal(null);
            load();
          }}
        />
      )}
    </div>
  );
}

// ─── Modal de estorno ────────────────────────────────────────────────────

function EstornoModal({
  venda, onClose, onDone,
}: {
  venda: Venda;
  onClose: () => void;
  onDone: () => void;
}) {
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
