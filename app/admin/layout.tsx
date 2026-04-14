'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ToastProvider } from '@/components/Toast';
import { HeaderActionsContext } from './HeaderActionsContext';
import styles from './layout.module.css';

const PAGE_TITLES: Record<string, string> = {
  '/admin': 'Dashboard',
  '/admin/motos': 'Gestão de Motos',
  '/admin/blog': 'Blog',
  '/admin/config': 'Configurações',
};

function getPageTitle(pathname: string): string {
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname];
  if (pathname.startsWith('/admin/motos')) return 'Gestão de Motos';
  if (pathname.startsWith('/admin/blog')) return 'Blog';
  if (pathname.startsWith('/admin/config')) return 'Configurações';
  return 'Admin';
}

function NavIcon({ name }: { name: 'dashboard' | 'motos' | 'blog' | 'config' }) {
  if (name === 'dashboard') {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
        <rect x="3" y="3" width="7" height="7" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
        <rect x="14" y="3" width="7" height="7" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
        <rect x="14" y="14" width="7" height="7" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
        <rect x="3" y="14" width="7" height="7" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      </svg>
    );
  }
  if (name === 'motos') {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
        <circle cx="7" cy="17" r="3" stroke="currentColor" strokeWidth="2" />
        <circle cx="17" cy="17" r="3" stroke="currentColor" strokeWidth="2" />
        <path d="M10 17h4M3 14 L7 8 L13 9 L17 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M13 9 L16 5 L19 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  }
  if (name === 'blog') {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
        <polyline points="14 2 14 8 20 8" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
        <line x1="8" y1="13" x2="16" y2="13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <line x1="8" y1="17" x2="13" y2="17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
      <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

type NavLink = {
  href: string;
  label: string;
  icon: 'dashboard' | 'motos' | 'blog' | 'config';
  exact?: boolean;
};

const NAV_LINKS: NavLink[] = [
  { href: '/admin', label: 'Dashboard', icon: 'dashboard', exact: true },
  { href: '/admin/motos', label: 'Motos', icon: 'motos' },
  { href: '/admin/blog', label: 'Blog', icon: 'blog' },
  { href: '/admin/config', label: 'Configurações', icon: 'config' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || '/admin';
  const router = useRouter();
  const isLoginPage = pathname === '/admin/login';

  const [checking, setChecking] = useState(!isLoginPage);
  const [authed, setAuthed] = useState(false);
  const [logo, setLogo] = useState<string>('');
  const [headerActions, setHeaderActions] = useState<React.ReactNode>(null);

  // Load logo
  useEffect(() => {
    let cancelled = false;
    fetch('/api/config/logo')
      .then((r) => r.json())
      .then((d: { logo?: string }) => {
        if (!cancelled && d.logo) setLogo(d.logo);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  // Auth guard — skip on login page
  useEffect(() => {
    if (isLoginPage) {
      setChecking(false);
      return;
    }
    let cancelled = false;
    fetch('/api/auth')
      .then((r) => r.json())
      .then((d: { isAdmin: boolean }) => {
        if (cancelled) return;
        if (!d.isAdmin) {
          router.replace('/admin/login');
        } else {
          setAuthed(true);
          setChecking(false);
        }
      })
      .catch(() => {
        if (!cancelled) router.replace('/admin/login');
      });
    return () => {
      cancelled = true;
    };
  }, [isLoginPage, router]);

  const doLogout = async () => {
    try {
      await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'logout' }),
      });
    } catch {}
    router.push('/admin/login');
  };

  // Login page: render children only (no shell)
  if (isLoginPage) {
    return <ToastProvider>{children}</ToastProvider>;
  }

  if (checking || !authed) {
    return <div className={styles.loading}>Carregando...</div>;
  }

  const pageTitle = getPageTitle(pathname);

  return (
    <ToastProvider>
      <HeaderActionsContext.Provider value={{ setActions: setHeaderActions }}>
        <div className={styles.adminLayout}>
          <aside className={styles.sidebar}>
            <div className={styles.sidebarLogo}>
              <Link href="/admin" className={styles.sidebarLogoLink}>
                {logo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={logo} alt="Busca Racing" className={styles.sidebarLogoImg} />
                ) : (
                  <>
                    <span style={{ color: '#FDFDFB' }}>BUSCA</span>
                    <span style={{ color: '#DC2627' }}>&nbsp;RACING</span>
                  </>
                )}
              </Link>
              <div className={styles.sidebarTag}>Painel Admin</div>
            </div>

            <nav className={styles.sidebarNav}>
              {NAV_LINKS.map((link) => {
                const active = link.exact
                  ? pathname === link.href
                  : pathname === link.href || pathname.startsWith(link.href + '/');
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`${styles.navItem} ${active ? styles.navItemActive : ''}`}
                  >
                    <NavIcon name={link.icon} />
                    {link.label}
                  </Link>
                );
              })}
            </nav>

            <div className={styles.sidebarFooter}>
              <a href="/" target="_blank" rel="noopener noreferrer" className={styles.verSiteLink}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                  <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  <polyline points="15 3 21 3 21 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <line x1="10" y1="14" x2="21" y2="3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
                Ver Site
              </a>
              <button className={styles.btnLogout} onClick={doLogout}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                Sair
              </button>
            </div>
          </aside>

          <main className={styles.adminMain}>
            <div className={styles.adminHeader}>
              <h1 className={styles.adminHeaderTitle}>{pageTitle}</h1>
              <div className={styles.adminHeaderActions}>{headerActions}</div>
            </div>
            <div className={styles.adminContent}>{children}</div>
          </main>
        </div>
      </HeaderActionsContext.Provider>
    </ToastProvider>
  );
}
