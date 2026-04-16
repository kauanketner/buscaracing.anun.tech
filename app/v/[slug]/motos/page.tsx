'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useToast } from '@/components/Toast';
import BottomNav from '../BottomNav';

type Moto = {
  id: number;
  nome: string;
  marca: string;
  modelo: string;
  ano: number | null;
  preco: number | null;
  imagem: string | null;
  estado: string;
  km: number | null;
  dias_estoque: number;
};

export default function VendedorMotosPage() {
  const params = useParams();
  const router = useRouter();
  const slug = (params?.slug as string) || '';
  const { showToast } = useToast();

  const [motos, setMotos] = useState<Moto[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    try {
      const r = await fetch('/api/vendedor/motos');
      if (r.status === 401) { router.replace(`/v/${slug}/login`); return; }
      if (!r.ok) throw new Error('fail');
      setMotos(await r.json());
    } catch {
      showToast('Erro ao carregar motos', 'error');
    } finally {
      setLoading(false);
    }
  }, [router, slug, showToast]);

  useEffect(() => { load(); }, [load]);

  const filtered = search
    ? motos.filter((m) => `${m.nome} ${m.marca}`.toLowerCase().includes(search.toLowerCase()))
    : motos;

  return (
    <>
      {/* Topbar */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 10, background: '#27367D', color: '#fff',
        padding: '12px 16px', paddingTop: 'calc(12px + env(safe-area-inset-top))',
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <h1 style={{ flex: 1, fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.15rem', margin: 0, letterSpacing: '0.06em' }}>
          Motos disponíveis
        </h1>
        <span style={{ fontSize: '0.72rem', opacity: 0.85 }}>{filtered.length} motos</span>
      </div>

      {/* Search */}
      <div style={{ padding: '12px 16px' }}>
        <input
          type="text"
          placeholder="Buscar moto..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            width: '100%', padding: '10px 14px', border: '1.5px solid #e4e4e0',
            fontSize: '0.9rem', background: '#fff', outline: 'none',
          }}
        />
      </div>

      {/* Cards */}
      <div style={{ padding: '0 16px' }}>
        {loading && <p style={{ color: '#777', textAlign: 'center', padding: '2rem 0' }}>Carregando...</p>}
        {!loading && filtered.length === 0 && (
          <p style={{ color: '#777', textAlign: 'center', padding: '2rem 0' }}>Nenhuma moto disponível.</p>
        )}
        {filtered.map((m) => (
          <div key={m.id} style={{
            background: '#fff', border: '1px solid #e4e4e0', marginBottom: 12,
            display: 'flex', gap: 12, overflow: 'hidden',
          }}>
            {m.imagem ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={m.imagem} alt={m.nome} style={{ width: 100, height: 80, objectFit: 'cover', flexShrink: 0 }} />
            ) : (
              <div style={{ width: 100, height: 80, background: '#f0f0ed', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="18" height="18" rx="2" stroke="#ccc" strokeWidth="2" /></svg>
              </div>
            )}
            <div style={{ flex: 1, padding: '8px 12px 8px 0', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <div style={{ fontWeight: 600, fontSize: '0.92rem' }}>{m.nome}</div>
              <div style={{ color: '#777', fontSize: '0.78rem' }}>
                {m.marca} {m.ano ? `· ${m.ano}` : ''} {m.km ? `· ${m.km.toLocaleString('pt-BR')} km` : ''}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                <strong style={{ color: '#27367D', fontSize: '0.95rem' }}>
                  {m.preco ? `R$ ${Number(m.preco).toLocaleString('pt-BR')}` : '—'}
                </strong>
                <span style={{
                  fontSize: '0.68rem', padding: '2px 6px', fontWeight: 700,
                  textTransform: 'uppercase', letterSpacing: '0.08em',
                  background: m.estado === 'reservada' ? '#d6d8ff' : '#d4edda',
                  color: m.estado === 'reservada' ? '#27367D' : '#155724',
                }}>
                  {m.estado === 'reservada' ? 'Reservada' : `${m.dias_estoque}d`}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <BottomNav slug={slug} active="motos" />
    </>
  );
}
