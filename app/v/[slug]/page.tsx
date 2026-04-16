import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { VENDEDOR_COOKIE, parseVendedorSession, loadActiveVendedor } from '@/lib/vendedor-auth';

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ slug: string }> };

export default async function VendedorRoot({ params }: Props) {
  const { slug } = await params;
  const jar = await cookies();
  const token = jar.get(VENDEDOR_COOKIE)?.value;
  const parsed = parseVendedorSession(token);
  const vend = parsed ? loadActiveVendedor(parsed.vendedorId) : null;
  if (vend) redirect(`/v/${slug}/motos`);
  redirect(`/v/${slug}/login`);
}
