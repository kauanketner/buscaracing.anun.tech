'use client';

import Link from 'next/link';

type Props = { slug: string; active: 'motos' | 'leads' | 'perfil' };

export default function BottomNav({ slug, active }: Props) {
  const items: { key: Props['active']; href: string; label: string; icon: React.ReactNode }[] = [
    {
      key: 'motos',
      href: `/v/${slug}/motos`,
      label: 'Motos',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <circle cx="7" cy="17" r="3" stroke="currentColor" strokeWidth="2" />
          <circle cx="17" cy="17" r="3" stroke="currentColor" strokeWidth="2" />
          <path d="M10 17h4M3 14L7 8l6 1 4 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
    },
    {
      key: 'leads',
      href: `/v/${slug}/leads`,
      label: 'Leads',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="2" />
          <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      ),
    },
    {
      key: 'perfil',
      href: `/v/${slug}/perfil`,
      label: 'Perfil',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="2" />
        </svg>
      ),
    },
  ];

  return (
    <nav style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 20,
      background: '#fff', borderTop: '1px solid #e4e4e0',
      display: 'flex', justifyContent: 'space-around',
      paddingBottom: 'env(safe-area-inset-bottom)',
    }}>
      {items.map((item) => (
        <Link
          key={item.key}
          href={item.href}
          style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            padding: '8px 12px', gap: 2, textDecoration: 'none',
            color: active === item.key ? '#27367D' : '#999',
            fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase',
            letterSpacing: '0.08em',
          }}
        >
          {item.icon}
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
