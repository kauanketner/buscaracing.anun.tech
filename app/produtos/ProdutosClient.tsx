'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import MotoCard from '@/components/MotoCard';
import styles from './produtos.module.css';

interface Moto {
  id: number;
  nome: string;
  marca?: string;
  preco?: number;
  preco_original?: number;
  categoria?: string;
  condicao?: string;
  imagem?: string;
  descricao?: string;
  ano?: number;
  km?: number;
  destaque?: number;
}

export default function ProdutosClient() {
  const [motos, setMotos] = useState<Moto[]>([]);
  const [marcas, setMarcas] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [categoria, setCategoria] = useState('');
  const [condicao, setCondicao] = useState('');
  const [marca, setMarca] = useState('');

  // load marcas once
  useEffect(() => {
    fetch('/api/marcas')
      .then((r) => r.json())
      .then((data) => setMarcas(data))
      .catch(() => {});
  }, []);

  const fetchMotos = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set('q', search);
    if (categoria) params.set('categoria', categoria);
    if (condicao) params.set('condicao', condicao);
    if (marca) params.set('marca', marca);

    fetch(`/api/motos?${params.toString()}`)
      .then((r) => r.json())
      .then((data) => {
        setMotos(Array.isArray(data) ? data : []);
      })
      .catch(() => setMotos([]))
      .finally(() => setLoading(false));
  }, [search, categoria, condicao, marca]);

  useEffect(() => {
    const timer = setTimeout(fetchMotos, 300);
    return () => clearTimeout(timer);
  }, [fetchMotos]);

  const hasFilters = !!(search || categoria || condicao || marca);

  function clearFilters() {
    setSearch('');
    setCategoria('');
    setCondicao('');
    setMarca('');
  }

  return (
    <>
      {/* Banner */}
      <section className={styles.pageBanner}>
        <div className={styles.bannerStripe} />
        <div className={styles.bannerStripe2} />
        <div className={styles.bannerInner}>
          <div className={styles.breadcrumb}>
            <Link href="/">Home</Link>
            <span className={styles.breadcrumbSep}>/</span>
            Estoque
          </div>
          <h1 className={styles.bannerTitle}>
            NOSSO <span className={styles.bannerTitleEm}>ESTOQUE</span>
          </h1>
        </div>
      </section>

      {/* Filters */}
      <div className={styles.filtersBar}>
        <div className={styles.filtersInner}>
          <div className={styles.filtersRow}>
            <div className={styles.searchWrap}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
                <path d="M20 20l-4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
              <input
                type="text"
                className={styles.searchInput}
                placeholder="Buscar moto..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <select
              className={styles.filterSelect}
              value={categoria}
              onChange={(e) => setCategoria(e.target.value)}
            >
              <option value="">Todas categorias</option>
              <option value="motos-rua">Motos de Rua</option>
              <option value="offroad">Offroad</option>
              <option value="quadriciclos">Quadriciclos</option>
              <option value="infantil">Infantil</option>
            </select>

            <select
              className={styles.filterSelect}
              value={condicao}
              onChange={(e) => setCondicao(e.target.value)}
            >
              <option value="">Todas condições</option>
              <option value="nova">Nova</option>
              <option value="usada">Usada</option>
            </select>

            <select
              className={styles.filterSelect}
              value={marca}
              onChange={(e) => setMarca(e.target.value)}
            >
              <option value="">Todas marcas</option>
              {marcas.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.filtersMeta}>
            <span className={styles.resultsCount}>
              <strong>{motos.length}</strong> moto{motos.length !== 1 ? 's' : ''} encontrada
              {motos.length !== 1 ? 's' : ''}
            </span>
            {hasFilters && (
              <button className={styles.clearFilters} onClick={clearFilters}>
                Limpar filtros
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Grid */}
      <section className={styles.productsSection}>
        {loading ? (
          <div className={styles.loading}>
            <div className={styles.spinner} />
            <span className={styles.loadingText}>Carregando motos...</span>
          </div>
        ) : motos.length === 0 ? (
          <div className={styles.empty}>
            <svg
              className={styles.emptyIcon}
              width="64"
              height="64"
              viewBox="0 0 24 24"
              fill="none"
            >
              <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.5" />
              <path d="M20 20l-4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <h2 className={styles.emptyTitle}>Nenhuma moto encontrada</h2>
            <p className={styles.emptyText}>Tente alterar os filtros ou buscar por outro termo.</p>
          </div>
        ) : (
          <div className={styles.productsGrid}>
            {motos.map((moto) => (
              <MotoCard key={moto.id} moto={moto} />
            ))}
          </div>
        )}
      </section>
    </>
  );
}
