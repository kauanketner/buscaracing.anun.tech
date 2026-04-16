/**
 * Root do PWA — decide para onde mandar o mecânico.
 *
 * Se já tem cookie válido -> redireciona pra lista de OSs.
 * Caso contrário -> redireciona pra tela de login.
 */
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { MECANICO_COOKIE, parseMecanicoSession, loadActiveMecanico } from '@/lib/mecanico-auth';

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ slug: string }> };

export default async function MecanicoRoot({ params }: Props) {
  const { slug } = await params;
  const jar = await cookies();
  const token = jar.get(MECANICO_COOKIE)?.value;
  const parsed = parseMecanicoSession(token);
  const tec = parsed ? loadActiveMecanico(parsed.mecanicoId) : null;

  if (tec) {
    redirect(`/m/${slug}/ordens`);
  }
  redirect(`/m/${slug}/login`);
}
