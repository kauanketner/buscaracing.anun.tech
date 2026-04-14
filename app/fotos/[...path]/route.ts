import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { FOTOS_DIR } from '@/lib/upload';

const MIME: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.avif': 'image/avif',
};

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path: segs } = await params;
  const rel = segs.join('/');
  const resolved = path.resolve(FOTOS_DIR, rel);

  if (!resolved.startsWith(path.resolve(FOTOS_DIR) + path.sep)) {
    return new NextResponse('Forbidden', { status: 403 });
  }
  if (!fs.existsSync(resolved) || !fs.statSync(resolved).isFile()) {
    return new NextResponse('Not found', { status: 404 });
  }

  const buf = fs.readFileSync(resolved);
  const ext = path.extname(resolved).toLowerCase();
  return new NextResponse(buf, {
    headers: {
      'Content-Type': MIME[ext] || 'application/octet-stream',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}
