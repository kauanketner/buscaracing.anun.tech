import type { Metadata } from 'next';
import Link from 'next/link';
import styles from './acessorios.module.css';

export const metadata: Metadata = {
  title: 'Acessórios',
  description:
    'Acessórios para motos: capacetes, luvas, jaquetas, bags, protetores e muito mais. Busca Racing em Franco da Rocha - SP.',
  alternates: { canonical: 'https://buscaracing.com/acessorios' },
};

const ACESSORIOS = [
  {
    name: 'Capacetes',
    desc: 'Capacetes abertos, fechados e articulados das melhores marcas.',
    icon: (
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.5">
        <path d="M12 2C6.48 2 2 6.48 2 12c0 1.5.33 2.92.92 4.2L2 22h20l-.92-5.8c.59-1.28.92-2.7.92-4.2 0-5.52-4.48-10-10-10z" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M7 14h10" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    name: 'Luvas',
    desc: 'Luvas para estrada e trilha com proteção e conforto.',
    icon: (
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.5">
        <path d="M18 11V6a2 2 0 00-4 0v1M14 7V4a2 2 0 00-4 0v6M10 6V4a2 2 0 00-4 0v8l-1.25 2.5A2 2 0 006.54 17H10a5 5 0 005-5V7a2 2 0 00-4 0" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    name: 'Jaquetas e Botas',
    desc: 'Proteção completa para pilotar com segurança e estilo.',
    icon: (
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.5">
        <path d="M16 3l4 4v10a2 2 0 01-2 2H6a2 2 0 01-2-2V7l4-4h8z" strokeLinejoin="round" />
        <path d="M8 3v4h8V3" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    name: 'Bags e Baús',
    desc: 'Alforjes, baús, bolsas de tanque e mochilas impermeáveis.',
    icon: (
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.5">
        <rect x="2" y="7" width="20" height="14" rx="2" />
        <path d="M16 7V5a4 4 0 00-8 0v2" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    name: 'Protetores e Sliders',
    desc: 'Protetores de motor, quadro, sliders e crashpads.',
    icon: (
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.5">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    name: 'Escapamentos',
    desc: 'Ponteiras e sistemas de escape esportivos e originais.',
    icon: (
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.5">
        <path d="M4 14h4l3-8h6l3 8h4" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="4" cy="14" r="1" />
        <circle cx="20" cy="14" r="1" />
      </svg>
    ),
  },
];

export default function AcessoriosPage() {
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
            Acessórios
          </div>
          <h1 className={styles.bannerTitle}>
            ACESSÓRIOS <span className={styles.bannerTitleEm}>PARA MOTOS</span>
          </h1>
          <p className={styles.pageSub}>
            Equipe-se com os melhores acessórios para pilotar com segurança e estilo.
          </p>
        </div>
      </section>

      {/* Grid */}
      <section className={styles.section}>
        <div className={styles.container}>
          <div className={styles.sectionLabel}>Categorias</div>
          <h2 className={styles.sectionTitle}>Tudo para você e sua moto</h2>

          <div className={styles.pecasGrid}>
            {ACESSORIOS.map((a) => (
              <div key={a.name} className={styles.pecaCard}>
                <div className={styles.pecaIconWrap}>{a.icon}</div>
                <div className={styles.pecaBody}>
                  <h3 className={styles.pecaName}>{a.name}</h3>
                  <p className={styles.pecaDesc}>{a.desc}</p>
                  <span className={styles.pecaCta}>
                    Ver opções
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                      <path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className={styles.ctaStrip}>
        <h2>Quer saber mais?</h2>
        <p>Consulte disponibilidade e preços pelo nosso WhatsApp.</p>
        <a
          href="https://wa.me/5511947807036?text=Olá!%20Gostaria%20de%20ver%20acessórios%20para%20minha%20moto."
          target="_blank"
          rel="noopener noreferrer"
          className={styles.btnWa}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
          </svg>
          Consultar pelo WhatsApp
        </a>
      </section>
    </>
  );
}
