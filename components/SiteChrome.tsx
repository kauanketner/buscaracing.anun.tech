'use client';

import { usePathname } from 'next/navigation';
import Header from './Header';
import Footer from './Footer';

export default function SiteChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  // Admin e PWA do mecânico renderizam seus próprios layouts — sem header/footer do site público.
  const isBare =
    pathname?.startsWith('/admin') ||
    pathname?.startsWith('/m/') || pathname === '/m' ||
    pathname?.startsWith('/c/') || pathname === '/c' ||
    pathname?.startsWith('/v/') || pathname === '/v' ||
    pathname?.startsWith('/compra/') || pathname === '/compra' ||
    pathname?.startsWith('/checklist/') || pathname === '/checklist';

  if (isBare) {
    return <>{children}</>;
  }

  return (
    <>
      <Header />
      <main>{children}</main>
      <Footer />
    </>
  );
}
