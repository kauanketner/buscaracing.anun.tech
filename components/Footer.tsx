import Link from 'next/link';
import styles from './Footer.module.css';

const NAV_LINKS = [
  { href: '/', label: 'Home' },
  { href: '/motos', label: 'Motos' },
  { href: '/pecas', label: 'Peças' },
  { href: '/acessorios', label: 'Acessórios' },
  { href: '/#contato', label: 'Contato' },
];

const CATEGORY_LINKS = [
  { href: '/motos?categoria=motos-rua', label: 'Motos de Rua' },
  { href: '/motos?categoria=offroad', label: 'Offroad' },
  { href: '/motos?categoria=quadriciclos', label: 'Quadriciclos' },
  { href: '/motos?categoria=infantil', label: 'Infantil' },
];

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.footerTop}>
        {/* Column 1: Logo + tagline */}
        <div className={styles.brandCol}>
          <Link href="/" className={styles.logoLink}>
            <svg className={styles.logoFlag} width="28" height="28" viewBox="0 0 30 30" fill="none">
              <rect width="15" height="30" fill="#27367D" />
              <rect x="15" width="15" height="30" fill="#DC2627" />
              <rect y="7.5" width="7.5" height="7.5" fill="#FDFDFB" />
              <rect x="15" y="7.5" width="7.5" height="7.5" fill="#111d45" />
              <rect x="7.5" y="15" width="7.5" height="7.5" fill="#111d45" />
              <rect x="22.5" y="15" width="7.5" height="7.5" fill="#FDFDFB" />
            </svg>
            <div className={styles.logoText}>
              <span className={styles.logoB}>BUSCA </span>
              <span className={styles.logoR}>RACING</span>
            </div>
          </Link>
          <p className={styles.tagline}>
            Sua loja de motos multi marcas em Franco da Rocha – SP. Motos de rua, offroad, quadriciclos e bikes infantis desde 2010.
          </p>
          <div className={styles.social}>
            <a href="https://instagram.com/buscaracing" target="_blank" rel="noopener noreferrer" className={styles.socIcon} title="Instagram">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><rect x="2" y="2" width="20" height="20" rx="5" stroke="currentColor" strokeWidth="2" /><path d="M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37z" stroke="currentColor" strokeWidth="2" /><line x1="17.5" y1="6.5" x2="17.51" y2="6.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
            </a>
            <a href="https://facebook.com/buscaracing" target="_blank" rel="noopener noreferrer" className={styles.socIcon} title="Facebook">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </a>
            <a href="https://wa.me/5511947807036" target="_blank" rel="noopener noreferrer" className={styles.socIcon} title="WhatsApp">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
            </a>
          </div>
        </div>

        {/* Column 2: Navigation */}
        <div className={styles.col}>
          <h4 className={styles.colTitle}>Navegacao</h4>
          <ul className={styles.colList}>
            {NAV_LINKS.map(({ href, label }) => (
              <li key={href}>
                <Link href={href} className={styles.colLink}>{label}</Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Column 3: Categories */}
        <div className={styles.col}>
          <h4 className={styles.colTitle}>Categorias</h4>
          <ul className={styles.colList}>
            {CATEGORY_LINKS.map(({ href, label }) => (
              <li key={href}>
                <Link href={href} className={styles.colLink}>{label}</Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Column 4: Contact */}
        <div className={styles.col}>
          <h4 className={styles.colTitle}>Contato</h4>
          <div className={styles.contactItem}>
            <svg className={styles.contactIcon} width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M22 16.92v3a2 2 0 01-2.18 2A19.79 19.79 0 013.4 10.6 19.79 19.79 0 01.34 1.96 2 2 0 012.33 0h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 14.92z" stroke="currentColor" strokeWidth="2" /></svg>
            <span>(11) 94780-7036</span>
          </div>
          <div className={styles.contactItem}>
            <svg className={styles.contactIcon} width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" stroke="currentColor" strokeWidth="2" /><polyline points="22,6 12,13 2,6" stroke="currentColor" strokeWidth="2" /></svg>
            <span>contato@buscaracing.com</span>
          </div>
          <div className={styles.contactItem}>
            <svg className={styles.contactIcon} width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" stroke="currentColor" strokeWidth="2" /><circle cx="12" cy="10" r="3" stroke="currentColor" strokeWidth="2" /></svg>
            <span>Av. Villa Verde, 1212 - Vila Verde<br />Franco da Rocha – SP, 07813-000</span>
          </div>
          <div className={styles.contactItem}>
            <svg className={styles.contactIcon} width="15" height="15" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" /><polyline points="12 6 12 12 16 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
            <span>Seg–Sex: 8h–18h · Sab: 8h–13h</span>
          </div>
        </div>
      </div>

      <div className={styles.footerBottom}>
        <span>&copy; 2026 Busca Racing. Todos os direitos reservados.</span>
        <span>Franco da Rocha – SP</span>
        <span>
          <a href="https://anuntech.com" target="_blank" rel="noopener noreferrer" className={styles.anuntechLink}>
            Feito com ❤️ por Anuntech
          </a>
        </span>
      </div>
    </footer>
  );
}
