import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { isAuthenticated } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { UPLOADS_DIR } from '@/lib/upload';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string; compId: string }> };

/** DELETE — remove comprovante + arquivo do disco */
export async function DELETE(request: NextRequest, ctx: Ctx) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }
  try {
    const { id, compId } = await ctx.params;
    const db = getDb();
    const row = db
      .prepare('SELECT id, url FROM reserva_comprovantes WHERE id = ? AND reserva_id = ?')
      .get(Number(compId), Number(id)) as { id: number; url: string } | undefined;
    if (!row) return NextResponse.json({ error: 'Comprovante não encontrado' }, { status: 404 });

    if (row.url && row.url.startsWith('/uploads/')) {
      const filename = path.basename(row.url);
      const filepath = path.join(UPLOADS_DIR, filename);
      if (fs.existsSync(filepath)) {
        try { fs.unlinkSync(filepath); } catch { /* silencioso */ }
      }
    }

    db.prepare('DELETE FROM reserva_comprovantes WHERE id = ?').run(row.id);
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Erro interno';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
