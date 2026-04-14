import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import getDb from '@/lib/db';
import JsonLd, { blogPostSchema } from '@/components/JsonLd';
import BlogCard from '@/components/BlogCard';
import styles from './page.module.css';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const db = getDb();
  const post = db
    .prepare('SELECT titulo, resumo, imagem_capa, meta_title, meta_desc, created_at, updated_at FROM posts WHERE slug=? AND publicado=1')
    .get(slug) as any;

  if (!post) return { title: 'Post não encontrado' };

  return {
    title: post.meta_title || post.titulo,
    description: post.meta_desc || post.resumo || '',
    alternates: { canonical: `https://buscaracing.com/blog/${slug}` },
    openGraph: {
      type: 'article',
      title: post.meta_title || post.titulo,
      description: post.meta_desc || post.resumo || '',
      url: `https://buscaracing.com/blog/${slug}`,
      images: post.imagem_capa ? [post.imagem_capa] : undefined,
      publishedTime: post.created_at || undefined,
      modifiedTime: post.updated_at || post.created_at || undefined,
    },
  };
}

function formatDate(dateStr?: string) {
  if (!dateStr) return '';
  try {
    return new Date(dateStr).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const db = getDb();

  const post = db
    .prepare('SELECT * FROM posts WHERE slug=? AND publicado=1')
    .get(slug) as any;

  if (!post) notFound();

  const related = db
    .prepare(
      'SELECT id,titulo,slug,resumo,imagem_capa,categoria,created_at FROM posts WHERE publicado=1 AND categoria=? AND id!=? ORDER BY created_at DESC LIMIT 3',
    )
    .all(post.categoria, post.id) as any[];

  const shareUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(
    `${post.titulo} - https://buscaracing.com/blog/${post.slug}`,
  )}`;

  return (
    <main>
      <JsonLd data={blogPostSchema(post)} />

      {/* Hero */}
      <section className={styles.hero}>
        {post.imagem_capa && (
          <Image
            src={post.imagem_capa}
            alt={post.titulo}
            fill
            priority
            sizes="100vw"
            className={styles.heroImg}
          />
        )}
        <div className={styles.heroOverlay} />
        <div className={styles.heroContent}>
          {post.categoria && (
            <span className={styles.badge}>{post.categoria}</span>
          )}
          <h1 className={styles.heroTitle}>{post.titulo}</h1>
        </div>
      </section>

      {/* Meta bar */}
      <div className={styles.metaBar}>
        <span className={styles.metaItem}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
          {post.autor || 'Busca Racing'}
        </span>
        <span className={styles.metaItem}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          {formatDate(post.created_at)}
        </span>
        <a href={shareUrl} target="_blank" rel="noopener noreferrer" className={styles.share}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
          </svg>
          Compartilhar
        </a>
      </div>

      {/* Article content */}
      <article className={styles.article}>
        <div
          className={styles.content}
          dangerouslySetInnerHTML={{ __html: post.conteudo }}
        />
      </article>

      {/* Related posts */}
      {related.length > 0 && (
        <section className={styles.related}>
          <h2 className={styles.relatedTitle}>Posts Relacionados</h2>
          <div className={styles.relatedGrid}>
            {related.map((r: any) => (
              <BlogCard key={r.id} post={r} />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
