'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useToast } from '@/components/Toast';
import BottomNav from '../BottomNav';

type Profile = {
  id: number;
  nome: string;
  tipo: string;
  total_vendas: number;
  comissao_total: number;
  comissao_pendente: number;
};

export default function VendedorPerfilPage() {
  const params = useParams();
  const router = useRouter();
  const slug = (params?.slug as string) || '';
  const { showToast } = useToast();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const r = await fetch('/api/vendedor/me');
      if (r.status === 401) { router.replace(`/v/${slug}/login`); return; }
      if (!r.ok) throw new Error('fail');
      setProfile(await r.json());
    } catch {
      showToast('Erro ao carregar perfil', 'error');
    } finally {
      setLoading(false);
    }
  }, [router, slug, showToast]);

  useEffect(() => { load(); }, [load]);

  const logout = async () => {
    await fetch('/api/vendedor/logout', { method: 'POST' });
    router.replace(`/v/${slug}/login`);
  };

  if (loading) {
    return (
      <>
        <div style={{ padding: '3rem 1rem', textAlign: 'center', color: '#777' }}>Carregando...</div>
        <BottomNav slug={slug} active="perfil" />
      </>
    );
  }

  return (
    <>
      <div style={{
        position: 'sticky', top: 0, zIndex: 10, background: '#27367D', color: '#fff',
        padding: '12px 16px', paddingTop: 'calc(12px + env(safe-area-inset-top))',
      }}>
        <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.15rem', margin: 0, letterSpacing: '0.06em' }}>
          Meu perfil
        </h1>
      </div>

      <div style={{ padding: '16px' }}>
        {profile && (
          <>
            <div style={{ background: '#fff', border: '1px solid #e4e4e0', padding: '1.25rem', marginBottom: 12 }}>
              <h2 style={{ margin: '0 0 4px', fontSize: '1.2rem' }}>{profile.nome}</h2>
              <span style={{
                fontSize: '0.72rem', padding: '2px 8px', fontWeight: 700,
                textTransform: 'uppercase', letterSpacing: '0.08em',
                background: profile.tipo === 'externo' ? '#fff3cd' : '#d4edda',
                color: profile.tipo === 'externo' ? '#856404' : '#155724',
              }}>
                {profile.tipo}
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 16 }}>
              <div style={{ background: '#fff', border: '1px solid #e4e4e0', padding: '1rem', textAlign: 'center' }}>
                <div style={{ fontSize: '0.68rem', color: '#777', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700, marginBottom: 4 }}>Vendas</div>
                <div style={{ fontSize: '1.6rem', fontFamily: "'Bebas Neue', sans-serif", color: '#27367D' }}>{profile.total_vendas}</div>
              </div>
              <div style={{ background: '#fff', border: '1px solid #e4e4e0', padding: '1rem', textAlign: 'center' }}>
                <div style={{ fontSize: '0.68rem', color: '#777', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700, marginBottom: 4 }}>Comissão total</div>
                <div style={{ fontSize: '1.2rem', fontFamily: "'Bebas Neue', sans-serif", color: '#155724' }}>R$ {profile.comissao_total}</div>
              </div>
              <div style={{ background: '#fff', border: '1px solid #e4e4e0', padding: '1rem', textAlign: 'center' }}>
                <div style={{ fontSize: '0.68rem', color: '#777', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700, marginBottom: 4 }}>A receber</div>
                <div style={{ fontSize: '1.2rem', fontFamily: "'Bebas Neue', sans-serif", color: '#856404' }}>R$ {profile.comissao_pendente}</div>
              </div>
            </div>

            <button
              type="button"
              onClick={logout}
              style={{
                display: 'block', width: '100%', padding: '12px', background: '#fff',
                border: '1px solid #f0b4b9', color: '#dc3545', fontWeight: 700,
                fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.08em',
                cursor: 'pointer', fontFamily: "'Barlow Condensed', sans-serif",
              }}
            >
              Sair
            </button>
          </>
        )}
      </div>

      <BottomNav slug={slug} active="perfil" />
    </>
  );
}
