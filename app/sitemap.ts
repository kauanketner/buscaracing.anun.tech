import { MetadataRoute } from 'next';
import getDb from '@/lib/db';

export default function sitemap(): MetadataRoute.Sitemap {
  const db = getDb();
  const baseUrl = 'https://buscaracing.com';

  const staticPages = [
    { url: baseUrl, lastModified: new Date(), changeFrequency: 'weekly' as const, priority: 1 },
    { url: `${baseUrl}/produtos`, lastModified: new Date(), changeFrequency: 'daily' as const, priority: 0.9 },
    { url: `${baseUrl}/pecas`, lastModified: new Date(), changeFrequency: 'weekly' as const, priority: 0.7 },
    { url: `${baseUrl}/acessorios`, lastModified: new Date(), changeFrequency: 'weekly' as const, priority: 0.7 },
    { url: `${baseUrl}/contato`, lastModified: new Date(), changeFrequency: 'monthly' as const, priority: 0.6 },
    { url: `${baseUrl}/venda-sua-moto`, lastModified: new Date(), changeFrequency: 'monthly' as const, priority: 0.6 },
    { url: `${baseUrl}/blog`, lastModified: new Date(), changeFrequency: 'daily' as const, priority: 0.8 },
  ];

  const motos = db.prepare('SELECT id, created_at FROM motos WHERE ativo=1').all() as any[];
  const motoPages = motos.map((m) => ({
    url: `${baseUrl}/moto/${m.id}`,
    lastModified: new Date(m.created_at),
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }));

  const posts = db.prepare('SELECT slug, updated_at, created_at FROM posts WHERE publicado=1').all() as any[];
  const blogPages = posts.map((p) => ({
    url: `${baseUrl}/blog/${p.slug}`,
    lastModified: new Date(p.updated_at || p.created_at),
    changeFrequency: 'monthly' as const,
    priority: 0.7,
  }));

  return [...staticPages, ...motoPages, ...blogPages];
}
