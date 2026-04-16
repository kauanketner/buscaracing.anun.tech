'use client';

/**
 * Detalhe da OS + ações (mudar status, adicionar nota).
 */
import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useToast } from '@/components/Toast';
import {
  OFICINA_STATUSES,
  OFICINA_STATUS_LABELS,
  STATUS_EXCLUIDOS_DO_MODAL,
  TERMINAL_STATUSES,
} from '@/lib/oficina-status';

type Historico = {
  id: number;
  status_anterior: string | null;
  status_novo: string;
  mensagem: string;
  autor: string;
  created_at: string;
};

type Ordem = {
  id: number;
  status: string;
  cliente_nome: string;
  cliente_telefone: string | null;
  moto_marca: string | null;
  moto_modelo: string | null;
  moto_ano: number | null;
  moto_placa: string | null;
  moto_km: number | null;
  moto_nome: string | null;
  servico_descricao: string | null;
  observacoes: string | null;
  data_entrada: string | null;
  data_prevista: string | null;
  historico: Historico[];
};

function statusClass(s: string): string {
  switch (s) {
    case 'aberta':
    case 'diagnostico':
      return 'tec-badge-blue';
    case 'em_servico':
      return 'tec-badge-green';
    case 'cancelada':
    case 'finalizada':
      return 'tec-badge-gray';
    default:
      return 'tec-badge-amber';
  }
}

function statusLabel(s: string | null): string {
  if (!s) return '—';
  return (OFICINA_STATUS_LABELS as Record<string, string>)[s] || s;
}

