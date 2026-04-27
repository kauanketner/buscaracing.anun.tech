'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { OFICINA_STATUS_LABELS, type OficinaStatus } from '@/lib/oficina-status';

type Ordem = {
  id: number;
  cliente_nome: string;
  cliente_telefone: string;
  moto_marca: string;
  moto_modelo: string;
  moto_ano: number | null;
  moto_placa: string;
  moto_chassi: string | null;
  servico_descricao: string;
  status: string;
  data_entrada: string | null;
  data_prevista: string | null;
  mecanico: string;
  mecanico_id?: number | null;
  updated_at: string | null;
  created_at: string | null;
};

type Mecanico = {
  id: number;
  nome: string;
};

// Colunas mostradas no kanban (sem terminais cancelada / finalizada)
const COLS: OficinaStatus[] = [
  'aberta',
  'diagnostico',
  'em_servico',
  'aguardando_peca',
  'aguardando_aprovacao',
  'aguardando_administrativo',
  'agendar_entrega',
  'lavagem',
];

// Cores por status — paleta vibrante para TV
const STATUS_COLORS: Record<OficinaStatus, { bg: string; head: string; text: string }> = {
  aberta: { bg: '#1a2440', head: '#27367D', text: '#fff' },
  diagnostico: { bg: '#1a2e3f', head: '#1976d2', text: '#fff' },
  em_servico: { bg: '#3a2410', head: '#e67e22', text: '#fff' },
  aguardando_peca: { bg: '#3a1818', head: '#c0392b', text: '#fff' },
  aguardando_aprovacao: { bg: '#3a3018', head: '#b8860b', text: '#fff' },
  aguardando_administrativo: { bg: '#1a2e2a', head: '#16a085', text: '#fff' },
  agendar_entrega: { bg: '#2a1a3a', head: '#7b1fa2', text: '#fff' },
  lavagem: { bg: '#1a2e36', head: '#0097a7', text: '#fff' },
  cancelada: { bg: '#2a2a2a', head: '#666', text: '#fff' },
  finalizada: { bg: '#1a3a20', head: '#2e7d32', text: '#fff' },
};

const REFRESH_MS = 15 * 60 * 1000; // 15 minutos

function fmtRelative(iso: string | null): string {
  if (!iso) return '—';
  const ms = Date.now() - new Date(iso.replace(' ', 'T')).getTime();
  if (Number.isNaN(ms)) return '—';
  const min = Math.floor(ms / 60000);
  if (min < 1) return 'agora';
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  return `${d}d`;
}

