'use client';

import { useCallback, useContext, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { HeaderActionsContext } from '../../HeaderActionsContext';
import { useToast } from '@/components/Toast';
import {
  OFICINA_STATUS_LABELS,
  isOficinaStatus,
  isTerminal,
  statusLabel,
  type OficinaStatus,
} from '@/lib/oficina-status';
import AtualizarStatusModal from '../AtualizarStatusModal';
import FecharModal from '../FecharModal';
import GarantiaModal from '../GarantiaModal';
import styles from './detail.module.css';
import './print.css';

type HistoricoItem = {
  id: number;
  ordem_id: number;
  status_anterior: string | null;
  status_novo: string;
  mensagem: string;
  autor: string;
  created_at: string;
};

type GarantiaLite = {
  id: number;
  status: string;
  data_entrada: string | null;
  servico_descricao: string;
};

type OrdemDetalhada = {
  id: number;
  cliente_nome: string;
  cliente_telefone: string;
  cliente_email: string;
  moto_id: number | null;
  moto_nome: string | null;
  moto_marca: string;
  moto_modelo: string;
  moto_ano: number | null;
  moto_placa: string;
  moto_km: number | null;
  servico_descricao: string;
  observacoes: string;
  mecanico: string;
  valor_estimado: number | null;
  valor_final: number | null;
  status: string;
  data_entrada: string | null;
  data_prevista: string | null;
  data_conclusao: string | null;
  created_at: string | null;
  updated_at: string | null;
  garantia_de_id: number | null;
  historico: HistoricoItem[];
  garantia_de:
    | (OrdemDetalhada & { historico: HistoricoItem[] })
    | null;
  garantias: GarantiaLite[];
};

function formatDateBR(iso?: string | null): string {
  if (!iso) return '—';
  const s = iso.slice(0, 10);
  const [y, m, d] = s.split('-');
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

function formatDateTimeBR(iso?: string | null): string {
  if (!iso) return '—';
  // Esperado: "YYYY-MM-DD HH:MM:SS"
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/);
  if (!m) return iso;
  return `${m[3]}/${m[2]}/${m[1]} ${m[4]}:${m[5]}`;
}

function formatBRL(v: number | null): string {
  if (v == null) return '—';
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function badgeForStatus(status: string): string {
  switch (status) {
    case 'aberta': return styles.bgBlue;
    case 'diagnostico': return styles.bgBlue;
    case 'em_servico': return styles.bgOrange;
    case 'aguardando_peca': return styles.bgRed;
    case 'aguardando_aprovacao': return styles.bgYellow;
    case 'aguardando_administrativo': return styles.bgYellow;
    case 'agendar_entrega': return styles.bgPurple;
    case 'lavagem': return styles.bgPurple;
    case 'finalizada': return styles.bgGreen;
    case 'cancelada': return styles.bgGray;
    default: return styles.bgGray;
  }
}

function Timeline({ items }: { items: HistoricoItem[] }) {
  if (!items.length) {
    return <div className={styles.emptyHistorico}>Sem histórico registrado.</div>;
  }
  return (
    <ul className={styles.timeline}>
      {items.map((h) => (
        <li key={h.id} className={styles.tlItem}>
          <span className={styles.tlDot} />
          <div className={styles.tlHead}>
            {h.status_anterior && (
              <>
                <span className={`${styles.badge} ${badgeForStatus(h.status_anterior)}`}>
                  {statusLabel(h.status_anterior)}
                </span>
                <span className={styles.tlArrow}>→</span>
              </>
            )}
            <span className={`${styles.badge} ${badgeForStatus(h.status_novo)}`}>
              {statusLabel(h.status_novo)}
            </span>
            <span className={styles.tlDate}>{formatDateTimeBR(h.created_at)}</span>
          </div>
          {h.mensagem && <p className={styles.tlMsg}>{h.mensagem}</p>}
          {h.autor && <div className={styles.tlAutor}>por {h.autor}</div>}
        </li>
      ))}
    </ul>
  );
}

export default function OficinaDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params?.id ? Number(params.id) : NaN;

  const headerCtx = useContext(HeaderActionsContext);
  const { showToast } = useToast();

  const [ordem, setOrdem] = useState<OrdemDetalhada | null>(null);
  const [loading, setLoading] = useState(true);
  const [atualizarOpen, setAtualizarOpen] = useState(false);
  const [fecharOpen, setFecharOpen] = useState(false);
  const [garantiaOpen, setGarantiaOpen] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`/api/oficina/${id}`, { cache: 'no-store' });
      if (!r.ok) {
        if (r.status === 404) {
          showToast('OS não encontrada', 'error');
          router.push('/admin/oficina');
          return;
        }
        throw new Error('fail');
      }
      const d = (await r.json()) as OrdemDetalhada;
      setOrdem(d);
    } catch {
      showToast('Erro ao carregar OS', 'error');
    } finally {
      setLoading(false);
    }
  }, [id, router, showToast]);

  useEffect(() => {
    if (!Number.isFinite(id)) return;
    reload();
  }, [id, reload]);

  useEffect(() => {
    if (!headerCtx) return;
    headerCtx.setActions(
      <Link href="/admin/oficina" className={`${styles.btn} ${styles.btnGhost}`}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
          <polyline points="15 18 9 12 15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Voltar
      </Link>,
    );
    return () => headerCtx.setActions(null);
  }, [headerCtx]);

  if (loading) {
    return (
      <div className={styles.wrap}>
        <div className={styles.loading}>Carregando...</div>
      </div>
    );
  }
  if (!ordem) {
    return (
      <div className={styles.wrap}>
        <div className={styles.loading}>OS não encontrada</div>
      </div>
    );
  }

  const terminal = isTerminal(ordem.status);
  const podeFinalizar = !terminal;
  const podeAtualizar = !terminal;
  const podeAbrirGarantia = ordem.status === 'finalizada';
  const motoLabel = ordem.moto_nome || [ordem.moto_marca, ordem.moto_modelo].filter(Boolean).join(' ');

  return (
    <div className={`${styles.wrap} os-print-wrap`}>
      <div className={`${styles.topbar} os-print-topbar`}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <h1>
            OS #{ordem.id}{' '}
            <span
              className={`${styles.badge} ${badgeForStatus(ordem.status)}`}
              style={{ verticalAlign: 'middle', marginLeft: 8 }}
            >
              {isOficinaStatus(ordem.status)
                ? OFICINA_STATUS_LABELS[ordem.status as OficinaStatus]
                : ordem.status}
            </span>
          </h1>
          <span className={styles.subtitle}>
            {ordem.cliente_nome}
            {motoLabel ? ` · ${motoLabel}` : ''}
            {ordem.moto_placa ? ` · ${ordem.moto_placa.toUpperCase()}` : ''}
          </span>
        </div>

        <div className={`${styles.actions} os-no-print`}>
          <button
            type="button"
            className={`${styles.btn} ${styles.btnGhost}`}
            onClick={() => window.print()}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <polyline points="6 9 6 2 18 2 18 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2" stroke="currentColor" strokeWidth="2" />
              <rect x="6" y="14" width="12" height="8" stroke="currentColor" strokeWidth="2" />
            </svg>
            Imprimir
          </button>
          {podeAtualizar && (
            <button
              type="button"
              className={`${styles.btn} ${styles.btnPrimary}`}
              onClick={() => setAtualizarOpen(true)}
            >
              Atualizar status
            </button>
          )}
          {podeFinalizar && (
            <button
              type="button"
              className={`${styles.btn} ${styles.btnSuccess}`}
              onClick={() => setFecharOpen(true)}
            >
              Fechar OS
            </button>
          )}
          {podeAbrirGarantia && (
            <button
              type="button"
              className={`${styles.btn} ${styles.btnPrimary}`}
              onClick={() => setGarantiaOpen(true)}
            >
              Abrir garantia
            </button>
          )}
        </div>
      </div>

      {ordem.garantia_de && (
        <div className={`${styles.garantiaBanner} os-no-print`}>
          <span>
            Esta OS é uma <strong>garantia</strong> da OS #{ordem.garantia_de.id} (
            {formatDateBR(ordem.garantia_de.data_entrada)}).
          </span>
          <Link href={`/admin/oficina/${ordem.garantia_de.id}`}>Ver OS original →</Link>
        </div>
      )}

      <div className={styles.grid}>
        <div className={`${styles.card} os-print-card`}>
          <h2 className={styles.cardTitle}>Cliente</h2>
          <dl>
            <div className={styles.fieldRow}>
              <dt>Nome</dt>
              <dd>{ordem.cliente_nome || '—'}</dd>
            </div>
            <div className={styles.fieldRow}>
              <dt>Telefone</dt>
              <dd>{ordem.cliente_telefone || '—'}</dd>
            </div>
            <div className={styles.fieldRow}>
              <dt>E-mail</dt>
              <dd>{ordem.cliente_email || '—'}</dd>
            </div>
          </dl>
        </div>

        <div className={`${styles.card} os-print-card`}>
          <h2 className={styles.cardTitle}>Moto</h2>
          <dl>
            <div className={styles.fieldRow}>
              <dt>{ordem.moto_id ? 'Anúncio' : 'Descrição'}</dt>
              <dd>
                {ordem.moto_id && ordem.moto_nome ? (
                  <Link href={`/admin/motos/${ordem.moto_id}`} style={{ color: '#27367D' }}>
                    {ordem.moto_nome}
                  </Link>
                ) : (
                  motoLabel || '—'
                )}
              </dd>
            </div>
            <div className={styles.fieldRow}>
              <dt>Placa</dt>
              <dd style={{ textTransform: 'uppercase', fontFamily: 'Courier New, monospace' }}>
                {ordem.moto_placa || '—'}
              </dd>
            </div>
            <div className={styles.fieldRow}>
              <dt>Ano</dt>
              <dd>{ordem.moto_ano ?? '—'}</dd>
            </div>
            <div className={styles.fieldRow}>
              <dt>KM</dt>
              <dd>{ordem.moto_km != null ? ordem.moto_km.toLocaleString('pt-BR') : '—'}</dd>
            </div>
          </dl>
        </div>

        <div className={`${styles.card} ${styles.gridFull} os-print-card`}>
          <h2 className={styles.cardTitle}>Serviço</h2>
          <dl>
            <div className={styles.fieldRow}>
              <dt>Descrição</dt>
              <dd style={{ whiteSpace: 'pre-wrap' }}>{ordem.servico_descricao || '—'}</dd>
            </div>
            <div className={styles.fieldRow}>
              <dt>Mecânico</dt>
              <dd>{ordem.mecanico || '—'}</dd>
            </div>
            {ordem.observacoes && (
              <div className={styles.fieldRow}>
                <dt>Observações</dt>
                <dd style={{ whiteSpace: 'pre-wrap' }}>{ordem.observacoes}</dd>
              </div>
            )}
          </dl>
        </div>

        <div className={`${styles.card} os-print-card`}>
          <h2 className={styles.cardTitle}>Datas</h2>
          <dl>
            <div className={styles.fieldRow}>
              <dt>Entrada</dt>
              <dd>{formatDateBR(ordem.data_entrada)}</dd>
            </div>
            <div className={styles.fieldRow}>
              <dt>Previsão</dt>
              <dd>{formatDateBR(ordem.data_prevista)}</dd>
            </div>
            <div className={styles.fieldRow}>
              <dt>Conclusão</dt>
              <dd>{formatDateBR(ordem.data_conclusao)}</dd>
            </div>
          </dl>
        </div>

        <div className={`${styles.card} os-print-card`}>
          <h2 className={styles.cardTitle}>Valores</h2>
          <dl>
            <div className={styles.fieldRow}>
              <dt>Estimado</dt>
              <dd>{formatBRL(ordem.valor_estimado)}</dd>
            </div>
            <div className={styles.fieldRow}>
              <dt>Final</dt>
              <dd className={styles.big}>{formatBRL(ordem.valor_final)}</dd>
            </div>
          </dl>
        </div>

        <div className={`${styles.card} ${styles.gridFull} os-print-card`}>
          <h2 className={styles.cardTitle}>Histórico desta OS</h2>
          <Timeline items={ordem.historico} />
        </div>

        {ordem.garantia_de && (
          <div className={`${styles.card} ${styles.gridFull} os-print-card`}>
            <h2 className={styles.cardTitle}>
              Histórico da OS original #{ordem.garantia_de.id}
            </h2>
            <Timeline items={ordem.garantia_de.historico} />
          </div>
        )}

        {ordem.garantias.length > 0 && (
          <div className={`${styles.card} ${styles.gridFull} os-print-card`}>
            <h2 className={styles.cardTitle}>Garantias abertas a partir desta OS</h2>
            <ul className={styles.garantiasList}>
              {ordem.garantias.map((g) => (
                <li key={g.id}>
                  <Link href={`/admin/oficina/${g.id}`}>
                    <span className={`${styles.badge} ${badgeForStatus(g.status)}`}>
                      {statusLabel(g.status)}
                    </span>
                    <span>OS #{g.id} · {formatDateBR(g.data_entrada)}</span>
                    <span style={{ color: '#555', fontWeight: 400 }}>
                      {g.servico_descricao || '—'}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {atualizarOpen && (
        <AtualizarStatusModal
          ordemId={ordem.id}
          label={`OS #${ordem.id}`}
          statusAtual={ordem.status}
          onClose={() => setAtualizarOpen(false)}
          onUpdated={async () => {
            setAtualizarOpen(false);
            await reload();
          }}
          onToast={showToast}
        />
      )}

      {fecharOpen && (
        <FecharModal
          ordemId={ordem.id}
          label={`OS #${ordem.id}`}
          defaultValor={ordem.valor_final ?? ordem.valor_estimado ?? null}
          onClose={() => setFecharOpen(false)}
          onClosed={async () => {
            setFecharOpen(false);
            await reload();
          }}
          onToast={showToast}
        />
      )}

      {garantiaOpen && (
        <GarantiaModal
          ordemId={ordem.id}
          label={`OS #${ordem.id}`}
          onClose={() => setGarantiaOpen(false)}
          onCreated={(newId) => {
            setGarantiaOpen(false);
            router.push(`/admin/oficina/${newId}`);
          }}
          onToast={showToast}
        />
      )}
    </div>
  );
}
