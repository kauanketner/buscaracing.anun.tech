import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getDb, stripAdminFields } from '@/lib/db';
import parentStyles from '../aluguel.module.css';
import styles from './aluguel-detalhe.module.css';
import ReservaForm from './ReservaForm';

export const dynamic = 'force-dynamic';

type Moto = {
  id: number;
  nome: string;
  marca: string;
  modelo?: string | null;
  ano?: number | null;
  km?: number | null;
  cor?: string | null;
  descricao?: string | null;
  imagem?: string | null;
  valor_diaria: number;
  disponivel_aluguel: number;
};

type Foto = {
  id: number;
  moto_id: number;
  filename: string;
  ordem: number;
};

type PageProps = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const db = getDb();
  const m = db
    .prepare('SELECT nome, marca FROM motos WHERE id=? AND disponivel_aluguel=1')
    .get(Number(id)) as { nome: string; marca: string } | undefined;
  if (!m) return { title: 'Moto não encontrada' };
  return {
    title: `Alugar ${m.nome} — Busca Racing`,
    description: `Reserve a ${m.marca} ${m.nome} para aluguel. Escolha suas datas e fale com a Busca Racing.`,
    alternates: { canonical: `https://buscaracing.com/aluguel/${id}` },
  };
}

export default async function AluguelDetalhePage({ params }: PageProps) {
  const { id } = await params;
  const db = getDb();

  const motoRow = db
    .prepare(
      `SELECT * FROM motos WHERE id=? AND disponivel_aluguel=1 AND valor_diaria IS NOT NULL`,
    )
    .get(Number(id)) as Record<string, unknown> | undefined;

  if (!motoRow) {
    notFound();
  }

  const moto = stripAdminFields(motoRow) as unknown as Moto;

  // Fotos ordered by ordem (same pattern as /api/motos/[id]/fotos)
  const fotosRows = db
    .prepare('SELECT * FROM fotos WHERE moto_id=? ORDER BY ordem ASC, id ASC')
    .all(Number(id)) as Array<Record<string, unknown>>;
  const fotos = fotosRows.map((r) => ({
    ...r,
    url: `/fotos/${r.filename}`,
  })) as unknown as Array<Foto & { url: string }>;

  // Build image list: main image first, then any distinct gallery photos
  const images: { src: string; alt: string }[] = [];
  if (moto.imagem) {
    images.push({ src: moto.imagem, alt: moto.nome });
  }
  for (const f of fotos) {
    const src = f.filename.startsWith('/') ? f.filename : `/fotos/${f.filename}`;
    if (!images.some((i) => i.src === src)) {
      images.push({ src, alt: `${moto.nome} - foto ${images.length + 1}` });
    }
  }

  // Caução padrão
  const caucaoRow = db
    .prepare("SELECT valor FROM configuracoes WHERE chave='aluguel_caucao_padrao'")
    .get() as { valor: string } | undefined;
  const valorCaucao = caucaoRow ? Number(caucaoRow.valor) || 0 : 0;

  // Datas bloqueadas (reservas aprovadas/ativas — expandidas para dias individuais)
  const reservas = db
    .prepare(
      "SELECT data_inicio, data_fim FROM alugueis WHERE moto_id=? AND status IN ('aprovada','ativa')",
    )
    .all(Number(id)) as { data_inicio: string; data_fim: string }[];
  const bloqSet = new Set<string>();
  for (const r of reservas) {
    const s = new Date(r.data_inicio + 'T12:00:00');
    const e = new Date(r.data_fim + 'T12:00:00');
    const cur = new Date(s);
    while (cur <= e) {
      bloqSet.add(cur.toISOString().slice(0, 10));
      cur.setDate(cur.getDate() + 1);
    }
  }
  const bloqueadas = Array.from(bloqSet).sort();

  const valorDiaria = Number(moto.valor_diaria);

  return (
    <>
      {/* Banner reutilizando estilos do pai */}
      <section className={parentStyles.banner}>
        <div className={parentStyles.bannerInner}>
          <div className={parentStyles.breadcrumb}>
            <Link href="/">Home</Link>
            <span className={parentStyles.sep}>/</span>
            <Link href="/aluguel">Aluguel</Link>
            <span className={parentStyles.sep}>/</span>
            {moto.nome}
          </div>
          <h1 className={parentStyles.title}>
            {moto.marca} <span className={parentStyles.titleEm}>{moto.nome}</span>
          </h1>
          <p className={parentStyles.sub}>
            {moto.ano ? `${moto.ano} · ` : ''}Reserve já — escolha as datas e pague só pelos dias que usar.
          </p>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.container}>
          <div className={styles.grid}>
            {/* Galeria */}
            <div className={styles.gallery}>
              {images.length > 0 ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={images[0].src}
                    alt={images[0].alt}
                    className={styles.heroImg}
                  />
                  {images.length > 1 && (
                    <div className={styles.fotos}>
                      {images.slice(1).map((img, idx) => (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          key={idx}
                          src={img.src}
                          alt={img.alt}
                          className={styles.thumb}
                        />
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div className={styles.heroImg} aria-hidden="true" />
              )}

              {moto.descricao && (
                <div className={styles.descricao}>
                  <h2 className={styles.descricaoTitle}>Sobre a moto</h2>
                  <p>{moto.descricao}</p>
                </div>
              )}

              <div className={styles.specs}>
                <div className={styles.specItem}>
                  <span className={styles.specLabel}>Marca</span>
                  <span className={styles.specVal}>{moto.marca}</span>
                </div>
                {moto.ano && (
                  <div className={styles.specItem}>
                    <span className={styles.specLabel}>Ano</span>
                    <span className={styles.specVal}>{moto.ano}</span>
                  </div>
                )}
                {moto.modelo && (
                  <div className={styles.specItem}>
                    <span className={styles.specLabel}>Modelo</span>
                    <span className={styles.specVal}>{moto.modelo}</span>
                  </div>
                )}
                {moto.cor && (
                  <div className={styles.specItem}>
                    <span className={styles.specLabel}>Cor</span>
                    <span className={styles.specVal}>{moto.cor}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Sidebar: preço + formulário */}
            <aside className={styles.sidebar}>
              <div className={styles.priceCard}>
                <div className={styles.priceLabel}>Diária a partir de</div>
                <div className={styles.priceValueRow}>
                  <span className={styles.priceValue}>
                    R$ {valorDiaria.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                  <span className={styles.priceUnit}>/dia</span>
                </div>
                {valorCaucao > 0 && (
                  <div className={styles.caucaoInfo}>
                    Caução: R$ {valorCaucao.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    {' '}(devolvido após a devolução da moto).
                  </div>
                )}
              </div>

              <ReservaForm
                motoId={moto.id}
                valorDiaria={valorDiaria}
                valorCaucao={valorCaucao}
                bloqueadas={bloqueadas}
              />
            </aside>
          </div>
        </div>
      </section>
    </>
  );
}
