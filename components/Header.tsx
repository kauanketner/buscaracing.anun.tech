'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import styles from './Header.module.css';

const NAV_LINKS = [
  { href: '/produtos', label: 'Motos' },
  { href: '/pecas', label: 'Peças' },
  { href: '/acessorios', label: 'Acessórios' },
  { href: '/venda-sua-moto', label: 'Venda sua Moto' },
  { href: '/blog', label: 'Blog' },
  { href: '/contato', label: 'Contato' },
];

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string>('');

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch('/api/config/logo', { cache: 'no-store' });
        if (!r.ok) return;
        const d: { logo?: string } = await r.json();
        if (!cancelled && d.logo) setLogoUrl(d.logo);
      } catch {
        /* silent fallback to default logo */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const toggleMenu = () => setMenuOpen((prev) => !prev);

  return (
    <>
      <header
        className={`${styles.header} ${scrolled ? styles.headerScrolled : ''}`}
      >
        <Link href="/" className={styles.logo}>
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt="Busca Racing" className={styles.logoImg} />
          ) : (
            <>
              <svg className={styles.logoFlag} viewBox="0 0 30 30" fill="none">
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
            </>
          )}
        </Link>

        <nav className={styles.nav}>
          {NAV_LINKS.map(({ href, label }) => (
            <Link key={href} href={href} className={styles.navLink}>
              {label}
            </Link>
          ))}
        </nav>

        <a
          href="https://wa.me/5511947807036"
          target="_blank"
          rel="noopener noreferrer"
          className={styles.headerCta}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path
              d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
          (11) 94780-7036
        </a>

        <button
          className={`${styles.hamburger} ${menuOpen ? styles.hamburgerOpen : ''}`}
          onClick={toggleMenu}
          aria-label="Menu"
        >
          <span />
          <span />
          <span />
        </button>
      </header>

      {/* Mobile nav overlay */}
      <div
        className={`${styles.mobileNav} ${menuOpen ? styles.mobileNavOpen : ''}`}
      >
        {NAV_LINKS.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            className={styles.mobileNavLink}
            onClick={() => setMenuOpen(false)}
          >
            {label}
          </Link>
        ))}
        <a
          href="https://wa.me/5511947807036"
          target="_blank"
          rel="noopener noreferrer"
          className={styles.mobileNavCta}
        >
          (11) 94780-7036
        </a>
      </div>
    </>
  );
}
