'use client';

import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useToast } from '@/components/Toast';
import { formatCpfCnpj } from '@/lib/cpf-cnpj';
import styles from './page.module.css';

type Touchpoint = {
  tipo: 'compra' | 'oficina' | 'reserva' | 'aluguel' | 'lead' | 'pdv' | 'consignacao';
  ref_id: number;
  valor: number | null;
  data: string;
  descricao: string | null;
};

type ClienteDetalhe = {
  id: number;
  nome: string;
  telefone: string;
  email: string;
  cpf_cnpj: string;
  endereco: string;
  observacoes: string;
  ativo: number;
  created_at: string;
  updated_at: string;
  touchpoints: Touchpoint[];
};

const TIPO_META: Record<Touchpoint['tipo'], { label: string; bg: string; color: string; href: (refId: number) => string }> = {
  compra: { label: 'Compra', bg: '#d4edda', color: '#155724', href: () => `/admin/vendas` },
  oficina: { label: 'OS', bg: '#cce5ff', color: '#004085', href: (id) => `/admin/oficina/${id}` },
  reserva: { label: 'Reserva', bg: '#d6d8ff', color: '#27367D', href: () => `/admin/motos` },
  aluguel: { label: 'Aluguel', bg: '#e2d5f0', color: '#5d2e8c', href: () => `/admin/alugueis` },
  lead: { label: 'Lead', bg: '#fff3cd', color: '#856404', href: () => `/admin/clientes` },
  pdv: { label: 'PDV', bg: '#fde2c5', color: '#8b4a00', href: () => `/admin/pdv/historico` },
  consignacao: { label: 'Consignação', bg: '#cfe2ff', color: '#084298', href: () => `/admin/consignacoes` },
};

