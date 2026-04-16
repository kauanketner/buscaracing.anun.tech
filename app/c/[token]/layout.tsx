import { ToastProvider } from '@/components/Toast';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Minha Consignação — Busca Racing',
  robots: { index: false, follow: false },
};

type Props = { children: React.ReactNode };

export default function ConsignanteLayout({ children }: Props) {
  return (
    <>
      <meta name="theme-color" content="#27367D" />
      <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
      <ToastProvider>
        <div style={{
          minHeight: '100vh',
          background: '#f6f6f3',
          fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          color: '#222',
        }}>
          {children}
        </div>
      </ToastProvider>
    </>
  );
}
