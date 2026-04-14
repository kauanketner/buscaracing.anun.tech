'use client';

import { useEffect, useMemo, useState } from 'react';
import styles from './page.module.css';

const CATS: Record<string, string> = {
  'motos-rua': 'Motos de Rua',
  offroad: 'Offroad',
  quadriciclos: 'Quadriciclos',
  infantil: 'Infantil',
  outros: 'Outros',
};

type CatRow = { categoria: string; n?: number; count?: number };
type VendedorRow = { id: number; nome: string; vendas: number; receita: number };

type Stats = {
  periodo: { from: string; to: string };
  total: number;
  anunciadas: number;
  destaque: number;
  estoque: { novas: number; usadas: number };
  media_dias_estoque: number;
  dias_estoque_faixas: {
    ate30: number;
    de31a60: number;
    de61a90: number;
    acima90: number;
  };
  por_categoria: CatRow[];
  vendas_periodo: { count: number; receita: number };
  vendas_por_categoria: CatRow[];
  top_vendedores: VendedorRow[];
};

type Preset = 'mes' | 'mes_anterior' | 'ultimos30' | 'ano' | 'custom';

function pad(n: number): string {
  return String(n).padStart(2, '0');
}
function toISO(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function firstOfMonth(d = new Date()): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function firstOfPreviousMonth(d = new Date()): Date {
  return new Date(d.getFullYear(), d.getMonth() - 1, 1);
}
function lastOfPreviousMonth(d = new Date()): Date {
  return new Date(d.getFullYear(), d.getMonth(), 0);
}
function firstOfYear(d = new Date()): Date {
  return new Date(d.getFullYear(), 0, 1);
}
function daysAgo(n: number, d = new Date()): Date {
  const x = new Date(d);
  x.setDate(x.getDate() - n);
  return x;
}

function fmtBRL(v: number): string {
  return v.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  });
}
function fmtDateBR(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [preset, setPreset] = useState<Preset>('mes');

  const today = useMemo(() => new Date(), []);
  const [from, setFrom] = useState<string>(() => toISO(firstOfMonth()));
  const [to, setTo] = useState<string>(() => toISO(new Date()));

  const applyPreset = (p: Preset) => {
    setPreset(p);
    if (p === 'mes') {
      setFrom(toISO(firstOfMonth(today)));
      setTo(toISO(today));
    } else if (p === 'mes_anterior') {
      setFrom(toISO(firstOfPreviousMonth(today)));
      setTo(toISO(lastOfPreviousMonth(today)));
    } else if (p === 'ultimos30') {
      setFrom(toISO(daysAgo(30, today)));
      setTo(toISO(today));
    } else if (p === 'ano') {
      setFrom(toISO(firstOfYear(today)));
      setTo(toISO(today));
    }
  };

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const qs = new URLSearchParams({ from, to }).toString();
    fetch(`/api/stats?${qs}`)
      .then((r) => r.json())
      .then((d: Stats) => {
        if (!cancelled) setStats(d);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [from, to]);

  const rows = stats?.por_categoria ?? [];
  const getN = (c: CatRow) => c.n ?? c.count ?? 0;
  const max = Math.max(1, ...rows.map(getN));

  const faixas = stats?.dias_estoque_faixas;
  const faixasList: Array<{ label: string; n: number; cls: string }> = faixas
    ? [
        { label: 'Até 30 dias', n: faixas.ate30, cls: styles.bgGreen },
        { label: '31–60 dias', n: faixas.de31a60, cls: styles.bgBlue },
        { label: '61–90 dias', n: faixas.de61a90, cls: styles.bgOrange },
        { label: 'Mais de 90 dias', n: faixas.acima90, cls: styles.bgRed },
      ]
    : [];
  const maxFaixa = Math.max(1, ...faixasList.map((f) => f.n));

  const vendasCats = stats?.vendas_por_categoria ?? [];
  const maxVendaCat = Math.max(1, ...vendasCats.map(getN));

  return (
    <>
      {/* Filtro de período */}
      <div className={styles.periodBar}>
        <div className={styles.periodPresets}>
          <button
            className={`${styles.periodBtn} ${preset === 'mes' ? styles.periodBtnActive : ''}`}
            onClick={() => applyPreset('mes')}
          >
            Mês atual
          </button>
          <button
            className={`${styles.periodBtn} ${preset === 'mes_anterior' ? styles.periodBtnActive : ''}`}
            onClick={() => applyPreset('mes_anterior')}
          >
            Mês anterior
          </button>
          <button
            className={`${styles.periodBtn} ${preset === 'ultimos30' ? styles.periodBtnActive : ''}`}
            onClick={() => applyPreset('ultimos30')}
          >
            Últimos 30 dias
          </button>
          <button
            className={`${styles.periodBtn} ${preset === 'ano' ? styles.periodBtnActive : ''}`}
            onClick={() => applyPreset('ano')}
          >
            Ano
          </button>
        </div>
        <div className={styles.periodDates}>
          <label>
            De
            <input
              type="date"
              value={from}
              onChange={(e) => {
                setPreset('custom');
                setFrom(e.target.value);
              }}
            />
          </label>
          <label>
            Até
            <input
              type="date"
              value={to}
              onChange={(e) => {
                setPreset('custom');
                setTo(e.target.value);
              }}
            />
          </label>
        </div>
      </div>

      {/* Stat cards – estoque atual */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statCardLabel}>Total de motos</div>
          <div className={styles.statCardValue}>{stats ? stats.total : '—'}</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statCardLabel}>Anunciadas</div>
          <div className={styles.statCardValue}>{stats ? stats.anunciadas : '—'}</div>
          {stats && (
            <div className={styles.statCardSub}>
              {stats.estoque.novas} novas · {stats.estoque.usadas} usadas
            </div>
          )}
        </div>
        <div className={styles.statCard}>
          <div className={styles.statCardLabel}>Em destaque</div>
          <div className={styles.statCardValue}>{stats ? stats.destaque : '—'}</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statCardLabel}>Média dias em estoque</div>
          <div className={styles.statCardValue}>{stats ? stats.media_dias_estoque : '—'}</div>
          {stats && <div className={styles.statCardSub}>dias em média por anúncio ativo</div>}
        </div>
      </div>

      {/* Stat cards – período */}
      <div className={styles.statsGrid}>
        <div className={`${styles.statCard} ${styles.statCardAccent}`}>
          <div className={styles.statCardLabel}>
            Vendas no período
            <span className={styles.statCardPeriod}>
              {fmtDateBR(from)} – {fmtDateBR(to)}
            </span>
          </div>
          <div className={styles.statCardValue}>
            {stats ? stats.vendas_periodo.count : '—'}
          </div>
        </div>
        <div className={`${styles.statCard} ${styles.statCardAccent}`}>
          <div className={styles.statCardLabel}>Receita no período</div>
          <div className={styles.statCardValue}>
            {stats ? fmtBRL(stats.vendas_periodo.receita) : '—'}
          </div>
        </div>
        <div className={`${styles.statCard} ${styles.statCardAccent}`}>
          <div className={styles.statCardLabel}>Ticket médio</div>
          <div className={styles.statCardValue}>
            {stats && stats.vendas_periodo.count > 0
              ? fmtBRL(stats.vendas_periodo.receita / stats.vendas_periodo.count)
              : '—'}
          </div>
        </div>
        <div className={`${styles.statCard} ${styles.statCardAccent}`}>
          <div className={styles.statCardLabel}>Vendedores ativos no período</div>
          <div className={styles.statCardValue}>
            {stats ? stats.top_vendedores.length : '—'}
          </div>
        </div>
      </div>

      <div className={styles.dashGrid}>
        {/* Por categoria */}
        <div className={styles.catsBreakdown}>
          <div className={styles.catsTitle}>Estoque por categoria</div>
          <div>
            {rows.map((c) => {
              const n = getN(c);
              const pct = Math.round((n / max) * 100);
              return (
                <div key={c.categoria} className={styles.catBarItem}>
                  <div className={styles.catBarHead}>
                    <span>{CATS[c.categoria] || c.categoria}</span>
                    <span>
                      <strong>{n}</strong>
                    </span>
                  </div>
                  <div className={styles.catBarTrack}>
                    <div className={styles.catBarFill} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
            {rows.length === 0 && !loading && (
              <div className={styles.emptyMsg}>Nenhuma moto anunciada.</div>
            )}
          </div>
        </div>

        {/* Dias em estoque */}
        <div className={styles.catsBreakdown}>
          <div className={styles.catsTitle}>Dias em estoque</div>
          <div>
            {faixasList.map((f) => {
              const pct = Math.round((f.n / maxFaixa) * 100);
              return (
                <div key={f.label} className={styles.catBarItem}>
                  <div className={styles.catBarHead}>
                    <span>{f.label}</span>
                    <span>
                      <strong>{f.n}</strong>
                    </span>
                  </div>
                  <div className={styles.catBarTrack}>
                    <div className={`${styles.catBarFill} ${f.cls}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
            {!faixas && !loading && <div className={styles.emptyMsg}>Sem dados.</div>}
          </div>
        </div>

        {/* Vendas por categoria */}
        <div className={styles.catsBreakdown}>
          <div className={styles.catsTitle}>Vendas no período por categoria</div>
          <div>
            {vendasCats.map((c) => {
              const n = getN(c);
              const pct = Math.round((n / maxVendaCat) * 100);
              return (
                <div key={c.categoria} className={styles.catBarItem}>
                  <div className={styles.catBarHead}>
                    <span>{CATS[c.categoria] || c.categoria}</span>
                    <span>
                      <strong>{n}</strong>
                    </span>
                  </div>
                  <div className={styles.catBarTrack}>
                    <div
                      className={`${styles.catBarFill} ${styles.bgRed}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
            {vendasCats.length === 0 && !loading && (
              <div className={styles.emptyMsg}>Nenhuma venda no período.</div>
            )}
          </div>
        </div>

        {/* Top vendedores */}
        <div className={styles.catsBreakdown}>
          <div className={styles.catsTitle}>Top vendedores no período</div>
          {stats && stats.top_vendedores.length > 0 ? (
            <table className={styles.vendTable}>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Vendedor</th>
                  <th className={styles.tRight}>Vendas</th>
                  <th className={styles.tRight}>Receita</th>
                </tr>
              </thead>
              <tbody>
                {stats.top_vendedores.map((v, i) => (
                  <tr key={v.id}>
                    <td className={styles.vendRank}>{i + 1}</td>
                    <td>{v.nome}</td>
                    <td className={styles.tRight}>
                      <strong>{v.vendas}</strong>
                    </td>
                    <td className={styles.tRight}>{fmtBRL(v.receita || 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            !loading && <div className={styles.emptyMsg}>Nenhuma venda registrada no período.</div>
          )}
        </div>
      </div>
    </>
  );
}
