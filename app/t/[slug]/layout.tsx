/**
 * Layout do PWA do técnico.
 *
 * - Valida o slug da URL contra o slug atual no banco. Mismatch => 404.
 *   (Assim, rotacionar o slug no admin invalida todos os bookmarks/PWAs antigos.)
 * - Injeta <link rel="manifest"> dinâmico, noindex, theme-color.
 * - Não carrega header/sidebar do admin; é uma app mobile-first dedicada.
 */
import { notFound } from 'next/navigation';
import { getCurrentSlug } from '@/lib/tecnico-auth';
import { ToastProvider } from '@/components/Toast';
import './tecnico.css';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Oficina — Busca Racing',
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: { index: false, follow: false },
  },
};

type Props = {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
};

export default async function TecnicoLayout({ children, params }: Props) {
  const { slug } = await params;
  const current = getCurrentSlug();
  if (!current || slug !== current) {
    notFound();
  }

  return (
    <>
      {/* Manifest é um route handler que lê o slug atual. Se o slug rotacionar,
          o PWA instalado apontará para um start_url inválido (desejado). */}
      <link rel="manifest" href="/api/tecnico/manifest.webmanifest" />
      <meta name="theme-color" content="#27367D" />
      <meta name="apple-mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      <meta name="apple-mobile-web-app-title" content="Oficina BR" />
      <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
      <ToastProvider>
        <div className="tecnico-app">{children}</div>
      </ToastProvider>
    </>
  );
}