function fmtBRL(v: number | null): string {
  if (v == null || !v) return '—';
  return `R$ ${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const s = String(iso).slice(0, 10);
  return new Date(s + 'T00:00:00').toLocaleDateString('pt-BR');
}

export default function ClienteDetalhePage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const isNovo = id === 'novo';
  const { showToast } = useToast();
  const [data, setData] = useState<ClienteDetalhe | null>(null);
  const [loading, setLoading] = useState(!isNovo);
  const [saving, setSaving] = useState(false);

  // Form state
  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');
  const [email, setEmail] = useState('');
  const [cpfCnpj, setCpfCnpj] = useState('');
  const [endereco, setEndereco] = useState('');
  const [observacoes, setObservacoes] = useState('');

  const reload = useCallback(async () => {
    if (isNovo) { setLoading(false); return; }
    try {
      const r = await fetch(`/api/clientes/${id}`);
      if (!r.ok) throw new Error('fail');
      const d: ClienteDetalhe = await r.json();
      setData(d);
      setNome(d.nome || '');
      setTelefone(d.telefone || '');
      setEmail(d.email || '');
      setCpfCnpj(d.cpf_cnpj || '');
      setEndereco(d.endereco || '');
      setObservacoes(d.observacoes || '');
    } catch {
      showToast('Erro ao carregar cliente', 'error');
    } finally {
      setLoading(false);
    }
  }, [id, isNovo, showToast]);

  useEffect(() => { reload(); }, [reload]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) {
      showToast('Nome obrigatório', 'error');
      return;
    }
    setSaving(true);
    try {
      const body = {
        nome: nome.trim(),
        telefone: telefone.trim(),
        email: email.trim(),
        cpf_cnpj: cpfCnpj.trim(),
        endereco: endereco.trim(),
        observacoes: observacoes.trim(),
      };
      if (isNovo) {
        const r = await fetch('/api/clientes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        if (!r.ok) throw new Error('fail');
        const d = await r.json();
        showToast('Cliente cadastrado!', 'success');
        router.push(`/admin/clientes/${d.id}`);
      } else {
        const r = await fetch(`/api/clientes/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        if (!r.ok) throw new Error('fail');
        showToast('Cliente atualizado', 'success');
        await reload();
      }
    } catch {
      showToast('Erro ao salvar', 'error');
    } finally {
      setSaving(false);
    }
  };

  const remover = async () => {
    if (isNovo || !data) return;
    if (!confirm(
      `Marcar "${data.nome}" como inativo?\n\nO cliente some das listas e do autocomplete, ` +
      `mas o histórico de vendas/OS/etc. continua intacto. Pode reativar depois.`,
    )) return;
    try {
      const r = await fetch(`/api/clientes/${id}`, { method: 'DELETE' });
      if (!r.ok) throw new Error('fail');
      showToast('Cliente desativado', 'success');
      router.push('/admin/clientes');
    } catch {
      showToast('Erro ao desativar', 'error');
    }
  };

  const totalGasto = useMemo(() => {
    if (!data) return 0;
    return data.touchpoints
      .filter((t) => (t.tipo === 'compra' || t.tipo === 'pdv') && t.valor)
      .reduce((s, t) => s + (t.valor || 0), 0);
  }, [data]);

  const counts = useMemo(() => {
    if (!data) return { total: 0, compras: 0, pdv: 0, os: 0, alugueis: 0, reservas: 0, leads: 0 };
    const tps = data.touchpoints;
    return {
      total: tps.length,
      compras: tps.filter((t) => t.tipo === 'compra').length,
      pdv: tps.filter((t) => t.tipo === 'pdv').length,
      os: tps.filter((t) => t.tipo === 'oficina').length,
      alugueis: tps.filter((t) => t.tipo === 'aluguel').length,
      reservas: tps.filter((t) => t.tipo === 'reserva').length,
      leads: tps.filter((t) => t.tipo === 'lead').length,
    };
  }, [data]);

  if (loading) return <div className={styles.wrap}><p>Carregando...</p></div>;

  return (
    <div className={styles.wrap}>
      <Link href="/admin/clientes" className={styles.backLink}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
          <path d="M19 12H5M12 19l-7-7 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Voltar para clientes
      </Link>

      <div className={styles.grid}>
        {/* Card de dados */}
        <form className={styles.card} onSubmit={submit}>
          <h2 className={styles.cardTitle}>
            {isNovo ? 'Novo cliente' : 'Dados do cliente'}
            {!isNovo && data && data.ativo === 0 && (
              <span style={{ marginLeft: 12, padding: '2px 8px', background: '#fcdcdc', color: '#721c24', fontSize: '0.72rem' }}>
                INATIVO
              </span>
            )}
          </h2>

          <div className={styles.formGroup}>
            <label>Nome *</label>
            <input type="text" value={nome} onChange={(e) => setNome(e.target.value)} required autoFocus={isNovo} />
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label>Telefone</label>
              <input type="text" value={telefone} onChange={(e) => setTelefone(e.target.value)} placeholder="(11) 99999-9999" />
            </div>
            <div className={styles.formGroup}>
              <label>CPF / CNPJ</label>
              <input
                type="text"
                value={cpfCnpj}
                onChange={(e) => setCpfCnpj(formatCpfCnpj(e.target.value))}
                placeholder="CPF ou CNPJ"
                inputMode="numeric"
              />
            </div>
          </div>

          <div className={styles.formGroup}>
            <label>E-mail</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="cliente@exemplo.com" />
          </div>

          <div className={styles.formGroup}>
            <label>Endereço</label>
            <input type="text" value={endereco} onChange={(e) => setEndereco(e.target.value)} placeholder="Rua, número, bairro, cidade/UF" />
          </div>

          <div className={styles.formGroup}>
            <label>Observações</label>
            <textarea value={observacoes} onChange={(e) => setObservacoes(e.target.value)} placeholder="Notas internas (opcional)" rows={3} />
          </div>

          <div className={styles.actions}>
            {!isNovo && (
              <button type="button" className={`${styles.btn} ${styles.btnDanger}`} onClick={remover} disabled={saving}>
                Desativar
              </button>
            )}
            <Link href="/admin/clientes" className={`${styles.btn} ${styles.btnGhost}`} style={{ textDecoration: 'none' }}>
              Cancelar
            </Link>
            <button type="submit" className={`${styles.btn} ${styles.btnPrimary}`} disabled={saving}>
              {saving ? 'Salvando...' : isNovo ? 'Cadastrar' : 'Salvar alterações'}
            </button>
          </div>
        </form>

        {/* Histórico de touchpoints */}
        {!isNovo && data && (
          <div className={styles.card}>
            <h2 className={styles.cardTitle}>Histórico ({counts.total})</h2>

            <div className={styles.kpis}>
              <div className={styles.kpi}>
                <div className={styles.kpiLabel}>Compras moto</div>
                <div className={styles.kpiValue}>{counts.compras}</div>
              </div>
              <div className={styles.kpi}>
                <div className={styles.kpiLabel}>PDV</div>
                <div className={styles.kpiValue}>{counts.pdv}</div>
              </div>
              <div className={styles.kpi}>
                <div className={styles.kpiLabel}>OS</div>
                <div className={styles.kpiValue}>{counts.os}</div>
              </div>
              <div className={styles.kpi}>
                <div className={styles.kpiLabel}>Aluguéis</div>
                <div className={styles.kpiValue}>{counts.alugueis}</div>
              </div>
              <div className={styles.kpi}>
                <div className={styles.kpiLabel}>Total gasto</div>
                <div className={styles.kpiValue} style={{ color: '#155724' }}>{fmtBRL(totalGasto)}</div>
              </div>
            </div>

            {data.touchpoints.length === 0 ? (
              <div className={styles.empty}>Sem interações ainda.</div>
            ) : (
              <div className={styles.timeline}>
                {data.touchpoints.map((tp, i) => {
                  const meta = TIPO_META[tp.tipo];
                  if (!meta) return null;
                  return (
                    <Link key={`${tp.tipo}-${tp.ref_id}-${i}`} href={meta.href(tp.ref_id)} className={styles.tpItem}>
                      <div className={styles.tpDot} style={{ background: meta.color }} />
                      <div className={styles.tpContent}>
                        <div className={styles.tpHead}>
                          <span className={styles.tpBadge} style={{ background: meta.bg, color: meta.color }}>
                            {meta.label}
                          </span>
                          <span style={{ fontSize: '0.78rem', color: '#777' }}>
                            #{tp.ref_id}
                          </span>
                        </div>
                        {tp.descricao && <div className={styles.tpDesc}>{tp.descricao}</div>}
                      </div>
                      <div className={styles.tpMeta}>
                        {tp.valor != null && tp.valor > 0 && (
                          <div className={styles.tpValor}>{fmtBRL(tp.valor)}</div>
                        )}
                        <div className={styles.tpDate}>{fmtDate(tp.data)}</div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
