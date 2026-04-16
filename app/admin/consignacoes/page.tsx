'use client';

import { useEffect, useState } from 'react';
import { useToast } from '@/components/Toast';
import ContratoPdfButton from '@/components/ContratoPdfButton';
import styles from '../vendas/page.module.css';

type Consignacao = {
  id: number;
  moto_id: number;
  moto_nome: string | null;
  moto_marca: string | null;
  moto_estado: string | null;
  moto_preco: number | null;
  dono_nome: string;
  dono_telefone: string;
  margem_pct: number;
  custo_revisao: number;
  valor_repasse: number | null;
  repasse_pago: number;
  status: string;
  token: string;
  data_entrada: string;
};

const STATUS_LABELS: Record<string, { label: string; bg: string; color: string }> = {
  ativa: { label: 'Ativa', bg: '#d4edda', color: '#155724' },
  vendida: { label: 'Vendida', bg: '#fff3cd', color: '#856404' },
  entregue: { label: 'Entregue', bg: '#d1d1d1', color: '#555' },
  retirada: { label: 'Retirada', bg: '#f5c6cb', color: '#721c24' },
};

export default function ConsignacoesPage() {
  const { showToast } = useToast();
  const [list, setList] = useState<Consignacao[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = async () => {
    try {
      const r = await fetch('/api/consignacoes');
      if (!r.ok) throw new Error('fail');
      setList(await r.json());
    } catch {
      showToast('Erro ao carregar consignações', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { reload(); }, []);

  const retirar = async (c: Consignacao) => {
    if (!confirm(`Registrar retirada da moto "${c.moto_nome}" pelo dono ${c.dono_nome}?`)) return;
    try {
      const r = await fetch(`/api/consignacoes/${c.id}`, { method: 'DELETE' });
      if (!r.ok) throw new Error('fail');
      showToast('Retirada registrada', 'success');
      await reload();
    } catch {
      showToast('Erro ao registrar retirada', 'error');
    }
  };

  const origin = typeof window !== 'undefined' ? window.location.origin : '';

  const totalAtivas = list.filter((c) => c.status === 'ativa').length;
  const totalRepassePendente = list
    .filter((c) => (c.status === 'vendida' || c.status === 'entregue') && !c.repasse_pago)
    .reduce((s, c) => s + (c.valor_repasse || 0), 0);

  return (
    <div className={styles.wrap}>
      <div className={styles.cards}>
        <div className={styles.card}>
          <div className={styles.cardLabel}>Ativas</div>
          <div className={styles.cardValue}>{totalAtivas}</div>
        </div>
        <div className={styles.card}>
          <div className={styles.cardLabel}>Repasses pendentes</div>
          <div className={styles.cardValue}>R$ {totalRepassePendente.toLocaleString('pt-BR')}</div>
        </div>
        <div className={styles.card}>
          <div className={styles.cardLabel}>Total consignações</div>
          <div className={styles.cardValue}>{list.length}</div>
        </div>
      </div>

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Moto</th>
              <th>Dono</th>
              <th>Margem</th>
              <th>Status</th>
              <th>Repasse</th>
              <th>Link</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {list.map((c) => {
              const st = STATUS_LABELS[c.status] || STATUS_LABELS.ativa;
              const link = c.token ? `${origin}/c/${c.token}` : '';
              return (
                <tr key={c.id}>
                  <td>
                    <div className={styles.tdName}>{c.moto_nome || '—'}</div>
                    <div className={styles.tdSub}>{c.moto_marca || ''}</div>
                  </td>
                  <td>
                    <div className={styles.tdName}>{c.dono_nome}</div>
                    {c.dono_telefone && <div className={styles.tdSub}>{c.dono_telefone}</div>}
                  </td>
                  <td className={styles.tdSub}>{c.margem_pct}%</td>
                  <td>
                    <span className={styles.badge} style={{ background: st.bg, color: st.color }}>
                      {st.label}
                    </span>
                  </td>
                  <td className={styles.tdPreco}>
                    {c.valor_repasse != null ? (
                      <>
                        R$ {Number(c.valor_repasse).toLocaleString('pt-BR')}
                        {!c.repasse_pago && <div className={styles.tdSub} style={{ color: '#856404' }}>pendente</div>}
                        {!!c.repasse_pago && <div className={styles.tdSub} style={{ color: '#155724' }}>pago</div>}
                      </>
                    ) : '—'}
                  </td>
                  <td>
                    {link ? (
                      <button
                        type="button"
                        style={{
                          background: 'none', border: '1px solid #e4e4e0', padding: '4px 10px',
                          fontSize: '0.72rem', cursor: 'pointer', fontFamily: "'Barlow Condensed', sans-serif",
                          fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
                          color: '#27367D',
                        }}
                        onClick={() => {
                          navigator.clipboard.writeText(link);
                          showToast('Link copiado!', 'success');
                        }}
                      >
                        Copiar link
                      </button>
                    ) : '—'}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      <ContratoPdfButton tipo="consignacao" id={c.id} label="PDF"
                        style={{ background: 'none', border: '1px solid #e4e4e0', padding: '4px 8px', fontSize: '0.68rem', fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#27367D' }} />
                      {c.status === 'ativa' && (
                        <button
                          type="button"
                          style={{
                            background: 'none', border: '1px solid #f0b4b9', padding: '4px 10px',
                            fontSize: '0.72rem', cursor: 'pointer', fontFamily: "'Barlow Condensed', sans-serif",
                            fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
                            color: '#dc3545',
                          }}
                          onClick={() => retirar(c)}
                        >
                          Retirada
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!loading && list.length === 0 && (
          <div className={styles.empty}>
            Nenhuma consignação. Registre motos consignadas pelo Estoque → Chegou moto → Consignada.
          </div>
        )}
        {loading && <div className={styles.empty}>Carregando...</div>}
      </div>
    </div>
  );
}
