'use client';

import { useState, useEffect, useRef, type FormEvent } from 'react';
import { useToast } from '@/components/Toast';
import ClientePicker, { type Cliente } from '@/components/ClientePicker';
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

  // Cliente — via ClientePicker centralizado
  const [clienteId, setClienteId] = useState<number | null>(null);
  const [cliente, setCliente] = useState<Cliente | null>(null);
  // Endereço de entrega — por venda (não fica fixo no cadastro do cliente)
  const [compradorCep, setCompradorCep] = useState('');
  const [compradorEndereco, setCompradorEndereco] = useState('');
  const [compradorNumero, setCompradorNumero] = useState('');
  const [compradorComplemento, setCompradorComplemento] = useState('');
  const [cepLoading, setCepLoading] = useState(false);
  const [cepErr, setCepErr] = useState<string | null>(null);
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

  // Comprovantes (pré-upload local antes da venda existir no DB)
  const [comprovantes, setComprovantes] = useState<File[]>([]);
  const comprovanteInputRef = useRef<HTMLInputElement>(null);

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

  // Monta string completa de endereço a partir dos campos separados
  const montarEndereco = (rua: string, numero: string, complemento: string): string => {
    const partes = [rua, numero && `nº ${numero}`, complemento].filter(Boolean).map((s) => String(s).trim()).filter(Boolean);
    return partes.join(', ');
  };

  // CEP lookup via ViaCEP
  const buscarCep = async (cepRaw: string) => {
    const cep = cepRaw.replace(/\D/g, '');
    if (cep.length !== 8) {
      setCepErr(cep.length > 0 ? 'CEP precisa ter 8 dígitos' : null);
      return;
    }
    setCepErr(null);
    setCepLoading(true);
    try {
      const r = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      if (!r.ok) throw new Error('fail');
      const d = await r.json();
      if (d.erro) {
        setCepErr('CEP não encontrado');
        return;
      }
      // Monta o endereço: "Rua X, Bairro, Cidade - UF, CEP"
      const rua = String(d.logradouro || '');
      const bairro = String(d.bairro || '');
      const cidade = String(d.localidade || '');
      const uf = String(d.uf || '');
      const cepFmt = String(d.cep || cepRaw);
      const partes: string[] = [];
      if (rua) partes.push(rua);
      if (bairro) partes.push(bairro);
      if (cidade || uf) partes.push(`${cidade}${uf ? ` - ${uf}` : ''}`);
      if (cepFmt) partes.push(`CEP ${cepFmt}`);
      setCompradorEndereco(partes.join(', '));
    } catch {
      setCepErr('Falha ao consultar CEP');
    } finally {
      setCepLoading(false);
    }
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!cliente || clienteId == null) {
      showToast('Selecione ou cadastre o comprador', 'error');
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
          cliente_id: clienteId,
          comprador_nome: cliente.nome,
          comprador_tel: cliente.telefone || '',
          comprador_cpf: cliente.cpf_cnpj || '',
          comprador_email: cliente.email || '',
          comprador_endereco: montarEndereco(compradorEndereco, compradorNumero, compradorComplemento),
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
          troca_nome_cliente: cliente.nome,
        }),
      });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        throw new Error(d.error || 'fail');
      }
      const d = await r.json();

      // Upload dos comprovantes anexados (se houver) — não bloqueia msg de sucesso
      if (comprovantes.length > 0 && d.venda_id) {
        let fail = 0;
        for (const file of comprovantes) {
          const fd = new FormData();
          fd.append('file', file);
          try {
            const up = await fetch(`/api/vendas/${d.venda_id}/comprovantes`, {
              method: 'POST',
              body: fd,
            });
            if (!up.ok) fail++;
          } catch { fail++; }
        }
        if (fail > 0) {
          showToast(`Venda registrada, mas ${fail} comprovante(s) falharam.`, 'error');
        }
      }

      // Dispara notificação WhatsApp DEPOIS dos uploads (pra {{10}} ter o count real)
      if (d.venda_id) {
        fetch(`/api/vendas/${d.venda_id}/notify`, { method: 'POST' }).catch(() => {});
      }

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

  const MAX_COMPROVANTES = 10;
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
            {/* Cabeçalho da moto */}
            <div
              style={{
                background: '#f8f8f5',
                border: '1px solid #e4e4e0',
                padding: '0.85rem 1rem',
                marginBottom: '1.25rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 12,
                flexWrap: 'wrap',
              }}
            >
              <div style={{ fontWeight: 600, color: '#222', fontSize: '0.95rem' }}>{motoLabel}</div>
              {motoPreco ? (
                <div style={{ color: '#27367D', fontWeight: 700, fontSize: '1rem' }}>
                  R$ {Number(motoPreco).toLocaleString('pt-BR')}
                </div>
              ) : null}
            </div>

            {/* ───── COMPRADOR ───── */}
            <p className={styles.formSectionTitle} style={{ marginBottom: '0.75rem' }}>
              Comprador
            </p>
            <div className={styles.formGroup}>
              <label>Cliente *</label>
              <ClientePicker
                value={clienteId}
                cliente={cliente}
                onChange={(id, c) => {
                  setClienteId(id);
                  setCliente(c);
                  // Pré-preenche endereço se cliente tiver
                  if (c && c.endereco && !compradorEndereco.trim()) {
                    setCompradorEndereco(c.endereco);
                  }
                }}
                required
              />
              {cliente && (
                <div style={{ fontSize: '0.78rem', color: '#777', marginTop: 6 }}>
                  {[cliente.telefone, cliente.cpf_cnpj, cliente.email].filter(Boolean).join(' · ') || 'Sem dados de contato'}
                </div>
              )}
            </div>

            {/* ───── ENDEREÇO DE ENTREGA ───── */}
            <p className={styles.formSectionTitle} style={{ marginTop: '1.5rem', marginBottom: '0.75rem' }}>
              Endereço de entrega
            </p>
            <div className={styles.formGroup} style={{ maxWidth: 200 }}>
              <label>CEP</label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={9}
                value={compradorCep}
                onChange={(e) => {
                  const d = e.target.value.replace(/\D/g, '').slice(0, 8);
                  const masked = d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d;
                  setCompradorCep(masked);
                  if (d.length === 8) buscarCep(d);
                }}
                placeholder="00000-000"
                disabled={cepLoading}
              />
              {cepLoading && <span style={{ fontSize: '0.72rem', color: '#777' }}>Buscando endereço...</span>}
              {cepErr && <span style={{ fontSize: '0.72rem', color: '#dc3545' }}>{cepErr}</span>}
            </div>
            <div className={styles.formGroup}>
              <label>Endereço</label>
              <input
                type="text"
                value={compradorEndereco}
                onChange={(e) => setCompradorEndereco(e.target.value)}
                placeholder="Rua, bairro, cidade/UF — preenchido pelo CEP"
              />
            </div>
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label>Número</label>
                <input type="text" value={compradorNumero} onChange={(e) => setCompradorNumero(e.target.value)} placeholder="123" />
              </div>
              <div className={styles.formGroup}>
                <label>Complemento</label>
                <input type="text" value={compradorComplemento} onChange={(e) => setCompradorComplemento(e.target.value)} placeholder="Apto, bloco, referência..." />
              </div>
            </div>

            {/* ───── DADOS DA VENDA ───── */}
            <p className={styles.formSectionTitle} style={{ marginTop: '1.5rem', marginBottom: '0.75rem' }}>
              Dados da venda
            </p>
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

            {/* ───── TROCA ───── */}
            <p className={styles.formSectionTitle} style={{ marginTop: '1.5rem', marginBottom: '0.5rem' }}>
              Moto de troca
            </p>
            <div className={styles.formGroup} style={{ marginBottom: temTroca ? '0.75rem' : '1.25rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', textTransform: 'none', letterSpacing: 0, fontSize: '0.88rem', color: '#333', fontWeight: 400 }}>
                <input
                  type="checkbox"
                  checked={temTroca}
                  onChange={(e) => setTemTroca(e.target.checked)}
                  style={{ width: 'auto', margin: 0 }}
                />
                O comprador deu uma moto de entrada
              </label>
            </div>
            {temTroca && (
              <div style={{ background: '#f8f8f5', padding: '1rem', border: '1px solid #e4e4e0', marginBottom: '1.25rem' }}>
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
                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label>KM</label>
                    <input type="number" value={trocaKm} onChange={(e) => setTrocaKm(e.target.value)} placeholder="15000" />
                  </div>
                  <div className={styles.formGroup}>
                    <label>Valor de avaliação (R$) *</label>
                    <input type="number" step="0.01" value={trocaValor} onChange={(e) => setTrocaValor(e.target.value)} placeholder="4000" />
                  </div>
                </div>
                <span style={{ fontSize: '0.72rem', color: '#777', display: 'block' }}>
                  A moto de troca entra automaticamente no estoque em estado de avaliação.
                </span>
              </div>
            )}

            {/* ───── COMPROVANTES E OBSERVAÇÕES ───── */}
            <p className={styles.formSectionTitle} style={{ marginTop: '1.5rem', marginBottom: '0.75rem' }}>
              Anexos e observações
            </p>

            <div className={styles.formGroup}>
              <label>
                Comprovantes{' '}
                <span style={{ fontWeight: 400, color: '#999', textTransform: 'none', letterSpacing: 0, fontSize: '0.75rem' }}>
                  ({comprovantes.length}/{MAX_COMPROVANTES})
                </span>
              </label>
              <div style={{ border: '1.5px dashed #e4e4e0', padding: 12, background: '#fafaf8' }}>
                <input
                  ref={comprovanteInputRef}
                  type="file"
                  accept="image/*,application/pdf"
                  multiple
                  onChange={(e) => onAddComprovantes(e.target.files)}
                  style={{ display: 'none' }}
                />
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
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
                  <span style={{ fontSize: '0.75rem', color: '#777' }}>
                    Imagens (PIX, print, foto) ou PDF · Máximo 10
                  </span>
                </div>

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

            <div className={styles.formGroup}>
              <label>Observações</label>
              <textarea value={observacoes} onChange={(e) => setObservacoes(e.target.value)} placeholder="Notas internas sobre a venda..." rows={2} />
            </div>

            {/* ───── RESUMO ───── */}
            <div style={{ background: '#f0f7f0', padding: '1rem 1.1rem', border: '1px solid #d4edda', fontSize: '0.88rem', marginTop: '0.5rem' }}>
              <p className={styles.formSectionTitle} style={{ color: '#155724', marginBottom: '0.6rem' }}>
                Resumo financeiro
              </p>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span>Valor da venda</span>
                <strong>R$ {valorFinal.toLocaleString('pt-BR')}</strong>
              </div>
              {valorTroca > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, color: '#666' }}>
                  <span>Troca (abate)</span>
                  <span>− R$ {valorTroca.toLocaleString('pt-BR')}</span>
                </div>
              )}
              {comissao > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, color: '#666' }}>
                  <span>Comissão vendedor</span>
                  <span>− R$ {comissao}</span>
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
