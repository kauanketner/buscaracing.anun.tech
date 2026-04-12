import Link from 'next/link';
import Image from 'next/image';
import styles from './BlogCard.module.css';

interface BlogPost {
  slug: string;
  titulo: string;
  resumo?: string;
  imagem_capa?: string;
  categoria?: string;
  created_at?: string;
}

function formatDate(dateStr?: string) {
  if (!dateStr) return '';
  try {
    return new Date(dateStr).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

export default function BlogCard({ post }: { post: BlogPost }) {
  return (
    <Link href={`/blog/${post.slug}`} className={styles.card}>
      <div className={styles.cover}>
        {post.imagem_capa ? (
          <Image
            src={post.imagem_capa}
            alt={post.titulo}
            fill
            sizes="(max-width: 600px) 100vw, (max-width: 900px) 50vw, 33vw"
            className={styles.img}
          />
        ) : (
          <div className={styles.placeholder}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" opacity="0.2">
              <path d="M4 19.5A2.5 2.5 0 016.5 17H20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        )}
        {post.categoria && <span className={styles.category}>{post.categoria}</span>}
      </div>

      <div className={styles.body}>
        <h3 className={styles.title}>{post.titulo}</h3>
        {post.resumo && <p className={styles.excerpt}>{post.resumo}</p>}
        {post.created_at && <time className={styles.date}>{formatDate(post.created_at)}</time>}
      </div>
    </Link>
  );
}
