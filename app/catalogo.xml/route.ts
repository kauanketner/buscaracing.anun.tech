import { NextResponse } from 'next/server';
import getDb from '@/lib/db';

export const dynamic = 'force-dynamic';

const SITE_URL = process.env.SITE_URL || 'https://buscaracing.com';

function escapeXml(s: unknown): string {
  if (!s) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const BODY_MAP: Record<string, string> = {
  rua: 'MOTORCYCLE',
  offroad: 'MOTORCYCLE',
  quadriciclos: 'OTHER',
  infantil: 'OTHER',
  outros: 'OTHER',
};

export async function GET() {
  try {
    const db = getDb();
    const motos = db
      .prepare('SELECT * FROM motos WHERE ativo=1 ORDER BY destaque DESC, id DESC')
      .all() as any[];

    const items = motos
      .map((m) => {
        const imgUrl = m.imagem ? `${SITE_URL}${m.imagem}` : '';
        const condition = m.condicao === 'nova' ? 'NEW' : 'USED';
        const price = m.preco
          ? `${Number(m.preco).toFixed(2).replace('.', ',')} BRL`
          : '';
        const body = BODY_MAP[m.categoria] || 'OTHER';

        return `  <listing>
${imgUrl ? `    <image><url>${escapeXml(imgUrl)}</url></image>` : ''}
    <vehicle_offer_id>BUSCA_${m.id}</vehicle_offer_id>
    <title>${escapeXml(`${m.nome} ${m.marca}${m.ano ? ' ' + m.ano : ''}`)}</title>
    <offer_description>${escapeXml(m.descricao || `${m.nome} ${m.marca} - ${m.condicao}`)}</offer_description>
    <url>${escapeXml(`${SITE_URL}/moto/${m.id}`)}</url>
${price ? `    <price>${price}</price>\n    <amount_price>${price}</amount_price>` : ''}
    <make>${escapeXml(m.marca)}</make>
    <model>${escapeXml(m.nome)}</model>
${m.ano ? `    <custom_number_0>${m.ano}</custom_number_0>` : ''}
${m.km ? `    <custom_number_1>${m.km}</custom_number_1>` : ''}
    <body_style>${body}</body_style>
    <product_tags>${escapeXml(m.categoria)}</product_tags>
    <product_tags>${condition}</product_tags>
  </listing>`;
      })
      .join('\n');

    const xml = `<?xml version="1.0" encoding="utf-8"?>
<listings>
  <title>Busca Racing - Catálogo de Motos</title>
${items}
</listings>`;

    return new NextResponse(xml, {
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
      },
    });
  } catch (e: any) {
    return new NextResponse(
      `<?xml version="1.0" encoding="utf-8"?><error>${escapeXml(e?.message)}</error>`,
      {
        status: 500,
        headers: { 'Content-Type': 'application/xml; charset=utf-8' },
      },
    );
  }
}
