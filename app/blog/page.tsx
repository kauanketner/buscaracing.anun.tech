import type { Metadata } from 'next';
import Link from 'next/link';
import getDb from '@/lib/db';
import BlogCard from '@/components/BlogCard';
import styles from './page.module.css';

export const metadata: Metadata = {
  title: 'Blog',
  description:
    'Dicas, novidades e comparativos de motos. Tudo sobre o mundo das duas rodas.',
  alternates: { canonical: 'https://buscaracing.com/blog' },
};

const CATEGORIES = ['Todas', 'Dicas', 'Novidades', 'Comparativos', 'Manutenção'];

interface Props {
  searchParams: Promise<{ categoria?: string }>;
}

export default async function BlogPage({ searchParams }: Props) {
  const { categoria } = await searchParams;
  const db = getDb();

  let posts: any[];
  if (categoria && categoria !== 'Todas') {
    posts = db
      .prepare(
        'SELECT id,titulo,slug,resumo,imagem_capa,categoria,tags,autor,created_at FROM posts WHERE publicado=1 AND categoria=? ORDER BY created_at DESC',
      )
      .all(categoria);
  } else {
    posts = db
      .prepare(
        'SELECT id,titulo,slug,resumo,imagem_capa,categoria,tags,autor,created_at FROM posts WHERE publicado=1 ORDER BY created_at DESC',
      )
      .all();
  }

  return (
    <main>
      {/* Banner */}
      <section className={styles.banner}>
        <div className={styles.bannerInner}>
          <h1 className={styles.bannerTitle}>BLOG</h1>
          <p className={styles.bannerSub}>
            Dicas, novidades e comparativos do mundo das duas rodas
          </p>
        </div>
      </section>

      {/* Filters */}
      <section className={styles.filters}>
        {CATEGORIES.map((cat) => {
          const active =
            cat === 'Todas'
              ? !categoria || categoria === 'Todas'
              : categoria === cat;
          return (
            <Link
              key={cat}
              href={cat === 'Todas' ? '/blog' : `/blog?categoria=${cat}`}
              className={`${styles.filterBtn} ${active ? styles.filterActive : ''}`}
            >
              {cat}
            </Link>
          );
        })}
      </section>

      {/* Grid */}
      {posts.length > 0 ? (
        <section className={styles.grid}>
          {posts.map((post: any) => (
            <BlogCard key={post.id} post={post} />
          ))}
        </section>
      ) : (
        <section className={styles.empty}>
          <svg
            width="64"
            height="64"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={styles.emptyIcon}
          >
            <path d="M4 19.5A2.5 2.5 0 016.5 17H20" />
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
            <line x1="8" y1="7" x2="16" y2="7" />
            <line x1="8" y1="11" x2="14" y2="11" />
          </svg>
          <p className={styles.emptyText}>Nenhum post publicado ainda</p>
        </section>
      )}
    </main>
  );
}
