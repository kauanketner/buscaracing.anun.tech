import Link from 'next/link';
import { getDb, initDb } from '@/lib/db';
import MotoCard from '@/components/MotoCard';
import styles from './page.module.css';

export const dynamic = 'force-dynamic';

const BRANDS = [
  'Honda', 'Yamaha', 'Kawasaki', 'Suzuki', 'KTM', 'BMW',
  'Ducati', 'Triumph', 'Harley-Davidson', 'MXF', 'Shineray',
  'Kasinski', 'Royal Enfield', 'Husqvarna',
];

interface Moto {
  id: number;
  nome: string;
  marca?: string;
  preco?: number;
  preco_original?: number;
  categoria?: string;
  condicao?: string;
  imagem?: string;
  descricao?: string;
  ano?: number;
  km?: number;
  destaque?: number;
}

export default function Home() {
  initDb();
  const db = getDb();

  const destaques = db
    .prepare('SELECT * FROM motos WHERE ativo=1 AND destaque=1 ORDER BY id DESC LIMIT 8')
    .all() as Moto[];

  const totalMotos = (
    db.prepare('SELECT COUNT(*) as c FROM motos WHERE ativo=1').get() as { c: number }
  ).c;

  return (
    <>
      {/* HERO */}
      <section className={styles.hero}>
        <div className={styles.heroLines}>
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className={styles.sLine}
              style={{
                top: `${15 + i * 14}%`,
                width: `${250 + i * 80}px`,
                ['--dur' as string]: `${2.5 + i * 0.7}s`,
                ['--delay' as string]: `${i * 0.5}s`,
              }}
            />
          ))}
        </div>
        <div className={styles.heroStripeA} />
        <div className={styles.heroStripeB} />
        <div className={styles.heroGlow} />

        <div className={styles.heroContent}>
          <div className={styles.heroEyebrow}>Multi Marcas &middot; Desde 2020</div>
          <h1 className={styles.heroTitle}>
            VELOCIDADE<span className={styles.heroTitleAccent}>SEM LIMITES</span>
          </h1>
          <p className={styles.heroSub}>
            Motos de rua, offroad, quadriciclos e bikes infantis. As melhores marcas em um
            {'\u00a0'}lugar em Franco da Rocha – SP.
          </p>
          <div className={styles.heroCtas}>
            <Link href="/produtos" className="btn btn-red">
              Ver Estoque
            </Link>
            <a
              href="https://wa.me/5511947807036"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-ghost"
            >
              Falar com Vendedor
            </a>
          </div>
        </div>

        {/* Sportbike SVG */}
        <div className={styles.heroVisual}>
          <svg viewBox="0 0 900 500" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', maxHeight: '88%' }}>
            {/* Roda traseira */}
            <circle cx="690" cy="370" r="108" stroke="rgba(255,255,255,0.18)" strokeWidth="11" />
            <circle cx="690" cy="370" r="90" stroke="rgba(255,255,255,0.08)" strokeWidth="4" />
            <circle cx="690" cy="370" r="24" fill="rgba(220,38,39,0.75)" stroke="rgba(255,255,255,0.3)" strokeWidth="3" />
            <line x1="690" y1="262" x2="690" y2="346" stroke="rgba(255,255,255,0.22)" strokeWidth="2.5" />
            <line x1="690" y1="394" x2="690" y2="478" stroke="rgba(255,255,255,0.22)" strokeWidth="2.5" />
            <line x1="582" y1="370" x2="666" y2="370" stroke="rgba(255,255,255,0.22)" strokeWidth="2.5" />
            <line x1="714" y1="370" x2="798" y2="370" stroke="rgba(255,255,255,0.22)" strokeWidth="2.5" />
            <line x1="613" y1="293" x2="660" y2="354" stroke="rgba(255,255,255,0.14)" strokeWidth="2" />
            <line x1="720" y1="386" x2="767" y2="447" stroke="rgba(255,255,255,0.14)" strokeWidth="2" />
            <line x1="613" y1="447" x2="660" y2="386" stroke="rgba(255,255,255,0.14)" strokeWidth="2" />
            <line x1="720" y1="354" x2="767" y2="293" stroke="rgba(255,255,255,0.14)" strokeWidth="2" />
            <circle cx="690" cy="370" r="60" stroke="rgba(220,38,39,0.3)" strokeWidth="3" strokeDasharray="12 8" />
            {/* Roda dianteira */}
            <circle cx="195" cy="370" r="108" stroke="rgba(255,255,255,0.18)" strokeWidth="11" />
            <circle cx="195" cy="370" r="90" stroke="rgba(255,255,255,0.08)" strokeWidth="4" />
            <circle cx="195" cy="370" r="24" fill="rgba(220,38,39,0.75)" stroke="rgba(255,255,255,0.3)" strokeWidth="3" />
            <line x1="195" y1="262" x2="195" y2="346" stroke="rgba(255,255,255,0.22)" strokeWidth="2.5" />
            <line x1="195" y1="394" x2="195" y2="478" stroke="rgba(255,255,255,0.22)" strokeWidth="2.5" />
            <line x1="87" y1="370" x2="171" y2="370" stroke="rgba(255,255,255,0.22)" strokeWidth="2.5" />
            <line x1="219" y1="370" x2="303" y2="370" stroke="rgba(255,255,255,0.22)" strokeWidth="2.5" />
            <line x1="118" y1="293" x2="165" y2="354" stroke="rgba(255,255,255,0.14)" strokeWidth="2" />
            <line x1="225" y1="386" x2="272" y2="447" stroke="rgba(255,255,255,0.14)" strokeWidth="2" />
            <line x1="118" y1="447" x2="165" y2="386" stroke="rgba(255,255,255,0.14)" strokeWidth="2" />
            <line x1="225" y1="354" x2="272" y2="293" stroke="rgba(255,255,255,0.14)" strokeWidth="2" />
            <circle cx="195" cy="370" r="60" stroke="rgba(220,38,39,0.3)" strokeWidth="3" strokeDasharray="12 8" />
            {/* Forcella */}
            <path d="M238 262 L303 368" stroke="rgba(255,255,255,0.4)" strokeWidth="9" strokeLinecap="round" />
            <path d="M226 258 L291 366" stroke="rgba(255,255,255,0.22)" strokeWidth="5" strokeLinecap="round" />
            {/* Guidon */}
            <path d="M305 245 Q322 233 345 235 Q368 237 375 250" stroke="rgba(255,255,255,0.55)" strokeWidth="5.5" strokeLinecap="round" fill="none" />
            <path d="M345 235 L342 215 Q354 204 372 208 L385 214" stroke="rgba(255,255,255,0.4)" strokeWidth="4" strokeLinecap="round" fill="none" />
            {/* Carenagem */}
            <path d="M265 200 Q285 160 318 150 Q350 141 372 155 Q390 167 386 190 Q374 218 350 232 Q320 245 292 244 Q268 238 263 218 Z" fill="rgba(220,38,39,0.8)" stroke="rgba(255,255,255,0.35)" strokeWidth="2" />
            <path d="M278 192 Q295 165 322 157 Q348 152 366 165" stroke="rgba(255,255,255,0.55)" strokeWidth="2" fill="none" strokeLinecap="round" />
            <ellipse cx="310" cy="188" rx="18" ry="12" fill="rgba(255,255,255,0.25)" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" />
            {/* Tanque */}
            <path d="M372 155 Q435 116 520 112 Q582 108 618 128 Q640 140 636 168 Q624 196 584 208 Q534 220 472 217 Q408 214 376 194 Q360 180 372 155 Z" fill="rgba(30,45,107,0.95)" stroke="rgba(255,255,255,0.28)" strokeWidth="2.5" />
            <path d="M388 148 Q448 120 525 115 Q578 112 612 132" stroke="rgba(220,38,39,0.65)" strokeWidth="2.5" fill="none" strokeLinecap="round" />
            <path d="M395 170 Q450 155 520 152 Q568 150 600 162" stroke="rgba(255,255,255,0.12)" strokeWidth="1.5" fill="none" strokeLinecap="round" />
            {/* Assento */}
            <path d="M575 180 Q618 168 668 162 Q700 158 716 167 Q730 176 726 192 Q716 206 686 210 Q644 215 604 208 Q578 202 575 188 Z" fill="rgba(10,14,40,0.98)" stroke="rgba(255,255,255,0.22)" strokeWidth="2" />
            {/* Rabeta */}
            <path d="M716 167 Q758 155 790 146 Q818 140 828 150 Q833 161 822 172 Q800 188 762 193 Q730 196 717 186 Z" fill="rgba(220,38,39,0.85)" stroke="rgba(255,255,255,0.25)" strokeWidth="1.5" />
            <path d="M816 142 Q832 138 840 148 Q842 160 835 170 Q828 175 822 172" stroke="rgba(255,100,100,0.9)" strokeWidth="2" fill="rgba(255,80,80,0.5)" />
            {/* Quadro */}
            <path d="M372 190 L392 300 L472 320 L572 305 L614 228 L584 208" stroke="rgba(255,255,255,0.25)" strokeWidth="7" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M472 320 L500 370" stroke="rgba(255,255,255,0.2)" strokeWidth="6" strokeLinecap="round" />
            <path d="M472 320 L435 370" stroke="rgba(255,255,255,0.15)" strokeWidth="5" strokeLinecap="round" />
            {/* Motor */}
            <rect x="408" y="278" width="170" height="96" rx="10" fill="rgba(15,22,55,0.9)" stroke="rgba(255,255,255,0.2)" strokeWidth="2" />
            <rect x="422" y="290" width="54" height="38" rx="5" fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.14)" strokeWidth="1.5" />
            <rect x="484" y="290" width="54" height="38" rx="5" fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.14)" strokeWidth="1.5" />
            <line x1="408" y1="318" x2="578" y2="318" stroke="rgba(220,38,39,0.35)" strokeWidth="1.5" />
            <rect x="422" y="336" width="138" height="28" rx="4" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
            {/* Escapamento */}
            <path d="M498 368 Q546 374 596 368 Q644 360 678 368" stroke="rgba(255,160,30,0.55)" strokeWidth="7" strokeLinecap="round" fill="none" />
            <path d="M498 368 Q546 376 596 370 Q644 362 678 370" stroke="rgba(255,255,255,0.12)" strokeWidth="3.5" strokeLinecap="round" fill="none" />
            <ellipse cx="684" cy="369" rx="13" ry="9" fill="rgba(255,140,20,0.45)" stroke="rgba(255,190,60,0.6)" strokeWidth="2" />
            {/* Suspensao traseira */}
            <path d="M593 305 L636 368" stroke="rgba(255,255,255,0.28)" strokeWidth="5.5" strokeLinecap="round" />
            {/* Corrente */}
            <path d="M500 370 Q590 385 680 370" stroke="rgba(255,255,255,0.1)" strokeWidth="3" fill="none" strokeDasharray="7 4" />
            {/* Sombra */}
            <ellipse cx="440" cy="480" rx="295" ry="13" fill="rgba(0,0,0,0.28)" />
          </svg>
        </div>

        <div className={styles.heroStats}>
          <div className={styles.statItem}>
            <span className={styles.statNum}>{totalMotos > 0 ? totalMotos : '500'}<em className={styles.statNumEm}>+</em></span>
            <span className={styles.statLbl}>Modelos em Estoque</span>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statNum}>15<em className={styles.statNumEm}>+</em></span>
            <span className={styles.statLbl}>Marcas Parceiras</span>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statNum}>14<em className={styles.statNumEm}>+</em></span>
            <span className={styles.statLbl}>Anos de Experiência</span>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statNum}>98<em className={styles.statNumEm}>%</em></span>
            <span className={styles.statLbl}>Clientes Satisfeitos</span>
          </div>
        </div>
      </section>

      {/* CATEGORIES */}
      <section className={styles.categories}>
        <div className={styles.sectionHead}>
          <div className="section-label">Encontre o que procura</div>
          <h2 className={styles.sectionTitle}>NOSSA LINHA COMPLETA</h2>
        </div>
        <div className={styles.catsGrid}>
          {/* Motos de Rua */}
          <Link href="/produtos?categoria=motos-rua" className={styles.catCard}>
            <div className={styles.catBg} style={{ background: 'linear-gradient(145deg,#060c1f 0%,#111d4a 40%,#1e2e6e 70%,#0e1840 100%)' }}>
              <svg viewBox="0 0 500 340" fill="none" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', padding: '24px 30px', opacity: 0.4 }}>
                <circle cx="118" cy="258" r="72" stroke="white" strokeWidth="7" />
                <circle cx="382" cy="258" r="72" stroke="white" strokeWidth="7" />
                <circle cx="118" cy="258" r="20" fill="rgba(220,38,39,.7)" />
                <circle cx="382" cy="258" r="20" fill="rgba(220,38,39,.7)" />
                <path d="M192 178 L189 200 L186 258" stroke="white" strokeWidth="5" strokeLinecap="round" fill="none" />
                <path d="M192 178 Q210 165 232 168 Q250 170 256 183" stroke="white" strokeWidth="4.5" strokeLinecap="round" fill="none" />
                <path d="M170 142 Q190 112 220 106 Q248 101 264 118 Q275 132 270 152 Q260 172 242 181 Q220 190 200 187 Q178 182 170 162 Z" fill="rgba(220,38,39,.7)" stroke="white" strokeWidth="1.5" />
                <path d="M256 118 Q308 88 358 84 Q394 82 410 98 Q420 110 416 128 Q406 148 376 155 Q340 163 300 160 Q266 157 252 140 Z" fill="rgba(255,255,255,.15)" stroke="white" strokeWidth="1.5" />
                <path d="M376 118 Q410 108 444 104 Q462 102 468 112 Q470 122 460 130 Q438 140 408 142 Q385 143 378 130 Z" fill="rgba(220,38,39,.55)" stroke="white" strokeWidth="1.5" />
                <path d="M256 138 L268 220 L320 232 L376 222 L404 160 L380 150" stroke="white" strokeWidth="5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                <rect x="272" y="202" width="112" height="60" rx="7" fill="rgba(255,255,255,.08)" stroke="white" strokeWidth="1.5" />
                <path d="M338 258 Q368 264 400 258" stroke="rgba(255,180,50,.65)" strokeWidth="5" strokeLinecap="round" fill="none" />
              </svg>
            </div>
            <div className={styles.catOverlay} />
            <div className={styles.catArrow}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
            </div>
            <div className={styles.catBody}>
              <span className={styles.catLabel}>Categoria</span>
              <span className={styles.catName}>MOTOS<br />DE RUA</span>
              <span className={styles.catDesc}>Naked, esportivas, touring e custom para o dia a dia</span>
            </div>
          </Link>

          {/* Offroad */}
          <Link href="/produtos?categoria=offroad" className={styles.catCard}>
            <div className={styles.catBg} style={{ background: 'linear-gradient(145deg,#120800 0%,#2e1200 40%,#522200 70%,#3a1700 100%)' }}>
              <svg viewBox="0 0 500 340" fill="none" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', padding: '24px 30px', opacity: 0.4 }}>
                <circle cx="118" cy="265" r="76" stroke="white" strokeWidth="7" />
                <circle cx="382" cy="265" r="76" stroke="white" strokeWidth="7" />
                <circle cx="118" cy="265" r="18" fill="rgba(220,38,39,.7)" />
                <circle cx="382" cy="265" r="18" fill="rgba(220,38,39,.7)" />
                <path d="M194 155 L190 210 L186 265" stroke="white" strokeWidth="6" strokeLinecap="round" fill="none" />
                <path d="M194 155 L194 120 Q200 108 220 108 Q240 108 248 118" stroke="white" strokeWidth="5" strokeLinecap="round" fill="none" />
                <path d="M164 120 L220 120" stroke="white" strokeWidth="4" strokeLinecap="round" />
                <path d="M248 118 Q298 90 350 86 Q384 84 400 100 Q412 112 408 130 Q398 150 370 158 Q338 165 300 162 Q264 159 250 140 Z" fill="rgba(255,255,255,.12)" stroke="white" strokeWidth="1.5" />
                <path d="M248 138 L260 218 L316 230 L378 220 L406 158 L380 148" stroke="white" strokeWidth="5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                <rect x="266" y="210" width="108" height="62" rx="6" fill="rgba(255,255,255,.08)" stroke="white" strokeWidth="1.5" />
                <path d="M320 210 Q340 180 368 166 Q392 154 408 156" stroke="rgba(255,180,50,.7)" strokeWidth="6" strokeLinecap="round" fill="none" />
                <path d="M50 318 Q150 308 250 318 Q350 328 450 312" stroke="rgba(255,255,255,.25)" strokeWidth="2.5" fill="none" strokeDasharray="8 6" />
              </svg>
            </div>
            <div className={styles.catOverlay} />
            <div className={styles.catArrow}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
            </div>
            <div className={styles.catBody}>
              <span className={styles.catLabel}>Categoria</span>
              <span className={styles.catName}>OFF<br />ROAD</span>
              <span className={styles.catDesc}>Enduro, motocross e trilha para todo terreno</span>
            </div>
          </Link>

          {/* Quadriciclos */}
          <Link href="/produtos?categoria=quadriciclos" className={styles.catCard}>
            <div className={styles.catBg} style={{ background: 'linear-gradient(145deg,#001208 0%,#002918 40%,#004526 70%,#003018 100%)' }}>
              <svg viewBox="0 0 500 340" fill="none" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', padding: '30px 40px', opacity: 0.4 }}>
                <circle cx="108" cy="268" r="56" stroke="white" strokeWidth="6" />
                <circle cx="392" cy="268" r="56" stroke="white" strokeWidth="6" />
                <circle cx="108" cy="268" r="16" fill="rgba(220,38,39,.7)" />
                <circle cx="392" cy="268" r="16" fill="rgba(220,38,39,.7)" />
                <line x1="108" y1="268" x2="392" y2="268" stroke="rgba(255,255,255,.3)" strokeWidth="3" />
                <rect x="128" y="172" width="244" height="106" rx="12" stroke="white" strokeWidth="4" fill="rgba(255,255,255,.06)" />
                <path d="M152 172 L148 138 Q156 116 250 112 Q344 116 352 138 L348 172 Z" fill="rgba(255,255,255,.1)" stroke="white" strokeWidth="2.5" />
                <line x1="140" y1="132" x2="360" y2="132" stroke="white" strokeWidth="4" strokeLinecap="round" />
                <line x1="250" y1="132" x2="250" y2="112" stroke="white" strokeWidth="4" strokeLinecap="round" />
                <rect x="188" y="148" width="124" height="38" rx="8" fill="rgba(30,30,60,.8)" stroke="white" strokeWidth="1.5" />
                <rect x="196" y="214" width="108" height="54" rx="7" fill="rgba(255,255,255,.08)" stroke="white" strokeWidth="1.5" />
                <path d="M300 240 Q340 234 370 240 Q390 244 400 252" stroke="rgba(255,180,50,.65)" strokeWidth="5" strokeLinecap="round" fill="none" />
              </svg>
            </div>
            <div className={styles.catOverlay} />
            <div className={styles.catArrow}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
            </div>
            <div className={styles.catBody}>
              <span className={styles.catLabel}>Categoria</span>
              <span className={styles.catName}>QUADRI<br />CICLOS</span>
              <span className={styles.catDesc}>ATVs e UTVs para trabalho e lazer off-road</span>
            </div>
          </Link>

          {/* Infantil */}
          <Link href="/produtos?categoria=infantil" className={styles.catCard}>
            <div className={styles.catBg} style={{ background: 'linear-gradient(145deg,#100018 0%,#240038 40%,#3e0060 70%,#2c0048 100%)' }}>
              <svg viewBox="0 0 500 340" fill="none" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', padding: '30px 40px', opacity: 0.4 }}>
                <circle cx="128" cy="265" r="62" stroke="white" strokeWidth="6" />
                <circle cx="372" cy="265" r="62" stroke="white" strokeWidth="6" />
                <circle cx="128" cy="265" r="18" fill="rgba(220,38,39,.7)" />
                <circle cx="372" cy="265" r="18" fill="rgba(220,38,39,.7)" />
                <path d="M194 178 L190 220 L186 265" stroke="white" strokeWidth="5" strokeLinecap="round" fill="none" />
                <path d="M194 178 Q206 166 224 168 Q240 170 246 180" stroke="white" strokeWidth="4.5" strokeLinecap="round" fill="none" />
                <path d="M175 155 Q188 128 214 121 Q236 116 250 128 Q260 140 256 158 Q248 174 232 180 Q214 186 198 182 Q180 176 175 163 Z" fill="rgba(220,38,39,.75)" stroke="white" strokeWidth="2" />
                <path d="M250 128 Q296 102 338 98 Q364 96 376 110 Q384 120 380 136 Q372 152 348 158 Q318 164 284 161 Q258 158 250 143 Z" fill="rgba(255,255,255,.14)" stroke="white" strokeWidth="2" />
                <path d="M250 142 L262 216 L314 228 L360 218 L380 156 L356 148" stroke="white" strokeWidth="4.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                <rect x="268" y="210" width="90" height="50" rx="6" fill="rgba(255,255,255,.08)" stroke="white" strokeWidth="1.5" />
                <path d="M60 100 L64 90 L68 100 L58 94 L70 94 Z" fill="rgba(255,200,50,.5)" />
                <path d="M450 80 L453 72 L456 80 L448 75 L458 75 Z" fill="rgba(255,200,50,.5)" />
              </svg>
            </div>
            <div className={styles.catOverlay} />
            <div className={styles.catArrow}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
            </div>
            <div className={styles.catBody}>
              <span className={styles.catLabel}>Categoria</span>
              <span className={styles.catName}>INFANTIL</span>
              <span className={styles.catDesc}>Motos, quads e veículos para crianças com segurança e diversão</span>
            </div>
          </Link>
        </div>
      </section>

      {/* BRANDS MARQUEE */}
      <div className={styles.brandsBar}>
        <div className={styles.brandsLabel}>Marcas Parceiras</div>
        <div className={styles.brandsTrack}>
          <div className={styles.brandsRow}>
            {BRANDS.map((b) => (
              <span key={b} className={styles.brandPill}>{b}</span>
            ))}
          </div>
          <div className={styles.brandsRow}>
            {BRANDS.map((b) => (
              <span key={`dup-${b}`} className={styles.brandPill}>{b}</span>
            ))}
          </div>
        </div>
      </div>

      {/* FEATURED */}
      <section className={styles.featured}>
        <div className={styles.featuredInner}>
          <div className={styles.sectionHead}>
            <div className="section-label">Destaques do Mês</div>
            <h2 className={styles.sectionTitle}>MOTOS EM DESTAQUE</h2>
          </div>
          <div className={styles.featuredGrid}>
            {destaques.length > 0
              ? destaques.map((moto) => <MotoCard key={moto.id} moto={moto} />)
              : (
                <p style={{ gridColumn: '1/-1', textAlign: 'center', color: '#888', fontFamily: "'Barlow Condensed', sans-serif", padding: '3rem 0' }}>
                  Nenhuma moto em destaque no momento. Confira nosso estoque completo.
                </p>
              )}
          </div>
          <div className={styles.viewAll}>
            <Link href="/produtos" className="btn btn-blue">Ver Todo o Estoque</Link>
          </div>
        </div>
      </section>

      {/* WHY US */}
      <section className={styles.why}>
        <div className={styles.whyInner}>
          <div className={styles.sectionHead}>
            <div className="section-label">Por que escolher a Busca Racing</div>
            <h2 className={styles.sectionTitle}>NOSSA VANTAGEM</h2>
          </div>
          <div className={styles.whyGrid}>
            <div className={styles.whyCard}>
              <div className={styles.whyIcon}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </div>
              <h3 className={styles.whyTitle}>Qualidade Garantida</h3>
              <p className={styles.whyDesc}>Todas as motos passam por rigorosa inspeção técnica antes de qualquer venda.</p>
            </div>
            <div className={styles.whyCard}>
              <div className={styles.whyIcon}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </div>
              <h3 className={styles.whyTitle}>Multi Marcas</h3>
              <p className={styles.whyDesc}>Honda, Yamaha, Kawasaki, KTM, MXF e muito mais em um só lugar.</p>
            </div>
            <div className={styles.whyCard}>
              <div className={styles.whyIcon}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /><circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="2" /><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
              </div>
              <h3 className={styles.whyTitle}>Atendimento Especializado</h3>
              <p className={styles.whyDesc}>Equipe apaixonada por motos que entende exatamente o que você precisa.</p>
            </div>
            <div className={styles.whyCard}>
              <div className={styles.whyIcon}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><rect x="1" y="4" width="22" height="16" rx="2" ry="2" stroke="currentColor" strokeWidth="2" /><line x1="1" y1="10" x2="23" y2="10" stroke="currentColor" strokeWidth="2" /></svg>
              </div>
              <h3 className={styles.whyTitle}>Facilidade no Financiamento</h3>
              <p className={styles.whyDesc}>Parcelas que cabem no seu bolso com as melhores condições do mercado.</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA BAND */}
      <section className={styles.ctaBand}>
        <h2 className={styles.ctaBandTitle}>PRONTO PARA ACELERAR?</h2>
        <p className={styles.ctaBandText}>Visite nossa loja ou fale com um especialista agora pelo WhatsApp</p>
        <a
          href="https://wa.me/5511947807036?text=Olá! Gostaria de conhecer as motos da Busca Racing."
          target="_blank"
          rel="noopener noreferrer"
          className={styles.btnWhite}
        >
          Falar no WhatsApp Agora
        </a>
      </section>
    </>
  );
}
