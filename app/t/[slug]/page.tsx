/**
 * Root do PWA — decide para onde mandar o técnico.
 *
 * Se já tem cookie válido -> redireciona pra lista de OSs.
 * Caso contrário -> redireciona pra tela de login.
 */
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { TECNICO_COOKIE, parseTecnicoSession, loadActiveTecnico } from '@/lib/tecnico-auth';

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ slug: string }> };

export default async function TecnicoRoot({ params }: Props) {
  const { slug } = await params;
  const jar = await cookies();
  const token = jar.get(TECNICO_COOKIE)?.value;
  const parsed = parseTecnicoSession(token);
  const tec = parsed ? loadActiveTecnico(parsed.tecnicoId) : null;

  if (tec) {
    redirect(`/t/${slug}/ordens`);
  }
  redirect(`/t/${slug}/login`);
}
