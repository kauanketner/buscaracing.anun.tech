import { notFound } from 'next/navigation';
import { getVendedorSlug } from '@/lib/vendedor-auth';
import { ToastProvider } from '@/components/Toast';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Vendas — Busca Racing',
  robots: { index: false, follow: false },
};

type Props = { children: React.ReactNode; params: Promise<{ slug: string }> };

export default async function VendedorLayout({ children, params }: Props) {
  const { slug } = await params;
  const current = getVendedorSlug();
  if (!current || slug !== current) notFound();

  return (
    <>
      <meta name="theme-color" content="#27367D" />
      <meta name="apple-mobile-web-app-capable" content="yes" />
      <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
      <ToastProvider>
        <div style={{
          minHeight: '100vh',
          background: '#f6f6f3',
          fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          color: '#222',
          paddingBottom: 'calc(60px + env(safe-area-inset-bottom))',
        }}>
          {children}
        </div>
      </ToastProvider>
    </>
  );
}
