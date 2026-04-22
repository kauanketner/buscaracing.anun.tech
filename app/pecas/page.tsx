import type { Metadata } from 'next';
import Link from 'next/link';
import styles from './pecas.module.css';

export const metadata: Metadata = {
  title: 'Peças',
  description:
    'Peças originais e de reposição para motos de rua, offroad, quadriciclos e infantil. Busca Racing em Franco da Rocha - SP.',
  alternates: { canonical: 'https://buscaracing.com/pecas' },
};

const PECAS = [
  {
    slug: 'motor',
    name: 'Motor e Transmissão',
    desc: 'Pistões, anéis, juntas, correntes, kit relação, embreagem e mais.',
    icon: (
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.5">
        <circle cx="12" cy="12" r="3" />
        <path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    slug: 'freios',
    name: 'Freios',
    desc: 'Pastilhas, discos, manetes, cabos e fluidos de freio para todas as motos.',
    icon: (
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.5">
        <circle cx="12" cy="12" r="10" />
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v4M12 18v4" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    slug: 'suspensao',
    name: 'Suspensão',
    desc: 'Amortecedores, molas, bengalas, retentores e kits de reparo.',
    icon: (
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.5">
        <path d="M12 2v20M8 6l4-4 4 4M8 18l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    slug: 'eletrica',
    name: 'Elétrica',
    desc: 'Baterias, velas, CDI, reguladores, chicotes e lâmpadas.',
    icon: (
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.5">
        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    slug: 'carenagem',
    name: 'Carenagem e Plásticos',
    desc: 'Carenagens, para-lamas, laterais e peças plásticas originais e alternativas.',
    icon: (
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.5">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path d="M3 9h18M9 3v18" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    slug: 'pneus-rodas',
    name: 'Pneus e Rodas',
    desc: 'Pneus de rua, trilha e misto. Câmaras, aros e cubos completos.',
    icon: (
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.5">
        <circle cx="12" cy="12" r="10" />
        <circle cx="12" cy="12" r="6" />
        <circle cx="12" cy="12" r="2" />
      </svg>
    ),
  },
];

export default function PecasPage() {
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
            Peças
          </div>
          <h1 className={styles.bannerTitle}>
            PEÇAS <span className={styles.bannerTitleEm}>ORIGINAIS</span>
          </h1>
          <p className={styles.pageSub}>
            Trabalhamos com peças originais e de reposição para todas as marcas e modelos.
          </p>
        </div>
      </section>

      {/* Grid */}
      <section className={styles.section}>
        <div className={styles.container}>
          <div className={styles.sectionLabel}>Categorias</div>
          <h2 className={styles.sectionTitle}>Encontre a peça que você precisa</h2>

          <div className={styles.pecasGrid}>
            {PECAS.map((p) => (
              <Link key={p.name} href={`/pecas/${p.slug}`} className={styles.pecaCard}>
                <div className={styles.pecaIconWrap}>{p.icon}</div>
                <div className={styles.pecaBody}>
                  <h3 className={styles.pecaName}>{p.name}</h3>
                  <p className={styles.pecaDesc}>{p.desc}</p>
                  <span className={styles.pecaCta}>
                    Ver peças
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                      <path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                </div>
              </Link>
            ))}
          </div>

          {/* Info Banner */}
          <div className={styles.infoBanner}>
            <div>
              <h3>Não encontrou a peça?</h3>
              <p>
                Entre em contato pelo WhatsApp e nossa equipe vai te ajudar a encontrar
                a peça certa para sua moto.
              </p>
            </div>
            <ul className={styles.infoList}>
              <li>Peças originais e alternativas</li>
              <li>Todas as marcas e modelos</li>
              <li>Entrega para todo o Brasil</li>
              <li>Preço competitivo</li>
            </ul>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className={styles.ctaStrip}>
        <h2>Precisa de uma peça?</h2>
        <p>Fale com a gente pelo WhatsApp e faça seu pedido agora mesmo.</p>
        <a
          href="https://wa.me/5511947807036?text=Olá!%20Gostaria%20de%20consultar%20peças%20para%20minha%20moto."
          target="_blank"
          rel="noopener noreferrer"
          className={styles.btnWa}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
          </svg>
          Pedir pelo WhatsApp
        </a>
      </section>
    </>
  );
}
