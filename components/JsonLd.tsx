/* eslint-disable @typescript-eslint/no-explicit-any */

interface JsonLdProps {
  data: Record<string, any>;
}

export default function JsonLd({ data }: JsonLdProps) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

export function localBusinessSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: 'Busca Racing',
    description:
      'Loja de motos multi marcas em Franco da Rocha – SP. Motos de rua, offroad, quadriciclos e bikes infantis.',
    url: 'https://buscaracing.com',
    telephone: '+5511947807036',
    email: 'contato@buscaracing.com',
    address: {
      '@type': 'PostalAddress',
      streetAddress: 'Av. Villa Verde, 1212 - Vila Verde',
      addressLocality: 'Franco da Rocha',
      addressRegion: 'SP',
      postalCode: '07813-000',
      addressCountry: 'BR',
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: -23.3217,
      longitude: -46.7286,
    },
    openingHoursSpecification: [
      {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
        opens: '08:00',
        closes: '18:00',
      },
      {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: 'Saturday',
        opens: '08:00',
        closes: '13:00',
      },
    ],
    image: 'https://buscaracing.com/logo.png',
    priceRange: '$$',
  };
}

interface MotoData {
  nome: string;
  marca?: string;
  preco?: number;
  preco_original?: number;
  condicao?: string;
  imagem?: string;
  descricao?: string;
}

export function productSchema(moto: MotoData) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: moto.nome,
    brand: moto.marca
      ? { '@type': 'Brand', name: moto.marca }
      : undefined,
    description: moto.descricao || `${moto.nome} disponível na Busca Racing`,
    image: moto.imagem || undefined,
    offers: {
      '@type': 'Offer',
      price: moto.preco || 0,
      priceCurrency: 'BRL',
      availability: 'https://schema.org/InStock',
      itemCondition:
        moto.condicao === 'usada'
          ? 'https://schema.org/UsedCondition'
          : 'https://schema.org/NewCondition',
      seller: {
        '@type': 'Organization',
        name: 'Busca Racing',
      },
    },
  };
}

interface BlogPostData {
  titulo: string;
  resumo?: string;
  imagem_capa?: string;
  slug: string;
  created_at?: string;
  updated_at?: string;
  autor?: string;
}

export function blogPostSchema(post: BlogPostData) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.titulo,
    description: post.resumo || '',
    image: post.imagem_capa || undefined,
    url: `https://buscaracing.com/blog/${post.slug}`,
    datePublished: post.created_at || new Date().toISOString(),
    dateModified: post.updated_at || post.created_at || new Date().toISOString(),
    author: {
      '@type': 'Organization',
      name: post.autor || 'Busca Racing',
    },
    publisher: {
      '@type': 'Organization',
      name: 'Busca Racing',
      url: 'https://buscaracing.com',
    },
  };
}
