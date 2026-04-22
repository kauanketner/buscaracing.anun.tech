import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getDb } from '@/lib/db';
import { PECAS_CATEGORIAS, getCategoria } from '@/lib/pecas-categorias';
import styles from './pecas-categoria.module.css';
import parentStyles from '../pecas.module.css';

type Props = { params: Promise<{ categoria: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { categoria } = await params;
  const cat = getCategoria(categoria);
  if (!cat) return { title: 'Peças' };
  return {
    title: `${cat.label} — Peças | Busca Racing`,
    description: `${cat.desc} Peças novas e originais para todas as marcas. Entrega para todo o Brasil.`,
    alternates: { canonical: `https://buscaracing.com/pecas/${cat.slug}` },
  };
}

type Peca = {
  id: number;
  nome: string;
  categoria: string;
  descricao: string;
  preco: number | null;
  preco_original: number | null;
  imagem: string | null;
  marca_moto: string;
  modelo_compat: string;
  codigo: string;
  destaque: number;
  ativo: number;
};

export const dynamic = 'force-dynamic';

function fmtBRL(v: number): string {
  return `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function waLink(peca: Peca): string {
  const nome = peca.nome || 'peça';
  const txt = `Olá! Tenho interesse na peça "${nome}"${peca.codigo ? ` (cód. ${peca.codigo})` : ''}.`;
  return `https://wa.me/5511947807036?text=${encodeURIComponent(txt)}`;
}

export default async function PecasCategoriaPage({ params }: Props) {
  const { categoria } = await params;
  const cat = getCategoria(categoria);
  if (!cat) notFound();

  const db = getDb();
  const pecas = db
    .prepare('SELECT * FROM pecas WHERE categoria=? AND ativo=1 ORDER BY destaque DESC, id DESC')
    .all(categoria) as Peca[];

  return (
    <>
      {/* Banner */}
      <section className={parentStyles.pageBanner}>
        <div className={parentStyles.bannerStripe} />
        <div className={parentStyles.bannerStripe2} />
        <div className={parentStyles.bannerInner}>
          <div className={parentStyles.breadcrumb}>
            <Link href="/">Home</Link>
            <span className={parentStyles.breadcrumbSep}>/</span>
            <Link href="/pecas">Peças</Link>
            <span className={parentStyles.breadcrumbSep}>/</span>
            {cat.label}
          </div>
          <h1 className={parentStyles.bannerTitle}>{cat.label.toUpperCase()}</h1>
          <p className={parentStyles.pageSub}>{cat.desc}</p>
        </div>
      </section>

      {/* Categorias chips (navegação entre categorias) */}
      <section className={styles.chipsBar}>
        <div className={styles.container}>
          <div className={styles.chipsWrap}>
            {PECAS_CATEGORIAS.filter((c) => c.slug !== 'outros').map((c) => (
              <Link
                key={c.slug}
                href={`/pecas/${c.slug}`}
                className={`${styles.chip} ${c.slug === cat.slug ? styles.chipActive : ''}`}
              >
                {c.label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Grid de peças */}
      <section className={styles.section}>
        <div className={styles.container}>
          {pecas.length === 0 ? (
            <div className={styles.empty}>
              <h2>Ainda não temos peças publicadas nesta categoria</h2>
              <p>Consulte disponibilidade direto pelo WhatsApp — temos estoque que não está no site.</p>
              <a
                href={`https://wa.me/5511947807036?text=${encodeURIComponent(`Olá! Gostaria de consultar peças de ${cat.label}.`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.btnWa}
              >
                Falar no WhatsApp
              </a>
            </div>
          ) : (
            <div className={styles.grid}>
              {pecas.map((p) => (
                <a
                  key={p.id}
                  href={waLink(p)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.card}
                >
                  <div className={styles.cardImg}>
                    {p.imagem ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.imagem} alt={p.nome} />
                    ) : (
                      <div className={styles.cardImgPlaceholder}>
                        <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
                          <rect x="3" y="3" width="18" height="18" rx="2" stroke="#ccc" strokeWidth="2" />
                          <circle cx="8.5" cy="8.5" r="1.5" fill="#ccc" />
                          <polyline points="21 15 16 10 5 21" stroke="#ccc" strokeWidth="2" />
                        </svg>
                      </div>
                    )}
                    {p.destaque ? <span className={styles.destaqueTag}>Destaque</span> : null}
                  </div>
                  <div className={styles.cardBody}>
                    <h3 className={styles.cardName}>{p.nome}</h3>
                    {(p.marca_moto || p.modelo_compat) && (
                      <p className={styles.cardCompat}>
                        {[p.marca_moto, p.modelo_compat].filter(Boolean).join(' · ')}
                      </p>
                    )}
                    {p.preco ? (
                      <div className={styles.cardPriceRow}>
                        {p.preco_original && p.preco_original > p.preco ? (
                          <span className={styles.cardPriceOld}>{fmtBRL(p.preco_original)}</span>
                        ) : null}
                        <span className={styles.cardPrice}>{fmtBRL(p.preco)}</span>
                      </div>
                    ) : (
                      <span className={styles.cardConsult}>Consultar valor</span>
                    )}
                    <span className={styles.cardCta}>
                      Pedir no WhatsApp
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                        <path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </span>
                  </div>
                </a>
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
