import { NextResponse } from 'next/server';
import { getCurrentSlug } from '@/lib/mecanico-auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  const slug = getCurrentSlug();
  const manifest = {
    name: 'Oficina',
    short_name: 'Oficina',
    start_url: slug ? `/m/${slug}/` : '/',
    scope: slug ? `/m/${slug}/` : '/',
    display: 'standalone',
    orientation: 'portrait',
    theme_color: '#27367D',
    background_color: '#FDFDFB',
    icons: [
      {
        src: '/mecanico/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'any',
      },
      {
        src: '/mecanico/icon-maskable.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'maskable',
      },
    ],
  };
  return new NextResponse(JSON.stringify(manifest, null, 2), {
    status: 200,
    headers: {
      'Content-Type': 'application/manifest+json',
      'Cache-Control': 'public, max-age=60',
    },
  });
}
