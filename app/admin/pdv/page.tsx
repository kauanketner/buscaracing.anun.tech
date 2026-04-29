'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useToast } from '@/components/Toast';
import { formatCpfCnpj } from '@/lib/cpf-cnpj';
import { useHeaderActions } from '../HeaderActionsContext';
import styles from './page.module.css';

type Peca = {
  id: number;
  nome: string;
  codigo: string;
  categoria: string;
  preco: number | null;
  imagem: string | null;
  estoque_qtd: number | null;
  ativo: number;
};

type Vendedor = {
  id: number;
  nome: string;
  ativo: number;
};

type ClienteSugestao = {
  nome: string;
  telefone: string;
  email: string;
};

type ItemCarrinho = {
  peca_id: number;
  nome: string;
  codigo: string;
  estoque_disponivel: number;
  quantidade: number;
  preco_unitario: number;
};

function fmtBRL(v: number): string {
  return `R$ ${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const FORMA_LABELS: Record<string, string> = {
  pix: 'PIX',
  dinheiro: 'Dinheiro',
  debito: 'Cartão débito',
  credito: 'Cartão crédito',
};

const CANAL_LABELS: Record<string, string> = {
  balcao: 'Balcão',
  site: 'Site',
  whatsapp: 'WhatsApp',
  outro: 'Outro',
};

export default function PdvPage() {
  const { showToast } = useToast();

  const [pecas, setPecas] = useState<Peca[]>([]);
  const [vendedores, setVendedores] = useState<Vendedor[]>([]);
  const [clientes, setClientes] = useState<ClienteSugestao[]>([]);
  const [busca, setBusca] = useState('');

  const [itens, setItens] = useState<ItemCarrinho[]>([]);
  const [clienteNome, setClienteNome] = useState('');
  const [clienteTel, setClienteTel] = useState('');
  const [clienteCpf, setClienteCpf] = useState('');
  const [clienteEmail, setClienteEmail] = useState('');
  const [showSug, setShowSug] = useState(false);
  const [vendedorId, setVendedorId] = useState('');
  const [canal, setCanal] = useState('balcao');
  const [forma, setForma] = useState('pix');
  const [parcelas, setParcelas] = useState('1');
  const [desconto, setDesconto] = useState('0');
  const [observacoes, setObservacoes] = useState('');
  const [salvando, setSalvando] = useState(false);

  // Botão "Histórico" no header
  useHeaderActions(
    <Link
      href="/admin/pdv/historico"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '8px 16px',
        border: '1.5px solid #e4e4e0',
        background: 'transparent',
        color: '#555',
        textDecoration: 'none',
        fontFamily: "'Barlow Condensed', sans-serif",
        fontWeight: 700,
        fontSize: '0.85rem',
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
      }}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
        <polyline points="12 6 12 12 16 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      Histórico de vendas
    </Link>,
    [],
  );

  useEffect(() => {
    (async () => {
      try {
        const [rP, rV, rC] = await Promise.all([
          fetch('/api/pecas'),
          fetch('/api/config/vendedores'),
          fetch('/api/clientes'),
        ]);
        if (rP.ok) setPecas(await rP.json());
        if (rV.ok) setVendedores((await rV.json() as Vendedor[]).filter((v) => v.ativo));
        if (rC.ok) {
          const data = await rC.json() as ClienteSugestao[];
          setClientes(Array.isArray(data) ? data : []);
        }
      } catch {
        showToast('Erro ao carregar dados iniciais', 'error');
      }
    })();
  }, [showToast]);

  const pecasFiltradas = useMemo(() => {
    const q = busca.trim().toLowerCase();
    let arr = pecas.filter((p) => p.ativo);
    if (q) {
      arr = arr.filter((p) =>
        `${p.nome} ${p.codigo} ${p.categoria}`.toLowerCase().includes(q),
      );
    }
    return arr.slice(0, 60);
  }, [pecas, busca]);

  const sugestoesCliente = useMemo(() => {
    const q = clienteNome.trim().toLowerCase();
    if (q.length < 2) return [];
    return clientes
      .filter((c) =>
        `${c.nome} ${c.telefone} ${c.email}`.toLowerCase().includes(q),
      )
      .slice(0, 6);
  }, [clienteNome, clientes]);

  const adicionar = useCallback((p: Peca) => {
    const estoque = Number(p.estoque_qtd) || 0;
    if (estoque <= 0) {
      showToast(`"${p.nome}" sem estoque`, 'error');
      return;
    }
    setItens((cur) => {
      const existe = cur.find((i) => i.peca_id === p.id);
      if (existe) {
        if (existe.quantidade + 1 > estoque) {
          showToast(`Estoque máximo (${estoque}) atingido`, 'error');
          return cur;
        }
        return cur.map((i) =>
          i.peca_id === p.id ? { ...i, quantidade: i.quantidade + 1 } : i,
        );
      }
      return [
        ...cur,
        {
          peca_id: p.id,
          nome: p.nome,
          codigo: p.codigo || '',
          estoque_disponivel: estoque,
          quantidade: 1,
          preco_unitario: Number(p.preco) || 0,
        },
      ];
    });
  }, [showToast]);

  const removerItem = (peca_id: number) => {
    setItens((cur) => cur.filter((i) => i.peca_id !== peca_id));
  };

  const updateQtd = (peca_id: number, q: number) => {
    setItens((cur) =>
      cur.map((i) => {
        if (i.peca_id !== peca_id) return i;
        const max = i.estoque_disponivel;
        const novaQtd = Math.max(1, Math.min(max, Math.floor(q) || 1));
        return { ...i, quantidade: novaQtd };
      }),
    );
  };

  const updatePreco = (peca_id: number, v: number) => {
    setItens((cur) =>
      cur.map((i) =>
        i.peca_id === peca_id ? { ...i, preco_unitario: Math.max(0, v) } : i,
      ),
    );
  };

  const valorBruto = itens.reduce((s, i) => s + i.quantidade * i.preco_unitario, 0);
  const descontoNum = Math.max(0, Number(desconto) || 0);
  const valorTotal = Math.max(0, valorBruto - descontoNum);

  const podeFinalizar =
    itens.length > 0 && clienteNome.trim() && vendedorId && !salvando;

  const finalizar = async () => {
    if (!podeFinalizar) return;
    setSalvando(true);
    try {
      const r = await fetch('/api/pdv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cliente_nome: clienteNome.trim(),
          cliente_tel: clienteTel.trim(),
          cliente_cpf: clienteCpf.trim(),
          cliente_email: clienteEmail.trim(),
          vendedor_id: Number(vendedorId),
          canal,
          forma_pagamento: forma,
          parcelas: forma === 'credito' ? Number(parcelas) || 1 : 1,
          desconto: descontoNum,
          observacoes: observacoes.trim(),
          itens: itens.map((i) => ({
            peca_id: i.peca_id,
            quantidade: i.quantidade,
            preco_unitario: i.preco_unitario,
          })),
        }),
      });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        throw new Error(d.error || 'fail');
      }
      const d = await r.json();
      showToast('Venda registrada!', 'success');
      // Abre recibo em nova aba
      window.open(`/api/contratos/pdv/${d.id}`, '_blank');
      // Limpa form
      setItens([]);
      setClienteNome('');
      setClienteTel('');
      setClienteCpf('');
      setClienteEmail('');
      setDesconto('0');
      setObservacoes('');
      // Recarrega peças pra refletir estoque atualizado
      const rP = await fetch('/api/pecas');
      if (rP.ok) setPecas(await rP.json());
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Erro ao finalizar', 'error');
    } finally {
      setSalvando(false);
    }
  };

  const selecionarSugestao = (c: ClienteSugestao) => {
    setClienteNome(c.nome);
    setClienteTel(c.telefone || '');
    setClienteEmail(c.email || '');
    setShowSug(false);
  };

  return (
    <div className={styles.wrap}>
      {/* Catálogo */}
      <section className={styles.catalogo}>
        <div className={styles.catalogoHead}>
          <h2 className={styles.catalogoTitle}>Peças disponíveis</h2>
          <input
            type="text"
            className={styles.searchInput}
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por nome, código ou categoria..."
          />
        </div>
        <div className={styles.grid}>
          {pecasFiltradas.length === 0 ? (
            <div className={styles.empty}>
              {pecas.length === 0
                ? 'Carregando peças...'
                : 'Nenhuma peça encontrada.'}
            </div>
          ) : (
            pecasFiltradas.map((p) => {
              const estoque = Number(p.estoque_qtd) || 0;
              const semEstoque = estoque <= 0;
              const baixo = estoque > 0 && estoque <= 2;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => adicionar(p)}
                  disabled={semEstoque}
                  className={`${styles.card} ${semEstoque ? styles.cardDisabled : ''}`}
                  title={semEstoque ? 'Sem estoque' : 'Clique para adicionar ao carrinho'}
                >
                  {p.imagem ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.imagem} alt="" className={styles.cardImg} />
                  ) : (
                    <div className={styles.cardImgPh}>
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                        <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2" />
                      </svg>
                    </div>
                  )}
                  <span className={styles.cardName}>{p.nome}</span>
                  {p.codigo && <span className={styles.cardCode}>#{p.codigo}</span>}
                  <span className={styles.cardPreco}>
                    {p.preco ? fmtBRL(p.preco) : '—'}
                  </span>
                  <span
                    className={`${styles.cardEstoque} ${
                      semEstoque ? styles.estoqueZero : baixo ? styles.estoqueBaixo : styles.estoqueOk
                    }`}
                  >
                    {semEstoque ? 'Sem estoque' : `${estoque} em estoque`}
                  </span>
                </button>
              );
            })
          )}
        </div>
      </section>

      {/* Carrinho */}
      <section className={styles.carrinho}>
        <div className={styles.carrinhoHead}>
          <h2 className={styles.carrinhoTitle}>
            Carrinho ({itens.length} {itens.length === 1 ? 'item' : 'itens'})
          </h2>
        </div>
        <div className={styles.carrinhoBody}>
          {itens.length === 0 ? (
            <div className={styles.carrinhoEmpty}>
              Clique nas peças à esquerda para adicionar.
            </div>
          ) : (
            itens.map((i) => (
              <div key={i.peca_id} className={styles.itemRow}>
                <div>
                  <div className={styles.itemNome}>{i.nome}</div>
                  <div className={styles.itemSubtotal}>
                    {fmtBRL(i.quantidade * i.preco_unitario)}
                  </div>
                </div>
                <input
                  type="number"
                  min="1"
                  max={i.estoque_disponivel}
                  value={i.quantidade}
                  onChange={(e) => updateQtd(i.peca_id, Number(e.target.value))}
                  className={styles.miniInput}
                  style={{ textAlign: 'center' }}
                />
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={i.preco_unitario}
                  onChange={(e) => updatePreco(i.peca_id, Number(e.target.value))}
                  className={styles.miniInput}
                />
                <button
                  type="button"
                  onClick={() => removerItem(i.peca_id)}
                  className={styles.btnRemove}
                  title="Remover"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </button>
              </div>
            ))
          )}
        </div>

        <div className={styles.form}>
          {/* Cliente */}
          <div className={styles.formGroup}>
            <label>Cliente *</label>
            <div className={styles.autoBox}>
              <input
                type="text"
                value={clienteNome}
                onChange={(e) => { setClienteNome(e.target.value); setShowSug(true); }}
                onFocus={() => setShowSug(true)}
                onBlur={() => setTimeout(() => setShowSug(false), 200)}
                placeholder="Nome do cliente"
              />
              {showSug && sugestoesCliente.length > 0 && (
                <div className={styles.autoSug}>
                  {sugestoesCliente.map((c, i) => (
                    <div
                      key={`${c.nome}-${c.telefone}-${i}`}
                      className={styles.autoItem}
                      onMouseDown={() => selecionarSugestao(c)}
                    >
                      <div>{c.nome}</div>
                      {(c.telefone || c.email) && (
                        <div className={styles.autoSub}>
                          {c.telefone}
                          {c.telefone && c.email && ' · '}
                          {c.email}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label>Telefone</label>
              <input
                type="text"
                value={clienteTel}
                onChange={(e) => setClienteTel(e.target.value)}
                placeholder="(11) 99999-9999"
              />
            </div>
            <div className={styles.formGroup}>
              <label>CPF / CNPJ</label>
              <input
                type="text"
                value={clienteCpf}
                onChange={(e) => setClienteCpf(formatCpfCnpj(e.target.value))}
                inputMode="numeric"
                placeholder="CPF ou CNPJ"
              />
            </div>
          </div>

          {/* Vendedor + canal */}
          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label>Vendedor *</label>
              <select value={vendedorId} onChange={(e) => setVendedorId(e.target.value)}>
                <option value="">Selecione...</option>
                {vendedores.map((v) => (
                  <option key={v.id} value={String(v.id)}>{v.nome}</option>
                ))}
              </select>
            </div>
            <div className={styles.formGroup}>
              <label>Canal</label>
              <select value={canal} onChange={(e) => setCanal(e.target.value)}>
                {Object.entries(CANAL_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Pagamento */}
          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label>Pagamento</label>
              <select value={forma} onChange={(e) => setForma(e.target.value)}>
                {Object.entries(FORMA_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            {forma === 'credito' ? (
              <div className={styles.formGroup}>
                <label>Parcelas</label>
                <select value={parcelas} onChange={(e) => setParcelas(e.target.value)}>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => (
                    <option key={n} value={String(n)}>{n}x</option>
                  ))}
                </select>
              </div>
            ) : (
              <div className={styles.formGroup}>
                <label>Desconto (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={desconto}
                  onChange={(e) => setDesconto(e.target.value)}
                />
              </div>
            )}
          </div>
          {forma === 'credito' && (
            <div className={styles.formGroup}>
              <label>Desconto (R$)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={desconto}
                onChange={(e) => setDesconto(e.target.value)}
              />
            </div>
          )}

          <div className={styles.formGroup}>
            <label>Observações</label>
            <input
              type="text"
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Notas sobre a venda (opcional)"
            />
          </div>

          {/* Totais */}
          <div className={styles.totals}>
            <div className={styles.totalRow}>
              <span>Subtotal</span>
              <strong>{fmtBRL(valorBruto)}</strong>
            </div>
            {descontoNum > 0 && (
              <div className={styles.totalRow} style={{ color: '#777' }}>
                <span>Desconto</span>
                <span>− {fmtBRL(descontoNum)}</span>
              </div>
            )}
            <div className={`${styles.totalRow} ${styles.totalGrande}`}>
              <span>TOTAL</span>
              <span>{fmtBRL(valorTotal)}</span>
            </div>
          </div>

          <button
            type="button"
            onClick={finalizar}
            disabled={!podeFinalizar}
            className={styles.btnFinalizar}
          >
            {salvando ? 'Registrando...' : 'Finalizar venda'}
          </button>
        </div>
      </section>
    </div>
  );
}