function fmtClock(date: Date): string {
  return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function fmtDateBR(iso: string | null): string {
  if (!iso) return '—';
  const d = iso.slice(0, 10);
  return new Date(d + 'T12:00:00').toLocaleDateString('pt-BR');
}

export default function OficinaTVPage() {
  const [ordens, setOrdens] = useState<Ordem[]>([]);
  const [mecanicos, setMecanicos] = useState<Mecanico[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [now, setNow] = useState<Date>(new Date());

  const reload = useCallback(async () => {
    try {
      const [rO, rM] = await Promise.all([
        fetch('/api/oficina'),
        fetch('/api/mecanicos').catch(() => null),
      ]);
      if (rO.ok) {
        const d = await rO.json();
        setOrdens(Array.isArray(d) ? d : []);
      }
      if (rM && rM.ok) {
        const d = await rM.json();
        setMecanicos(Array.isArray(d) ? d : []);
      }
      setLastUpdate(new Date());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { reload(); }, [reload]);

  // Auto-refresh a cada 15 min
  useEffect(() => {
    const id = setInterval(reload, REFRESH_MS);
    return () => clearInterval(id);
  }, [reload]);

  // Relógio (atualiza a cada segundo)
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const mecanicoById = useMemo(() => {
    const map = new Map<number, string>();
    for (const m of mecanicos) map.set(m.id, m.nome);
    return map;
  }, [mecanicos]);

  // Agrupa ordens por status, ignorando terminais
  const grouped = useMemo(() => {
    const out: Record<OficinaStatus, Ordem[]> = {
      aberta: [], diagnostico: [], em_servico: [],
      aguardando_peca: [], aguardando_aprovacao: [],
      aguardando_administrativo: [], agendar_entrega: [],
      lavagem: [], cancelada: [], finalizada: [],
    };
    for (const o of ordens) {
      if (o.status in out) out[o.status as OficinaStatus].push(o);
    }
    return out;
  }, [ordens]);

  const minutosDesdeUpdate = Math.floor((now.getTime() - lastUpdate.getTime()) / 60000);
  const updateLate = minutosDesdeUpdate >= 16;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: '#0d0d12',
        color: '#fff',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: "'Barlow', sans-serif",
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <header
        style={{
          padding: '14px 28px',
          background: '#16161e',
          borderBottom: '2px solid #27367D',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <span
            style={{
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: '1.6rem',
              letterSpacing: '0.05em',
              color: '#DC2627',
            }}
          >
            BUSCA RACING
          </span>
          <span
            style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontWeight: 700,
              fontSize: '0.92rem',
              letterSpacing: '0.2em',
              color: '#888',
              textTransform: 'uppercase',
              borderLeft: '2px solid #333',
              paddingLeft: 18,
            }}
          >
            Oficina · ao vivo
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <div style={{ textAlign: 'right' }}>
            <div
              style={{
                fontFamily: "'Bebas Neue', sans-serif",
                fontSize: '2.4rem',
                lineHeight: 1,
                letterSpacing: '0.02em',
                color: '#fff',
              }}
            >
              {fmtClock(now)}
            </div>
            <div
              style={{
                fontSize: '0.76rem',
                color: updateLate ? '#f0b429' : '#888',
                marginTop: 2,
              }}
            >
              Atualizado há {minutosDesdeUpdate} min
              {updateLate && ' ⚠'}
            </div>
          </div>
          <Link
            href="/admin/oficina"
            style={{
              padding: '8px 14px',
              background: 'transparent',
              border: '1.5px solid #444',
              color: '#bbb',
              fontFamily: "'Barlow Condensed', sans-serif",
              fontWeight: 700,
              fontSize: '0.78rem',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              textDecoration: 'none',
            }}
          >
            ← Sair do modo TV
          </Link>
        </div>
      </header>

      {/* Body — Kanban scroll horizontal */}
      <div
        style={{
          flex: 1,
          overflow: 'auto',
          display: 'flex',
          gap: 14,
          padding: 18,
          alignItems: 'stretch',
        }}
      >
        {loading ? (
          <div style={{ color: '#888', padding: 40, fontSize: '1.1rem' }}>Carregando...</div>
        ) : (
          COLS.map((status) => {
            const items = grouped[status];
            const cor = STATUS_COLORS[status];
            return (
              <section
                key={status}
                style={{
                  flex: '0 0 320px',
                  background: cor.bg,
                  border: '1px solid #2a2a32',
                  display: 'flex',
                  flexDirection: 'column',
                  maxHeight: '100%',
                }}
              >
                <div
                  style={{
                    background: cor.head,
                    color: cor.text,
                    padding: '10px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontFamily: "'Barlow Condensed', sans-serif",
                    fontWeight: 700,
                    fontSize: '0.92rem',
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    flexShrink: 0,
                  }}
                >
                  <span>{OFICINA_STATUS_LABELS[status]}</span>
                  <span
                    style={{
                      background: 'rgba(0,0,0,0.3)',
                      padding: '2px 10px',
                      fontSize: '0.85rem',
                      letterSpacing: 0,
                    }}
                  >
                    {items.length}
                  </span>
                </div>

                <div
                  style={{
                    flex: 1,
                    overflow: 'auto',
                    padding: 10,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                  }}
                >
                  {items.length === 0 ? (
                    <p
                      style={{
                        color: '#666', fontSize: '0.82rem', textAlign: 'center',
                        padding: 20, margin: 0, fontStyle: 'italic',
                      }}
                    >
                      vazio
                    </p>
                  ) : (
                    items.map((o) => {
                      const motoLabel = [o.moto_marca, o.moto_modelo].filter(Boolean).join(' ') || 'Moto';
                      const mecNome = o.mecanico_id != null
                        ? mecanicoById.get(o.mecanico_id) || o.mecanico
                        : o.mecanico;
                      return (
                        <div
                          key={o.id}
                          style={{
                            background: '#1d1d28',
                            border: '1px solid #2e2e3a',
                            padding: '10px 12px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 4,
                          }}
                        >
                          <div
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'baseline',
                            }}
                          >
                            <span
                              style={{
                                fontFamily: "'Bebas Neue', sans-serif",
                                fontSize: '1.15rem',
                                color: cor.head,
                                letterSpacing: '0.04em',
                              }}
                            >
                              OS #{o.id}
                            </span>
                            <span
                              style={{
                                fontSize: '0.7rem',
                                color: '#888',
                                fontFamily: "'Barlow Condensed', sans-serif",
                                fontWeight: 700,
                                letterSpacing: '0.08em',
                                textTransform: 'uppercase',
                              }}
                            >
                              há {fmtRelative(o.updated_at || o.created_at)}
                            </span>
                          </div>

                          <div
                            style={{
                              fontWeight: 600,
                              fontSize: '1.02rem',
                              color: '#fff',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {o.cliente_nome}
                          </div>

                          <div
                            style={{
                              fontSize: '0.85rem',
                              color: '#bbb',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {motoLabel}
                            {o.moto_ano && ` · ${o.moto_ano}`}
                          </div>

                          {o.moto_placa && (
                            <div
                              style={{
                                fontFamily: "'Courier New', monospace",
                                fontSize: '0.78rem',
                                color: '#888',
                                letterSpacing: '0.05em',
                              }}
                            >
                              {o.moto_placa.toUpperCase()}
                            </div>
                          )}

                          {mecNome && (
                            <div
                              style={{
                                fontSize: '0.78rem',
                                color: '#7da8ff',
                                marginTop: 2,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 4,
                              }}
                            >
                              <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
                                <path d="M14.7 6.3a5 5 0 11-7 7L3 18a1.5 1.5 0 002 2l4.4-4.4a5 5 0 017-7l-2.6 2.6-2.4-.4-.4-2.4 2.7-2.1z" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" />
                              </svg>
                              {mecNome}
                            </div>
                          )}

                          {o.data_prevista && (
                            <div
                              style={{
                                fontSize: '0.74rem',
                                color: '#f0b429',
                                marginTop: 2,
                              }}
                            >
                              Prevista: {fmtDateBR(o.data_prevista)}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </section>
            );
          })
        )}
      </div>
    </div>
  );
}
