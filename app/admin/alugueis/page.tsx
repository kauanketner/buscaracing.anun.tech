'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useToast } from '@/components/Toast';
import styles from './page.module.css';
import AluguelActions from './AluguelActions';

type Aluguel = {
  id: number;
  moto_id: number;
  moto_nome: string;
  moto_marca: string;
  moto_imagem: string | null;
  status: string;
  data_inicio: string;
  data_fim: string;
  dias: number;
  valor_diaria: number;
  valor_total: number;
  valor_caucao: number;
  cliente_nome: string;
  telefone: string;
  email: string;
  cpf: string;
  cnh: string;
  observacoes: string;
  admin_notas: string;
  motivo_recusa: string;
  valor_dano: number;
  created_at: string;
  aprovada_em: string | null;
  retirada_em: string | null;
  devolvida_em: string | null;
};

const STATUS_META: Record<string, { label: string; bg: string; color: string }> = {
  pendente:   { label: 'Pendente',   bg: '#fff3cd', color: '#856404' },
  aprovada:   { label: 'Aprovada',   bg: '#d4edda', color: '#155724' },
  ativa:      { label: 'Ativa',      bg: '#cce5ff', color: '#004085' },
  finalizada: { label: 'Finalizada', bg: '#e2e3e5', color: '#383d41' },
  recusada:   { label: 'Recusada',   bg: '#f5c6cb', color: '#721c24' },
  cancelada:  { label: 'Cancelada',  bg: '#f5c6cb', color: '#721c24' },
};

function fmtBRL(v: number): string {
  return `R$ ${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
}
function fmtDate(iso: string): string {
  if (!iso) return '—';
  return new Date(iso + 'T12:00:00').toLocaleDateString('pt-BR');
}

export default function AlugueisAdminPage() {
  const { showToast } = useToast();
  const [alugueis, setAlugueis] = useState<Aluguel[]>([]);
  const [loading, setLoading] = useState(true);
  const [fStatus, setFStatus] = useState('');
  const [search, setSearch] = useState('');

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch('/api/admin/alugueis');
      if (r.ok) setAlugueis(await r.json());
    } catch {
      showToast('Erro ao carregar', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => { reload(); }, [reload]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return alugueis.filter((a) => {
      if (fStatus && a.status !== fStatus) return false;
      if (q) {
        const t = `${a.cliente_nome} ${a.moto_nome} ${a.telefone} ${a.cpf}`.toLowerCase();
        if (!t.includes(q)) return false;
      }
      return true;
    });
  }, [alugueis, fStatus, search]);

  const pendentes = alugueis.filter((a) => a.status === 'pendente').length;
  const ativas = alugueis.filter((a) => a.status === 'aprovada' || a.status === 'ativa').length;
  const mesCur = new Date().toISOString().slice(0, 7);
  const faturamento = alugueis
    .filter((a) => (a.retirada_em || '').slice(0, 7) === mesCur && (a.status === 'ativa' || a.status === 'finalizada'))
    .reduce((s, a) => s + Number(a.valor_total || 0), 0);

  return (
    <div className={styles.wrap}>
      <div className={styles.cards}>
        <div className={styles.card}>
          <div className={styles.cardLabel}>Pendentes</div>
          <div className={styles.cardValue} style={{ color: pendentes > 0 ? '#856404' : undefined }}>
            {pendentes}
          </div>
        </div>
        <div className={styles.card}>
          <div className={styles.cardLabel}>Aprovadas / Ativas</div>
          <div className={styles.cardValue}>{ativas}</div>
        </div>
        <div className={styles.card}>
          <div className={styles.cardLabel}>Faturamento do mês</div>
          <div className={styles.cardValue}>{fmtBRL(faturamento)}</div>
        </div>
        <div className={styles.card}>
          <div className={styles.cardLabel}>Total</div>
          <div className={styles.cardValue}>{alugueis.length}</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: '1rem', flexWrap: 'wrap' }}>
        <input type="text" placeholder="Buscar por cliente, moto, telefone, CPF..."
          value={search} onChange={(e) => setSearch(e.target.value)}
          style={{ flex: 1, minWidth: 260, padding: '10px 14px', border: '1.5px solid #e4e4e0', fontSize: '0.92rem' }} />
        <select value={fStatus} onChange={(e) => setFStatus(e.target.value)}
          style={{ padding: '10px 14px', border: '1.5px solid #e4e4e0', fontSize: '0.92rem' }}>
          <option value="">Todos status</option>
          <option value="pendente">Pendente</option>
          <option value="aprovada">Aprovada</option>
          <option value="ativa">Ativa</option>
          <option value="finalizada">Finalizada</option>
          <option value="recusada">Recusada</option>
          <option value="cancelada">Cancelada</option>
        </select>
      </div>

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Moto</th>
              <th>Cliente</th>
              <th>Período</th>
              <th>Valor</th>
              <th>Status</th>
              <th style={{ textAlign: 'right' }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((a) => {
              const st = STATUS_META[a.status] || STATUS_META.pendente;
              return (
                <tr key={a.id}>
                  <td>
                    <div className={styles.tdName}>{a.moto_nome}</div>
                    <div className={styles.tdSub}>{a.moto_marca}</div>
                  </td>
                  <td>
                    <div className={styles.tdName}>{a.cliente_nome}</div>
                    <div className={styles.tdSub}>{a.telefone}</div>
                  </td>
                  <td>
                    <div style={{ fontSize: '0.88rem' }}>
                      {fmtDate(a.data_inicio)} → {fmtDate(a.data_fim)}
                    </div>
                    <div className={styles.tdSub}>{a.dias} {a.dias === 1 ? 'dia' : 'dias'}</div>
                  </td>
                  <td className={styles.tdPreco}>{fmtBRL(a.valor_total)}</td>
                  <td>
                    <span className={styles.badge} style={{ background: st.bg, color: st.color }}>
                      {st.label}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <AluguelActions aluguel={a} onChanged={reload} />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!loading && filtered.length === 0 && (
          <div className={styles.empty}>Nenhuma reserva encontrada.</div>
        )}
        {loading && <div className={styles.empty}>Carregando...</div>}
      </div>
    </div>
  );
}
