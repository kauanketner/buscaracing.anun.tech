import Link from 'next/link';
import Image from 'next/image';
import styles from './MotoCard.module.css';

interface Moto {
  id: number | string;
  nome: string;
  marca?: string;
  preco?: number;
  preco_original?: number;
  categoria?: string;
  condicao?: string;
  imagem?: string;
  descricao?: string;
  ano?: number | string;
  km?: number;
  destaque?: boolean | number;
}

const CATS: Record<string, string> = {
  'motos-rua': 'Motos de Rua',
  offroad: 'Offroad',
  quadriciclos: 'Quadriciclos',
  infantil: 'Infantil',
};

function formatPrice(value?: number) {
  if (!value) return 'Consulte';
  return `R$ ${Number(value).toLocaleString('pt-BR')}`;
}

export default function MotoCard({ moto }: { moto: Moto }) {
  const catLabel = CATS[moto.categoria || ''] || moto.categoria || '';
  const specs = [moto.ano, moto.km != null && moto.km >= 0 ? `${Number(moto.km).toLocaleString('pt-BR')} km` : null]
    .filter(Boolean)
    .join(' \u00b7 ');

  return (
    <Link href={`/moto/${moto.id}`} className={styles.card}>
      <div className={styles.cardImg}>
        {moto.imagem ? (
          <Image
            src={moto.imagem}
            alt={moto.nome}
            fill
            sizes="(max-width: 600px) 100vw, (max-width: 900px) 50vw, 33vw"
            className={styles.img}
          />
        ) : (
          <div className={styles.placeholder}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" opacity="0.2">
              <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.5" />
              <circle cx="8.5" cy="8.5" r="1.5" stroke="currentColor" strokeWidth="1.5" />
              <path d="M21 15l-5-5L5 21" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        )}
        <div className={styles.badges}>
          {moto.destaque ? <span className={`${styles.badge} ${styles.badgeDest}`}>&#11088; Destaque</span> : null}
          <span className={`${styles.badge} ${moto.condicao === 'nova' ? styles.badgeNova : styles.badgeUsada}`}>
            {moto.condicao === 'nova' ? 'Nova' : 'Usada'}
          </span>
        </div>
        {catLabel && <span className={styles.cardCat}>{catLabel}</span>}
      </div>

      <div className={styles.cardBody}>
        {moto.marca && <div className={styles.brand}>{moto.marca}</div>}
        <h3 className={styles.name}>{moto.nome}</h3>
        {specs && <div className={styles.specs}>{specs}</div>}
        {moto.descricao && <p className={styles.desc}>{moto.descricao}</p>}
        <div className={styles.cardFooter}>
          <div className={styles.price}>
            <small>A partir de</small>
            {moto.preco_original ? (
              <span className={styles.original}>{formatPrice(moto.preco_original)}</span>
            ) : null}
            {formatPrice(moto.preco)}
          </div>
          <span className={styles.cta}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
              <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Ver detalhes
          </span>
        </div>
      </div>
    </Link>
  );
}
