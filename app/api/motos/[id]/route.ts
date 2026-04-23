import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/auth';
import { getDb, stripAdminFields } from '@/lib/db';
import { parseMotoForm, MOTO_UPSERT_COLUMNS } from '@/lib/motos';
import { ESTADOS_PUBLICOS, ESTADOS_TERMINAIS, type MotoEstado } from '@/lib/moto-estados';

export const dynamic = 'force-dynamic';
import { saveFile, UPLOADS_DIR } from '@/lib/upload';
import fs from 'fs';
import path from 'path';
import { FOTOS_DIR } from '@/lib/upload';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const db = getDb();
    const moto = db.prepare('SELECT * FROM motos WHERE id=?').get(Number(id)) as
      | Record<string, unknown>
      | undefined;
    if (!moto) {
      return NextResponse.json({ error: 'Não encontrada' }, { status: 404 });
    }
    const isAdmin = isAuthenticated(request);
    if (!isAdmin) {
      return NextResponse.json(stripAdminFields(moto));
    }
    // Admin: anexa total/quantidade de ordens de oficina vinculadas para cálculo de lucro
    const oficina = db
      .prepare(
        `SELECT
           COALESCE(SUM(COALESCE(valor_final, valor_estimado, 0)), 0) AS total,
           COUNT(*) AS count
         FROM oficina_ordens WHERE moto_id = ?`,
      )
      .get(Number(id)) as { total: number; count: number } | undefined;
    const payload = {
      ...moto,
      oficina_total: oficina?.total ?? 0,
      oficina_count: oficina?.count ?? 0,
    };
    return NextResponse.json(payload);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Erro interno';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, context: RouteContext) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  try {
    const { id } = await context.params;
    const db = getDb();
    const old = db.prepare('SELECT * FROM motos WHERE id=?').get(Number(id)) as Record<string, unknown> | undefined;
    if (!old) {
      return NextResponse.json({ error: 'Não encontrada' }, { status: 404 });
    }

    const formData = await request.formData();
    const fields = parseMotoForm(formData);
    const imagem_atual = formData.get('imagem_atual') as string | null;

    let imagem: string | null;
    const file = formData.get('imagem') as File | null;
    if (file && file.size > 0) {
      imagem = await saveFile(file, UPLOADS_DIR);
    } else if (imagem_atual !== null && imagem_atual !== undefined) {
      imagem = imagem_atual;
    } else {
      imagem = (old.imagem as string | null) ?? null;
    }

    const cols = [...MOTO_UPSERT_COLUMNS, 'imagem'];
    const setClause = cols.map((c) => `${c}=?`).join(',');
    const values = cols.map((c) => (c === 'imagem' ? imagem : (fields as Record<string, unknown>)[c]));

    db.prepare(`UPDATE motos SET ${setClause} WHERE id=?`).run(...values, Number(id));

    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Erro interno';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  // Requer senha de confirmação para evitar exclusão acidental
  const DELETE_PASSWORD = process.env.DELETE_PASSWORD || 'Anuntech@2001';
  const provided =
    request.headers.get('x-delete-password') ||
    new URL(request.url).searchParams.get('password') ||
    '';
  if (provided !== DELETE_PASSWORD) {
    return NextResponse.json({ error: 'Senha incorreta' }, { status: 403 });
  }

  try {
    const { id } = await context.params;
    const motoId = Number(id);
    const db = getDb();

    const existe = db.prepare('SELECT id FROM motos WHERE id=?').get(motoId);
    if (!existe) return NextResponse.json({ error: 'Moto não encontrada' }, { status: 404 });

    // ── Arquivos físicos (apaga FORA da transaction) ──

    // 1. Fotos de galeria (/fotos/<filename>)
    const fotos = db.prepare('SELECT filename FROM fotos WHERE moto_id=?').all(motoId) as { filename: string }[];
    for (const f of fotos) {
      const fp = path.join(FOTOS_DIR, f.filename);
      try { if (fs.existsSync(fp)) fs.unlinkSync(fp); } catch { /* silencioso */ }
    }

    // 2. Comprovantes de venda (em /uploads/) — coleta as URLs antes do DELETE
    const comprovUrls = db
      .prepare(
        `SELECT vc.url FROM venda_comprovantes vc
         JOIN vendas v ON v.id = vc.venda_id
         WHERE v.moto_id = ?`,
      )
      .all(motoId) as { url: string }[];
    for (const c of comprovUrls) {
      if (c.url && c.url.startsWith('/uploads/')) {
        const fp = path.join(UPLOADS_DIR, path.basename(c.url));
        try { if (fs.existsSync(fp)) fs.unlinkSync(fp); } catch { /* silencioso */ }
      }
    }

    // ── Delete em cascade manual dentro de transaction ──
    const tx = db.transaction(() => {
      // IDs de entidades filhas (precisamos deles pra deletar lancamentos)
      const vendasIds = db.prepare('SELECT id FROM vendas WHERE moto_id=?').all(motoId) as { id: number }[];
      const reservasIds = db.prepare('SELECT id FROM reservas WHERE moto_id=?').all(motoId) as { id: number }[];
      const consigIds = db.prepare('SELECT id FROM consignacoes WHERE moto_id=?').all(motoId) as { id: number }[];
      const aluguelIds = db.prepare('SELECT id FROM alugueis WHERE moto_id=?').all(motoId) as { id: number }[];

      // 1. Comissões (FK sem cascade) — preciso deletar ANTES de vendas
      if (vendasIds.length > 0) {
        const placeholders = vendasIds.map(() => '?').join(',');
        db.prepare(`DELETE FROM comissoes WHERE venda_id IN (${placeholders})`).run(...vendasIds.map((v) => v.id));
      }

      // 2. Lancamentos das vendas (ref_tipo='venda')
      if (vendasIds.length > 0) {
        const placeholders = vendasIds.map(() => '?').join(',');
        db.prepare(`DELETE FROM lancamentos WHERE ref_tipo='venda' AND ref_id IN (${placeholders})`).run(...vendasIds.map((v) => v.id));
      }

      // 3. Vendas (cascateia venda_comprovantes)
      db.prepare('DELETE FROM vendas WHERE moto_id=?').run(motoId);

      // 4. Reservas + lancamentos
      if (reservasIds.length > 0) {
        const placeholders = reservasIds.map(() => '?').join(',');
        db.prepare(`DELETE FROM lancamentos WHERE ref_tipo='reserva' AND ref_id IN (${placeholders})`).run(...reservasIds.map((r) => r.id));
      }
      db.prepare('DELETE FROM reservas WHERE moto_id=?').run(motoId);

      // 5. Consignações + lancamentos
      if (consigIds.length > 0) {
        const placeholders = consigIds.map(() => '?').join(',');
        db.prepare(`DELETE FROM lancamentos WHERE ref_tipo='consignacao' AND ref_id IN (${placeholders})`).run(...consigIds.map((c) => c.id));
      }
      db.prepare('DELETE FROM consignacoes WHERE moto_id=?').run(motoId);

      // 6. Aluguéis + lancamentos
      if (aluguelIds.length > 0) {
        const placeholders = aluguelIds.map(() => '?').join(',');
        db.prepare(`DELETE FROM lancamentos WHERE ref_tipo='aluguel' AND ref_id IN (${placeholders})`).run(...aluguelIds.map((a) => a.id));
      }
      db.prepare('DELETE FROM alugueis WHERE moto_id=?').run(motoId);

      // 7. Oficina (cascateia os_pecas e oficina_historico)
      db.prepare('DELETE FROM oficina_ordens WHERE moto_id=?').run(motoId);

      // 8. Lancamentos com ref_tipo='moto'
      db.prepare("DELETE FROM lancamentos WHERE ref_tipo='moto' AND ref_id=?").run(motoId);

      // 9. Finalmente a moto (fotos cascateia)
      db.prepare('DELETE FROM motos WHERE id=?').run(motoId);
    });

    tx();
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Erro interno';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/** PATCH /api/motos/[id] — transition estado */
export async function PATCH(request: NextRequest, context: RouteContext) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }
  try {
    const { id } = await context.params;
    const db = getDb();
    const moto = db
      .prepare('SELECT id, estado, origem FROM motos WHERE id=?')
      .get(Number(id)) as { id: number; estado: string; origem: string } | undefined;
    if (!moto) {
      return NextResponse.json({ error: 'Moto não encontrada' }, { status: 404 });
    }
    if (ESTADOS_TERMINAIS.includes(moto.estado as MotoEstado)) {
      return NextResponse.json({ error: 'Moto em estado terminal' }, { status: 400 });
    }
    const body = (await request.json()) as { estado?: string };
    const novoEstado = body.estado;
    if (!novoEstado) {
      return NextResponse.json({ error: 'estado obrigatório' }, { status: 400 });
    }
    db.prepare('UPDATE motos SET estado=? WHERE id=?').run(novoEstado, moto.id);
    // Keep ativo flag in sync for backward compatibility
    const isPublic = ESTADOS_PUBLICOS.includes(novoEstado as MotoEstado) ? 1 : 0;
    db.prepare('UPDATE motos SET ativo=? WHERE id=?').run(isPublic, moto.id);
    return NextResponse.json({ ok: true, estado: novoEstado });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Erro interno';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
