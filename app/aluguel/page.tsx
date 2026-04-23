import type { Metadata } from 'next';
import Link from 'next/link';
import { getDb, stripAdminFields } from '@/lib/db';
import styles from './aluguel.module.css';

export const metadata: Metadata = {
  title: 'Aluguel de Motos — Busca Racing',
  description: 'Alugue motos para suas aventuras ou uso diário. Escolha suas datas, pague só pelos dias que usar. Busca Racing — Franco da Rocha SP.',
  alternates: { canonical: 'https://buscaracing.com/aluguel' },
};

export const dynamic = 'force-dynamic';

type Moto = {
  id: number;
  nome: string;
  marca: string;
  modelo?: string | null;
  ano?: number | null;
  imagem?: string | null;
  valor_diaria: number;
};

export default async function AluguelPage() {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT * FROM motos WHERE disponivel_aluguel=1 AND valor_diaria IS NOT NULL
       AND estado NOT IN ('entregue','retirada')
       ORDER BY destaque DESC, id DESC`,
    )
    .all() as Record<string, unknown>[];
  const motos = rows.map((r) => stripAdminFields(r)) as unknown as Moto[];

  return (
    <>
      <section className={styles.banner}>
        <div className={styles.bannerInner}>
          <div className={styles.breadcrumb}>
            <Link href="/">Home</Link> <span className={styles.sep}>/</span> Aluguel
          </div>
          <h1 className={styles.title}>
            ALUGUE SUA <span className={styles.titleEm}>MOTO</span>
          </h1>
          <p className={styles.sub}>
            Motos disponíveis para locação — escolha as datas e pague só pelos dias que usar.
          </p>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.container}>
          {motos.length === 0 ? (
            <div className={styles.empty}>
              <h2>Nenhuma moto disponível para aluguel no momento</h2>
              <p>Fale com a gente pelo WhatsApp e avisaremos assim que tiver disponibilidade.</p>
              <a href="https://wa.me/5511947807036?text=Quero%20alugar%20uma%20moto"
                 className={styles.btnWa} target="_blank" rel="noopener noreferrer">
                Falar no WhatsApp
              </a>
            </div>
          ) : (
            <div className={styles.grid}>
              {motos.map((m) => (
                <Link key={m.id} href={`/aluguel/${m.id}`} className={styles.card}>
                  <div className={styles.cardImg}>
                    {m.imagem ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={m.imagem} alt={m.nome} />
                    ) : (
                      <div className={styles.cardImgPh}>
                        <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
                          <rect x="3" y="3" width="18" height="18" rx="2" stroke="#ccc" strokeWidth="2" />
                        </svg>
                      </div>
                    )}
                  </div>
                  <div className={styles.cardBody}>
                    <h3 className={styles.cardName}>{m.nome}</h3>
                    <p className={styles.cardSub}>
                      {m.marca}{m.ano ? ` · ${m.ano}` : ''}
                    </p>
                    <div className={styles.priceRow}>
                      <span className={styles.price}>
                        R$ {Number(m.valor_diaria).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                      <span className={styles.priceUnit}>/dia</span>
                    </div>
                    <span className={styles.cardCta}>
                      Ver detalhes e reservar
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                        <path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
