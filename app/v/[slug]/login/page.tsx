'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useToast } from '@/components/Toast';

export default function VendedorLoginPage() {
  const params = useParams();
  const router = useRouter();
  const slug = (params?.slug as string) || '';
  const { showToast } = useToast();

  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d{4,8}$/.test(pin)) { setError('PIN inválido.'); return; }
    setError(null);
    setLoading(true);
    try {
      const r = await fetch('/api/vendedor/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      });
      const d = await r.json().catch(() => ({}));
      if (r.status === 429) { setError('Muitas tentativas. Tente em alguns minutos.'); return; }
      if (!r.ok || !d?.ok) { setError('PIN incorreto.'); setPin(''); return; }
      showToast(`Olá, ${d?.vendedor?.nome || 'vendedor'}`, 'success');
      router.replace(`/v/${slug}/motos`);
    } catch {
      setError('Falha de conexão.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '2rem 1rem' }}>
      <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '2rem', color: '#27367D', margin: '0 0 4px' }}>
        BUSCA<span style={{ color: '#DC2627' }}> RACING</span>
      </h1>
      <p style={{ color: '#777', fontSize: '0.85rem', margin: '0 0 2rem' }}>App do Vendedor</p>

      <form onSubmit={onSubmit} style={{ width: '100%', maxWidth: 320, background: '#fff', border: '1px solid #e4e4e0', padding: '1.5rem' }}>
        <p style={{ fontSize: '0.85rem', color: '#555', margin: '0 0 1rem', textAlign: 'center' }}>Digite seu PIN</p>
        <input
          type="password"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={8}
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 8))}
          placeholder="••••••"
          disabled={loading}
          autoFocus
          style={{
            display: 'block', width: '100%', padding: '14px', fontSize: '1.4rem',
            textAlign: 'center', letterSpacing: '0.3em', border: '1.5px solid #e4e4e0',
            marginBottom: '1rem', outline: 'none', fontFamily: "'Courier New', monospace",
          }}
        />
        {error && <p style={{ color: '#dc3545', fontSize: '0.82rem', margin: '0 0 0.75rem', textAlign: 'center' }}>{error}</p>}
        <button
          type="submit"
          disabled={loading || pin.length < 4}
          style={{
            display: 'block', width: '100%', padding: '12px', background: '#27367D',
            color: '#fff', border: 'none', fontFamily: "'Barlow Condensed', sans-serif",
            fontWeight: 700, fontSize: '0.92rem', letterSpacing: '0.08em', textTransform: 'uppercase',
            cursor: 'pointer', opacity: loading || pin.length < 4 ? 0.5 : 1,
          }}
        >
          {loading ? 'Entrando...' : 'Entrar'}
        </button>
      </form>
    </div>
  );
}
