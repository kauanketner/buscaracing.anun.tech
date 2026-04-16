import { NextResponse } from 'next/server';
import { getCurrentSlug } from '@/lib/tecnico-auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  const slug = getCurrentSlug();
  const manifest = {
    name: 'Oficina',
    short_name: 'Oficina',
    start_url: slug ? `/t/${slug}/` : '/',
    scope: slug ? `/t/${slug}/` : '/',
    display: 'standalone',
    orientation: 'portrait',
    theme_color: '#27367D',
    background_color: '#FDFDFB',
    icons: [
      {
        src: '/tecnico/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'any',
      },
      {
        src: '/tecnico/icon-maskable.svg',
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
