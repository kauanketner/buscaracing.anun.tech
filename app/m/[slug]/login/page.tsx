'use client';

/**
 * Tela de login do mecânico — entrada via PIN de 6 dígitos.
 */
import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useToast } from '@/components/Toast';

export default function MecanicoLoginPage() {
  const params = useParams();
  const router = useRouter();
  const slug = (params?.slug as string) || '';
  const { showToast } = useToast();

  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d{4,8}$/.test(pin)) {
      setError('PIN inválido.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const r = await fetch('/api/mecanico/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      });
      const d = await r.json().catch(() => ({}));
      if (r.status === 429) {
        setError('Muitas tentativas. Tente de novo em alguns minutos.');
        return;
      }
      if (!r.ok || !d?.ok) {
        setError('PIN incorreto.');
        setPin('');
        return;
      }
      showToast(`Olá, ${d?.mecanico?.nome || 'mecânico'}`, 'success');
      router.replace(`/m/${slug}/ordens`);
    } catch {
      setError('Falha de conexão. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mec-login-wrap">
      <h1 className="mec-login-brand">
        BUSCA<span className="accent"> RACING</span>
      </h1>
      <p className="mec-login-sub">App da Oficina</p>

      <form className="mec-login-card" onSubmit={onSubmit}>
        <p className="mec-login-label">Digite seu PIN</p>
        <input
          type="password"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={8}
          className="mec-pin-input"
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 8))}
          placeholder="••••••"
          disabled={loading}
          autoFocus
        />
        {error && <p className="mec-error">{error}</p>}
        <button
          type="submit"
          className="mec-btn-primary"
          disabled={loading || pin.length < 4}
        >
          {loading ? 'Entrando…' : 'Entrar'}
        </button>
      </form>
    </div>
  );
}
