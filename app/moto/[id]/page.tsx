import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getDb } from '@/lib/db';
import JsonLd, { productSchema } from '@/components/JsonLd';
import MotoGallery from './MotoGallery';
import styles from './page.module.css';

interface Moto {
  id: number;
  nome: string;
  marca: string;
  categoria: string;
  condicao: string;
  preco: number | null;
  preco_original: number | null;
  ano: number | null;
  km: number | null;
  descricao: string;
  imagem: string | null;
  destaque: number;
}

interface Foto {
  id: number;
  moto_id: number;
  filename: string;
  ordem: number;
}

const CATS: Record<string, string> = {
  'motos-rua': 'Motos de Rua',
  offroad: 'Offroad',
  quadriciclos: 'Quadriciclos',
  infantil: 'Infantil',
};

function formatPrice(value: number | null) {
  if (!value) return null;
  return `R$ ${Number(value).toLocaleString('pt-BR')}`;
}

type PageProps = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const db = getDb();
  const moto = db.prepare('SELECT * FROM motos WHERE id=?').get(id) as Moto | undefined;

  if (!moto) {
    return { title: 'Moto não encontrada' };
  }

  const desc = moto.descricao
    ? moto.descricao.slice(0, 155)
    : `${moto.nome} ${moto.marca} disponível na Busca Racing em Franco da Rocha - SP.`;

  return {
    title: `${moto.nome} ${moto.marca}`,
    description: desc,
    openGraph: {
      title: `${moto.nome} ${moto.marca} | Busca Racing`,
      description: desc,
      images: moto.imagem ? [{ url: moto.imagem }] : undefined,
    },
  };
}

export default async function MotoDetailPage({ params }: PageProps) {
  const { id } = await params;
  const db = getDb();
  const moto = db.prepare('SELECT * FROM motos WHERE id=?').get(id) as Moto | undefined;

  if (!moto) {
    notFound();
  }

  const fotos = db.prepare('SELECT * FROM fotos WHERE moto_id=? ORDER BY ordem').all(moto.id) as Foto[];

  const catLabel = CATS[moto.categoria] || moto.categoria || '';
  const waMsg = encodeURIComponent(
    `Olá! Vi a moto ${moto.nome} (${moto.marca}) no site e tenho interesse. Podemos conversar?`,
  );
  const waLink = `https://wa.me/5511947807036?text=${waMsg}`;

  return (
    <>
      <JsonLd data={productSchema({
        ...moto,
        preco: moto.preco ?? undefined,
        preco_original: moto.preco_original ?? undefined,
        imagem: moto.imagem ?? undefined,
      })} />

      {/* Breadcrumb */}
      <div className={styles.breadcrumb}>
        <Link href="/">Home</Link>
        <span className={styles.breadcrumbSep}>/</span>
        <Link href="/produtos">Estoque</Link>
        <span className={styles.breadcrumbSep}>/</span>
        <span className={styles.breadcrumbCurrent}>{moto.nome}</span>
      </div>

      {/* Detail */}
      <div className={styles.container}>
        <div className={styles.detailWrap}>
          {/* Gallery */}
          <MotoGallery
            mainImage={moto.imagem || undefined}
            fotos={fotos}
            nome={moto.nome}
          />

          {/* Info */}
          <div>
            {/* Badges */}
            <div className={styles.badgesRow}>
              {moto.destaque ? (
                <span className={`${styles.badge} ${styles.badgeDest}`}>Destaque</span>
              ) : null}
              <span
                className={`${styles.badge} ${
                  moto.condicao === 'nova' ? styles.badgeNova : styles.badgeUsada
                }`}
              >
                {moto.condicao === 'nova' ? 'Nova' : 'Usada'}
              </span>
              {catLabel && <span className={`${styles.badge} ${styles.badgeCat}`}>{catLabel}</span>}
            </div>

            {/* Title */}
            <div className={styles.motoMarca}>{moto.marca}</div>
            <h1 className={styles.motoNome}>{moto.nome}</h1>

            {/* Price */}
            <div className={styles.priceBlock}>
              {moto.preco_original ? (
                <div className={styles.priceOriginal}>{formatPrice(moto.preco_original)}</div>
              ) : null}
              {moto.preco ? (
                <div className={styles.priceMain}>{formatPrice(moto.preco)}</div>
              ) : (
                <div className={styles.priceConsult}>Consulte-nos</div>
              )}
            </div>

            {/* Specs */}
            <div className={styles.specsGrid}>
              <div className={styles.specItem}>
                <span className={styles.specLabel}>Marca</span>
                <span className={styles.specVal}>{moto.marca}</span>
              </div>
              <div className={styles.specItem}>
                <span className={styles.specLabel}>Categoria</span>
                <span className={styles.specVal}>{catLabel || moto.categoria}</span>
              </div>
              {moto.ano && (
                <div className={styles.specItem}>
                  <span className={styles.specLabel}>Ano</span>
                  <span className={styles.specVal}>{moto.ano}</span>
                </div>
              )}
              {moto.km != null && moto.km >= 0 && (
                <div className={styles.specItem}>
                  <span className={styles.specLabel}>KM</span>
                  <span className={styles.specVal}>
                    {Number(moto.km).toLocaleString('pt-BR')} km
                  </span>
                </div>
              )}
              <div className={styles.specItem}>
                <span className={styles.specLabel}>Condição</span>
                <span className={styles.specVal}>
                  {moto.condicao === 'nova' ? 'Nova' : 'Usada'}
                </span>
              </div>
            </div>

            {/* Description */}
            {moto.descricao && (
              <div className={styles.descricaoSection}>
                <h3>Descrição</h3>
                <p>{moto.descricao}</p>
              </div>
            )}

            {/* CTA */}
            <div className={styles.ctaBlock}>
              <a href={waLink} target="_blank" rel="noopener noreferrer" className={styles.btnWa}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
                Tenho interesse
              </a>
              <Link href="/produtos" className={styles.btnBack}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Voltar ao estoque
              </Link>
              <div className={styles.contactInfo}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6A19.79 19.79 0 012.12 4.18 2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" stroke="currentColor" strokeWidth="1.5" />
                </svg>
                (11) 94780-7036
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
