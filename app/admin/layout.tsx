'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ToastProvider } from '@/components/Toast';
import { HeaderActionsContext } from './HeaderActionsContext';
import styles from './layout.module.css';

const PAGE_TITLES: Record<string, { title: string; subtitle?: string }> = {
  '/admin': { title: 'Dashboard', subtitle: 'Visão geral da loja' },
  '/admin/motos': { title: 'Estoque', subtitle: 'Controle completo do estoque de motos' },
  '/admin/pecas': { title: 'Peças', subtitle: 'Cadastre e publique peças no site' },
  '/admin/servicos': { title: 'Serviços', subtitle: 'Catálogo de serviços para lançar nas ordens da oficina' },
  '/admin/pdv': { title: 'PDV', subtitle: 'Registrar venda avulsa de peças (balcão, site, WhatsApp)' },
  '/admin/pdv/historico': { title: 'Histórico de vendas PDV', subtitle: 'Vendas avulsas registradas pelo PDV' },
  '/admin/oficina': { title: 'Oficina', subtitle: 'Ordens de serviço e motos em manutenção' },
  '/admin/vendas': { title: 'Vendas', subtitle: 'Histórico de vendas, comissões e faturamento' },
  '/admin/alugueis': { title: 'Aluguéis', subtitle: 'Reservas de locação — aprovar, ativar, finalizar' },
  '/admin/consignacoes': { title: 'Consignadas', subtitle: 'Motos de terceiros, repasses e links' },
  '/admin/financeiro': { title: 'Financeiro', subtitle: 'Fluxo de caixa, comissões e repasses' },
  '/admin/clientes': { title: 'Clientes', subtitle: 'Cadastro centralizado e histórico unificado' },
  '/admin/clientes/novo': { title: 'Novo cliente', subtitle: 'Cadastrar cliente no banco central' },
  '/admin/checklists': { title: 'Checklists', subtitle: 'Crie checklists e acompanhe preenchimentos' },
  '/admin/mecanicos': { title: 'Mecânicos', subtitle: 'Acesso dos mecânicos ao app da oficina' },
  '/admin/blog': { title: 'Blog', subtitle: 'Gerencie posts, categorias e publicações' },
  '/admin/blog/novo': { title: 'Novo Post', subtitle: 'Crie um novo post para o blog' },
  '/admin/config': { title: 'Configurações', subtitle: 'Logo, imagens e dados do site' },
};

function getPageMeta(pathname: string): { title: string; subtitle?: string } {
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname];
  if (/^\/admin\/blog\/\d+$/.test(pathname)) {
    return { title: 'Editar Post', subtitle: 'Atualize o conteúdo do post' };
  }
  if (/^\/admin\/motos\/\d+$/.test(pathname)) {
    return { title: 'Detalhes da moto', subtitle: 'Histórico completo, manutenções, vendas, aluguéis e financeiro' };
  }
  if (/^\/admin\/clientes\/\d+$/.test(pathname)) {
    return { title: 'Cliente', subtitle: 'Editar dados e ver histórico unificado' };
  }
  if (pathname.startsWith('/admin/motos')) {
    return { title: 'Estoque', subtitle: 'Controle completo do estoque de motos' };
  }
  if (pathname.startsWith('/admin/oficina')) {
    return { title: 'Oficina', subtitle: 'Ordens de serviço e motos em manutenção' };
  }
  if (pathname.startsWith('/admin/blog')) {
    return { title: 'Blog', subtitle: 'Gerencie posts, categorias e publicações' };
  }
  if (pathname.startsWith('/admin/config')) {
    return { title: 'Configurações', subtitle: 'Logo, imagens e dados do site' };
  }
  return { title: 'Admin' };
}

