'use client';

import { useEffect, useState } from 'react';
import { useToast } from '@/components/Toast';
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

  useEffect(() => {
    (async () => {
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
    })();
  }, [showToast]);

  const totalVendas = vendas.reduce((s, v) => s + v.valor_venda, 0);
  const totalComissoes = vendas.reduce((s, v) => s + v.comissao_valor, 0);

  return (
    <div className={styles.wrap}>
      {/* Summary cards */}
      <div className={styles.cards}>
        <div className={styles.card}>
          <div className={styles.cardLabel}>Vendas</div>
          <div className={styles.cardValue}>{vendas.length}</div>
        </div>
        <div className={styles.card}>
          <div className={styles.cardLabel}>Faturamento</div>
          <div className={styles.cardValue}>R$ {totalVendas.toLocaleString('pt-BR')}</div>
        </div>
        <div className={styles.card}>
          <div className={styles.cardLabel}>Comissões</div>
          <div className={styles.cardValue}>R$ {totalComissoes.toLocaleString('pt-BR')}</div>
        </div>
      </div>

      {/* Table */}
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>#</th>
              <th>Moto</th>
              <th>Comprador</th>
              <th>Vendedor</th>
              <th>Valor</th>
              <th>Forma</th>
              <th>Comissão</th>
              <th>Data</th>
              <th>Link</th>
            </tr>
          </thead>
          <tbody>
            {vendas.map((v) => (
              <tr key={v.id}>
                <td className={styles.tdId}>{v.id}</td>
                <td>
                  <div className={styles.tdName}>{v.moto_nome || '—'}</div>
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
                <td className={styles.tdPreco}>
                  {v.comissao_valor > 0 ? `R$ ${v.comissao_valor}` : '—'}
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
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && vendas.length === 0 && (
          <div className={styles.empty}>
            Nenhuma venda registrada ainda. Feche vendas pelo Estoque.
          </div>
        )}
        {loading && <div className={styles.empty}>Carregando...</div>}
      </div>
    </div>
  );
}
