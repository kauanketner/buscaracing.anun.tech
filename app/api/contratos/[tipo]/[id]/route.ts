import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/auth';
import {
  gerarContratoCompra,
  gerarContratoConsignacao,
  gerarContratoVenda,
  gerarContratoOS,
  gerarReciboReserva,
  gerarTermoEntrega,
  gerarContratoAluguel,
  gerarReciboPDV,
} from '@/lib/pdf-contrato';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ tipo: string; id: string }> };

const GENERATORS: Record<string, (id: number) => Promise<Buffer>> = {
  compra: gerarContratoCompra,
  consignacao: gerarContratoConsignacao,
  venda: gerarContratoVenda,
  os: gerarContratoOS,
  reserva: gerarReciboReserva,
  entrega: gerarTermoEntrega,
  aluguel: gerarContratoAluguel,
  pdv: gerarReciboPDV,
};

const FILENAMES: Record<string, string> = {
  compra: 'contrato-compra',
  consignacao: 'contrato-consignacao',
  venda: 'contrato-venda',
  os: 'ordem-servico',
  reserva: 'recibo-reserva',
  entrega: 'termo-entrega',
  aluguel: 'contrato-aluguel',
  pdv: 'recibo-pdv',
};

/** GET /api/contratos/[tipo]/[id] — generate and return PDF */
export async function GET(request: NextRequest, context: RouteContext) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }
  const { tipo, id } = await context.params;
  const generator = GENERATORS[tipo];
  if (!generator) {
    return NextResponse.json({ error: `Tipo de contrato inválido: ${tipo}` }, { status: 400 });
  }
  try {
    const pdf = await generator(Number(id));
    const filename = `${FILENAMES[tipo] || tipo}-${id}.pdf`;
    return new NextResponse(new Uint8Array(pdf), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Erro ao gerar PDF';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