function NavIcon({ name }: { name: 'dashboard' | 'motos' | 'pecas' | 'servicos' | 'pdv' | 'oficina' | 'vendas' | 'alugueis' | 'consignacoes' | 'financeiro' | 'clientes' | 'checklists' | 'mecanicos' | 'blog' | 'config' }) {
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
  if (name === 'pecas') {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
        <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (name === 'oficina') {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
        <path
          d="M14.7 6.3a5 5 0 11-7 7L3 18a1.5 1.5 0 002 2l4.4-4.4a5 5 0 017-7l-2.6 2.6-2.4-.4-.4-2.4 2.7-2.1z"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  if (name === 'servicos') {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
        <path d="M9 11l3 3 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M3 7h2M3 12h2M3 17h2M9 17h12M9 7h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  }
  if (name === 'pdv') {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
        <rect x="2" y="6" width="20" height="14" rx="2" stroke="currentColor" strokeWidth="2" />
        <path d="M2 10h20" stroke="currentColor" strokeWidth="2" />
        <path d="M7 6V4a2 2 0 012-2h6a2 2 0 012 2v2" stroke="currentColor" strokeWidth="2" />
        <circle cx="9" cy="15" r="1" fill="currentColor" />
      </svg>
    );
  }
  if (name === 'mecanicos') {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
        <path d="M17 21v-2a4 4 0 00-4-4H7a4 4 0 00-4 4v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="10" cy="8" r="4" stroke="currentColor" strokeWidth="2" />
        <path d="M21 21v-2a4 4 0 00-3-3.87M17 3.13a4 4 0 010 7.75" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (name === 'checklists') {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
        <path d="M9 11l3 3L22 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (name === 'clientes') {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
        <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="2" />
      </svg>
    );
  }
  if (name === 'financeiro') {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
        <line x1="12" y1="1" x2="12" y2="23" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (name === 'consignacoes') {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
        <path d="M16 3h5v5M21 3l-7 7M4 11v6a2 2 0 002 2h12a2 2 0 002-2v-3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M8 15h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  }
  if (name === 'vendas') {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
        <circle cx="9" cy="21" r="1" stroke="currentColor" strokeWidth="2" />
        <circle cx="20" cy="21" r="1" stroke="currentColor" strokeWidth="2" />
        <path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (name === 'alugueis') {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
        <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2" />
        <line x1="16" y1="2" x2="16" y2="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <line x1="8" y1="2" x2="8" y2="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <line x1="3" y1="10" x2="21" y2="10" stroke="currentColor" strokeWidth="2" />
        <path d="M8 14h2M14 14h2M8 18h2M14 18h2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
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
  icon: 'dashboard' | 'motos' | 'pecas' | 'servicos' | 'pdv' | 'oficina' | 'vendas' | 'alugueis' | 'consignacoes' | 'financeiro' | 'clientes' | 'checklists' | 'mecanicos' | 'blog' | 'config';
  exact?: boolean;
};

type NavGroup = {
  title: string;
  items: NavLink[];
};

const NAV_GROUPS: NavGroup[] = [
  {
    title: 'Dia a dia',
    items: [
      { href: '/admin', label: 'Dashboard', icon: 'dashboard', exact: true },
      { href: '/admin/motos', label: 'Estoque', icon: 'motos' },
      { href: '/admin/pdv', label: 'PDV', icon: 'pdv' },
      { href: '/admin/oficina', label: 'Oficina', icon: 'oficina' },
    ],
  },
  {
    title: 'Negócio',
    items: [
      { href: '/admin/vendas', label: 'Vendas', icon: 'vendas' },
      { href: '/admin/alugueis', label: 'Aluguéis', icon: 'alugueis' },
      { href: '/admin/consignacoes', label: 'Consignadas', icon: 'consignacoes' },
    ],
  },
  {
    title: 'Catálogos',
    items: [
      { href: '/admin/pecas', label: 'Peças', icon: 'pecas' },
      { href: '/admin/servicos', label: 'Serviços', icon: 'servicos' },
    ],
  },
  {
    title: 'Pessoas',
    items: [
      { href: '/admin/clientes', label: 'Clientes', icon: 'clientes' },
    ],
  },
  {
    title: 'Gestão',
    items: [
      { href: '/admin/financeiro', label: 'Financeiro', icon: 'financeiro' },
      { href: '/admin/checklists', label: 'Checklists', icon: 'checklists' },
    ],
  },
  {
    title: 'Outros',
    items: [
      { href: '/admin/blog', label: 'Blog', icon: 'blog' },
      { href: '/admin/config', label: 'Configurações', icon: 'config' },
    ],
  },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || '/admin';
  const router = useRouter();
  const isLoginPage = pathname === '/admin/login';

  const [checking, setChecking] = useState(!isLoginPage);
  const [authed, setAuthed] = useState(false);
  const [headerActions, setHeaderActions] = useState<React.ReactNode>(null);

  const headerCtxValue = useMemo(() => ({ setActions: setHeaderActions }), []);

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

  const { title: pageTitle, subtitle: pageSubtitle } = getPageMeta(pathname);

  return (
    <ToastProvider>
      <HeaderActionsContext.Provider value={headerCtxValue}>
        <div className={styles.adminLayout}>
          <aside className={styles.sidebar}>
            <nav className={styles.sidebarNav} style={{ paddingTop: '1rem' }}>
              {NAV_GROUPS.map((group, gi) => (
                <div key={group.title} className={styles.navGroup}>
                  <div
                    className={styles.navGroupTitle}
                    style={gi === 0 ? { marginTop: 0 } : undefined}
                  >
                    {group.title}
                  </div>
                  {group.items.map((link) => {
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
                </div>
              ))}
            </nav>

            <div className={styles.sidebarFooter}>
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
              <div className={styles.adminHeaderText}>
                <h1 className={styles.adminHeaderTitle}>{pageTitle}</h1>
                {pageSubtitle && (
                  <p className={styles.adminHeaderSubtitle}>{pageSubtitle}</p>
                )}
              </div>
              <div className={styles.adminHeaderActions}>{headerActions}</div>
            </div>
            <div className={styles.adminContent}>{children}</div>
          </main>
        </div>
      </HeaderActionsContext.Provider>
    </ToastProvider>
  );
}
