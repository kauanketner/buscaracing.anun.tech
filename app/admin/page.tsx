'use client';

import { useEffect, useState } from 'react';
import styles from './page.module.css';

const CATS: Record<string, string> = {
  'motos-rua': 'Motos de Rua',
  offroad: 'Offroad',
  quadriciclos: 'Quadriciclos',
  infantil: 'Infantil',
  outros: 'Outros',
};

type CatRow = { categoria: string; n?: number; count?: number };

type Stats = {
  total: number;
  ativas: number;
  destaque: number;
  por_categoria: CatRow[];
};

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/stats')
      .then((r) => r.json())
      .then((d: Stats) => {
        if (!cancelled) setStats(d);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const rows = stats?.por_categoria ?? [];
  const getN = (c: CatRow) => c.n ?? c.count ?? 0;
  const max = Math.max(1, ...rows.map(getN));

  return (
    <>
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statCardLabel}>Total de Motos</div>
          <div className={styles.statCardValue}>{stats ? stats.total : '—'}</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statCardLabel}>Motos Ativas</div>
          <div className={styles.statCardValue}>{stats ? stats.ativas : '—'}</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statCardLabel}>Em Destaque</div>
          <div className={styles.statCardValue}>{stats ? stats.destaque : '—'}</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statCardLabel}>Categorias</div>
          <div className={styles.statCardValue}>{stats ? rows.length : '—'}</div>
        </div>
      </div>

      <div className={styles.catsBreakdown}>
        <div className={styles.catsTitle}>Por Categoria</div>
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
          {rows.length === 0 && stats && (
            <div style={{ color: '#777', fontSize: '0.85rem' }}>Nenhuma categoria cadastrada.</div>
          )}
        </div>
      </div>
    </>
  );
}
