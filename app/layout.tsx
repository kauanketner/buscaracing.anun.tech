import type { Metadata } from 'next';
import { Barlow, Barlow_Condensed } from 'next/font/google';
import './globals.css';
import SiteChrome from '@/components/SiteChrome';
import JsonLd, { localBusinessSchema } from '@/components/JsonLd';

const barlow = Barlow({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-barlow',
  display: 'swap',
});

const barlowCondensed = Barlow_Condensed({
  subsets: ['latin'],
  weight: ['400', '600', '700'],
  variable: '--font-barlow-condensed',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL('https://buscaracing.com'),
  title: {
    template: '%s | Busca Racing',
    default: 'Busca Racing – Motos Multimarcas em Franco da Rocha',
  },
  description:
    'Loja de motos multi marcas em Franco da Rocha – SP. Motos de rua, offroad, quadriciclos e bikes infantis. Compra, venda e troca.',
  openGraph: {
    type: 'website',
    locale: 'pt_BR',
    siteName: 'Busca Racing',
    title: 'Busca Racing – Motos Multimarcas em Franco da Rocha',
    description:
      'Loja de motos multi marcas em Franco da Rocha – SP. Motos de rua, offroad, quadriciclos e bikes infantis.',
    url: 'https://buscaracing.com',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${barlow.variable} ${barlowCondensed.variable}`}>
      <head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Bebas+Neue&display=swap"
        />
      </head>
      <body>
        <SiteChrome>{children}</SiteChrome>
        <JsonLd data={localBusinessSchema()} />
      </body>
    </html>
  );
}