function fmtDate(s: string | null | undefined): string {
  if (!s) return '—';
  const iso = s.includes('T') ? s : s.replace(' ', 'T');
  const d = new Date(iso);
  if (isNaN(d.getTime())) return s;
  return d.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
function fmtDateOnly(s: string | null | undefined): string {
  if (!s) return '—';
  const iso = s.includes('T') ? s : `${s}T00:00:00`;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return s;
  return d.toLocaleDateString('pt-BR');
}

const STATUS_OPTIONS = OFICINA_STATUSES.filter(
  (s) => !STATUS_EXCLUIDOS_DO_MODAL.includes(s),
);

export default function TecnicoOSDetailPage() {
  const params = useParams();
  const router = useRouter();
  const slug = (params?.slug as string) || '';
  const id = Number(params?.id);
  const { showToast } = useToast();

  const [ordem, setOrdem] = useState<Ordem | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFoundState, setNotFoundState] = useState(false);

  const [statusModal, setStatusModal] = useState(false);
  const [notaModal, setNotaModal] = useState(false);
  const [novoStatus, setNovoStatus] = useState<string>('');
  const [mensagem, setMensagem] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!Number.isFinite(id)) return;
    setLoading(true);
    try {
      const r = await fetch(`/api/tecnico/ordens/${id}`);
      if (r.status === 401) {
        router.replace(`/t/${slug}/login`);
        return;
      }
      if (r.status === 404) {
        setNotFoundState(true);
        return;
      }
      if (!r.ok) throw new Error('fail');
      const d = (await r.json()) as Ordem;
      setOrdem(d);
    } catch {
      showToast('Erro ao carregar OS', 'error');
    } finally {
      setLoading(false);
    }
  }, [id, router, slug, showToast]);

  useEffect(() => {
    load();
  }, [load]);

  const openStatus = () => {
    setNovoStatus('');
    setMensagem('');
    setStatusModal(true);
  };
  const openNota = () => {
    setMensagem('');
    setNotaModal(true);
  };

  const saveStatus = async () => {
    if (!ordem || !novoStatus || novoStatus === ordem.status) return;
    setSaving(true);
    try {
      const r = await fetch(`/api/tecnico/ordens/${ordem.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: novoStatus, mensagem }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) {
        showToast(d?.error || 'Erro ao atualizar', 'error');
        return;
      }
      showToast('Status atualizado', 'success');
      setStatusModal(false);
      await load();
    } catch {
      showToast('Erro ao atualizar', 'error');
    } finally {
      setSaving(false);
    }
  };

  const saveNota = async () => {
    if (!ordem || !mensagem.trim()) return;
    setSaving(true);
    try {
      const r = await fetch(`/api/tecnico/ordens/${ordem.id}/nota`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mensagem: mensagem.trim() }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) {
        showToast(d?.error || 'Erro ao salvar nota', 'error');
        return;
      }
      showToast('Nota adicionada', 'success');
      setNotaModal(false);
      await load();
    } catch {
      showToast('Erro ao salvar nota', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (notFoundState) {
    return (
      <>
        <header className="tec-topbar">
          <button
            type="button"
            className="tec-topbar-btn"
            onClick={() => router.replace(`/t/${slug}/ordens`)}
          >
            Voltar
          </button>
          <h1 className="tec-topbar-title">OS</h1>
        </header>
        <div className="tec-container">
          <div className="tec-empty">
            OS não encontrada ou não atribuída a você.
          </div>
        </div>
      </>
    );
  }

  if (loading || !ordem) {
    return (
      <>
        <header className="tec-topbar">
          <button
            type="button"
            className="tec-topbar-btn"
            onClick={() => router.replace(`/t/${slug}/ordens`)}
          >
            Voltar
          </button>
          <h1 className="tec-topbar-title">OS</h1>
        </header>
        <div className="tec-loading">Carregando…</div>
      </>
    );
  }

  const isTerminal = (TERMINAL_STATUSES as string[]).includes(ordem.status);
  const moto =
    ordem.moto_nome ||
    [ordem.moto_marca, ordem.moto_modelo].filter(Boolean).join(' ') ||
    '—';

  return (
    <>
      <header className="tec-topbar">
        <button
          type="button"
          className="tec-topbar-btn"
          onClick={() => router.replace(`/t/${slug}/ordens`)}
        >
          ← Voltar
        </button>
        <div style={{ flex: 1 }}>
          <h1 className="tec-topbar-title">OS #{ordem.id}</h1>
          <div className="tec-topbar-sub">{statusLabel(ordem.status)}</div>
        </div>
      </header>

      <div className="tec-container">
        <div className="tec-detail">
          <section className="tec-section">
            <h2 className="tec-section-title">Cliente</h2>
            <div className="tec-kv">
              <div>
                <div className="tec-kv-label">Nome</div>
                <div className="tec-kv-val">{ordem.cliente_nome || '—'}</div>
              </div>
              <div>
                <div className="tec-kv-label">Telefone</div>
                <div className="tec-kv-val">
                  {ordem.cliente_telefone ? (
                    <a
                      href={`tel:${ordem.cliente_telefone.replace(/\D/g, '')}`}
                      style={{ color: '#27367D' }}
                    >
                      {ordem.cliente_telefone}
                    </a>
                  ) : (
                    '—'
                  )}
                </div>
              </div>
            </div>
          </section>

          <section className="tec-section">
            <h2 className="tec-section-title">Moto</h2>
            <div className="tec-kv">
              <div style={{ gridColumn: '1 / -1' }}>
                <div className="tec-kv-label">Modelo</div>
                <div className="tec-kv-val">{moto}</div>
              </div>
              <div>
                <div className="tec-kv-label">Placa</div>
                <div className="tec-kv-val">{ordem.moto_placa || '—'}</div>
              </div>
              <div>
                <div className="tec-kv-label">Ano</div>
                <div className="tec-kv-val">{ordem.moto_ano || '—'}</div>
              </div>
              <div>
                <div className="tec-kv-label">KM</div>
                <div className="tec-kv-val">
                  {ordem.moto_km ? ordem.moto_km.toLocaleString('pt-BR') : '—'}
                </div>
              </div>
              <div>
                <div className="tec-kv-label">Entrada</div>
                <div className="tec-kv-val">{fmtDateOnly(ordem.data_entrada)}</div>
              </div>
            </div>
          </section>

          {ordem.servico_descricao && (
            <section className="tec-section">
              <h2 className="tec-section-title">Serviço solicitado</h2>
              <div className="tec-desc">{ordem.servico_descricao}</div>
            </section>
          )}

          {ordem.observacoes && (
            <section className="tec-section">
              <h2 className="tec-section-title">Observações</h2>
              <div className="tec-desc">{ordem.observacoes}</div>
            </section>
          )}

          <section className="tec-section">
            <h2 className="tec-section-title">Histórico</h2>
            {ordem.historico.length === 0 ? (
              <div style={{ color: '#777', fontSize: '0.85rem' }}>—</div>
            ) : (
              <div className="tec-timeline">
                {ordem.historico
                  .slice()
                  .reverse()
                  .map((h) => {
                    const isNota = h.status_anterior === h.status_novo;
                    return (
                      <div className="tec-event" key={h.id}>
                        <div className="tec-event-top">
                          {!isNota && (
                            <>
                              <span className={`tec-badge ${statusClass(h.status_novo)}`}>
                                {statusLabel(h.status_novo)}
                              </span>
                              {h.status_anterior && (
                                <span
                                  style={{ color: '#999', fontSize: '0.75rem' }}
                                >
                                  ← {statusLabel(h.status_anterior)}
                                </span>
                              )}
                            </>
                          )}
                          {isNota && (
                            <span className="tec-badge tec-badge-gray">Nota</span>
                          )}
                          <span className="tec-event-date">
                            {fmtDate(h.created_at)}
                          </span>
                          {h.autor && (
                            <span className="tec-event-autor">· {h.autor}</span>
                          )}
                        </div>
                        {h.mensagem && (
                          <div className="tec-event-msg">{h.mensagem}</div>
                        )}
                      </div>
                    );
                  })}
              </div>
            )}
          </section>
        </div>

        {!isTerminal && (
          <div className="tec-actions">
            <button
              type="button"
              className="tec-btn-primary"
              onClick={openStatus}
              style={{ flex: 1 }}
            >
              Mudar status
            </button>
            <button
              type="button"
              className="tec-btn-secondary"
              onClick={openNota}
            >
              Adicionar nota
            </button>
          </div>
        )}
      </div>

      {statusModal && (
        <div
          className="tec-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget && !saving) setStatusModal(false);
          }}
        >
          <div className="tec-modal">
            <h2 className="tec-modal-title">Mudar status</h2>
            <p className="tec-kv-label" style={{ marginBottom: 6 }}>
              Novo status
            </p>
            <select
              className="tec-select"
              value={novoStatus}
              onChange={(e) => setNovoStatus(e.target.value)}
              disabled={saving}
            >
              <option value="">— Selecionar —</option>
              {STATUS_OPTIONS.filter((s) => s !== ordem.status).map((s) => (
                <option key={s} value={s}>
                  {OFICINA_STATUS_LABELS[s]}
                </option>
              ))}
            </select>
            <p className="tec-kv-label" style={{ marginBottom: 6 }}>
              Observação (opcional)
            </p>
            <textarea
              className="tec-textarea"
              value={mensagem}
              onChange={(e) => setMensagem(e.target.value)}
              placeholder="Detalhes da mudança…"
              disabled={saving}
            />
            <div className="tec-actions" style={{ position: 'static', paddingBottom: 0 }}>
              <button
                type="button"
                className="tec-btn-primary"
                onClick={saveStatus}
                disabled={saving || !novoStatus || novoStatus === ordem.status}
                style={{ flex: 1 }}
              >
                {saving ? 'Salvando…' : 'Salvar'}
              </button>
              <button
                type="button"
                className="tec-btn-secondary"
                onClick={() => setStatusModal(false)}
                disabled={saving}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {notaModal && (
        <div
          className="tec-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget && !saving) setNotaModal(false);
          }}
        >
          <div className="tec-modal">
            <h2 className="tec-modal-title">Adicionar nota</h2>
            <textarea
              className="tec-textarea"
              value={mensagem}
              onChange={(e) => setMensagem(e.target.value)}
              placeholder="Ex: cliente autorizou trocar o pneu traseiro…"
              disabled={saving}
              autoFocus
              rows={5}
            />
            <div className="tec-actions" style={{ position: 'static', paddingBottom: 0 }}>
              <button
                type="button"
                className="tec-btn-primary"
                onClick={saveNota}
                disabled={saving || !mensagem.trim()}
                style={{ flex: 1 }}
              >
                {saving ? 'Salvando…' : 'Salvar nota'}
              </button>
              <button
                type="button"
                className="tec-btn-secondary"
                onClick={() => setNotaModal(false)}
                disabled={saving}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
