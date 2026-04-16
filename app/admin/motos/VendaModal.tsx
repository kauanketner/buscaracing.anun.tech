'use client';

import { useState, useEffect, type FormEvent } from 'react';
import { useToast } from '@/components/Toast';
import styles from './page.module.css';

type Vendedor = { id: number; nome: string; tipo: string; ativo: number };

type Props = {
  motoId: number;
  motoLabel: string;
  motoPreco: number | null;
  onClose: () => void;
  onSaved: () => void;
};

export default function VendaModal({ motoId, motoLabel, motoPreco, onClose, onSaved }: Props) {
  const { showToast } = useToast();

  const [compradorNome, setCompradorNome] = useState('');
  const [compradorTel, setCompradorTel] = useState('');
  const [valorVenda, setValorVenda] = useState(motoPreco ? String(motoPreco) : '');
  const [formaPagamento, setFormaPagamento] = useState('pix');
  const [vendedorId, setVendedorId] = useState('');
  const [observacoes, setObservacoes] = useState('');

  // Troca
  const [temTroca, setTemTroca] = useState(false);
  const [trocaMarca, setTrocaMarca] = useState('');
  const [trocaModelo, setTrocaModelo] = useState('');
  const [trocaAno, setTrocaAno] = useState('');
  const [trocaPlaca, setTrocaPlaca] = useState('');
  const [trocaKm, setTrocaKm] = useState('');
  const [trocaValor, setTrocaValor] = useState('');

  const [vendedores, setVendedores] = useState<Vendedor[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('/api/config/vendedores')
      .then((r) => r.json())
      .then((d) => setVendedores(Array.isArray(d) ? d.filter((v: Vendedor) => v.ativo) : []))
      .catch(() => {});
  }, []);

  const vendaSelecionado = vendedores.find((v) => String(v.id) === vendedorId);
  const comissao = vendaSelecionado
    ? vendaSelecionado.tipo === 'externo' ? 400 : 200
    : 0;
  const sinalAbate = 0; // will be auto-detected by API from active reservation
  const valorTroca = Number(trocaValor) || 0;
  const valorFinal = (Number(valorVenda) || 0);
  const aReceber = valorFinal - sinalAbate - valorTroca;

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!compradorNome.trim()) {
      showToast('Nome do comprador obrigatório', 'error');
      return;
    }
    if (!valorVenda || Number(valorVenda) <= 0) {
      showToast('Valor de venda obrigatório', 'error');
      return;
    }
    setSaving(true);
    try {
      const r = await fetch('/api/vendas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          moto_id: motoId,
          comprador_nome: compradorNome.trim(),
          comprador_tel: compradorTel.trim(),
          valor_venda: Number(valorVenda),
          forma_pagamento: formaPagamento,
          vendedor_id: vendedorId ? Number(vendedorId) : null,
          observacoes: observacoes.trim(),
          tem_troca: temTroca,
          troca_marca: trocaMarca.trim(),
          troca_modelo: trocaModelo.trim(),
          troca_ano: trocaAno,
          troca_placa: trocaPlaca.trim(),
          troca_km: trocaKm,
          troca_valor: valorTroca,
          troca_nome_cliente: compradorNome.trim(),
        }),
      });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        throw new Error(d.error || 'fail');
      }
      const d = await r.json();
      let msg = 'Venda registrada!';
      if (d.troca_moto_id) msg += ` Moto de troca #${d.troca_moto_id} entrou no estoque.`;
      showToast(msg, 'success');
      onSaved();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Erro ao registrar venda', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={(e) => { if (e.target === e.currentTarget && !saving) onClose(); }}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <h3>Fechar venda</h3>
          <button type="button" className={styles.modalClose} onClick={onClose} disabled={saving}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
          <div className={styles.modalBody}>
            <p style={{ fontSize: '0.85rem', color: '#27367D', fontWeight: 600, marginBottom: '1rem' }}>
              {motoLabel}{motoPreco ? ` — R$ ${Number(motoPreco).toLocaleString('pt-BR')}` : ''}
            </p>

            {/* Comprador */}
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label>Comprador *</label>
                <input type="text" value={compradorNome} onChange={(e) => setCompradorNome(e.target.value)} placeholder="Maria Santos" required autoFocus />
              </div>
              <div className={styles.formGroup}>
                <label>Telefone</label>
                <input type="text" value={compradorTel} onChange={(e) => setCompradorTel(e.target.value)} placeholder="(11) 99999-9999" />
              </div>
            </div>

            {/* Valores */}
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label>Valor de venda (R$) *</label>
                <input type="number" step="0.01" value={valorVenda} onChange={(e) => setValorVenda(e.target.value)} required />
              </div>
              <div className={styles.formGroup}>
                <label>Forma de pagamento</label>
                <select value={formaPagamento} onChange={(e) => setFormaPagamento(e.target.value)}>
                  <option value="pix">PIX</option>
                  <option value="dinheiro">Dinheiro</option>
                  <option value="financiamento">Financiamento</option>
                  <option value="cartao">Cartão</option>
                  <option value="misto">Misto</option>
                </select>
              </div>
            </div>

            {/* Vendedor */}
            <div className={styles.formGroup}>
              <label>Vendedor</label>
              <select value={vendedorId} onChange={(e) => setVendedorId(e.target.value)}>
                <option value="">Sem vendedor</option>
                {vendedores.map((v) => (
                  <option key={v.id} value={String(v.id)}>
                    {v.nome} ({v.tipo || 'interno'})
                  </option>
                ))}
              </select>
              {comissao > 0 && (
                <span style={{ fontSize: '0.75rem', color: '#777', marginTop: 4, display: 'block' }}>
                  Comissão: R$ {comissao} ({vendaSelecionado?.tipo || 'interno'})
                </span>
              )}
            </div>

            {/* Troca */}
            <div className={styles.formGroup}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={temTroca}
                  onChange={(e) => setTemTroca(e.target.checked)}
                  style={{ width: 'auto' }}
                />
                Tem moto de troca
              </label>
            </div>
            {temTroca && (
              <div style={{ background: '#f8f8f5', padding: '1rem', border: '1px solid #e4e4e0', marginBottom: '1rem' }}>
                <p style={{ fontSize: '0.78rem', color: '#777', marginBottom: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                  Moto de troca (entra no estoque)
                </p>
                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label>Marca</label>
                    <input type="text" value={trocaMarca} onChange={(e) => setTrocaMarca(e.target.value)} placeholder="Honda" />
                  </div>
                  <div className={styles.formGroup}>
                    <label>Modelo</label>
                    <input type="text" value={trocaModelo} onChange={(e) => setTrocaModelo(e.target.value)} placeholder="CG 150" />
                  </div>
                </div>
                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label>Ano</label>
                    <input type="text" value={trocaAno} onChange={(e) => setTrocaAno(e.target.value)} placeholder="2018" />
                  </div>
                  <div className={styles.formGroup}>
                    <label>Placa</label>
                    <input type="text" value={trocaPlaca} onChange={(e) => setTrocaPlaca(e.target.value)} placeholder="ABC1D23" style={{ textTransform: 'uppercase' }} />
                  </div>
                </div>
                <div className={styles.formGroup}>
                  <label>Valor de avaliação (R$) *</label>
                  <input type="number" step="0.01" value={trocaValor} onChange={(e) => setTrocaValor(e.target.value)} placeholder="4000" />
                </div>
              </div>
            )}

            <div className={styles.formGroup}>
              <label>Observações</label>
              <textarea value={observacoes} onChange={(e) => setObservacoes(e.target.value)} placeholder="Notas sobre a venda..." rows={2} />
            </div>

            {/* Resumo */}
            <div style={{ background: '#f0f7f0', padding: '1rem', border: '1px solid #d4edda', fontSize: '0.88rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span>Valor da venda</span>
                <strong>R$ {valorFinal.toLocaleString('pt-BR')}</strong>
              </div>
              {valorTroca > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, color: '#666' }}>
                  <span>Troca (abate)</span>
                  <span>- R$ {valorTroca.toLocaleString('pt-BR')}</span>
                </div>
              )}
              {comissao > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, color: '#666' }}>
                  <span>Comissão vendedor</span>
                  <span>- R$ {comissao}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #b8dabb', paddingTop: 6, marginTop: 6 }}>
                <strong>A receber do cliente</strong>
                <strong style={{ color: '#155724' }}>R$ {aReceber.toLocaleString('pt-BR')}</strong>
              </div>
            </div>
          </div>

          <div className={styles.modalFooter}>
            <button type="button" className={`${styles.btn} ${styles.btnGhost}`} onClick={onClose} disabled={saving}>
              Cancelar
            </button>
            <button type="submit" className={`${styles.btn} ${styles.btnPrimary}`} disabled={saving}>
              {saving ? 'Registrando...' : 'Finalizar venda'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
