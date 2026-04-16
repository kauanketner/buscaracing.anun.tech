'use client';

/**
 * Tela de login do técnico — entrada via PIN de 6 dígitos.
 */
import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useToast } from '@/components/Toast';

export default function TecnicoLoginPage() {
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
      const r = await fetch('/api/tecnico/login', {
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
      showToast(`Olá, ${d?.tecnico?.nome || 'técnico'}`, 'success');
      router.replace(`/t/${slug}/ordens`);
    } catch {
      setError('Falha de conexão. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="tec-login-wrap">
      <h1 className="tec-login-brand">
        BUSCA<span className="accent"> RACING</span>
      </h1>
      <p className="tec-login-sub">App da Oficina</p>

      <form className="tec-login-card" onSubmit={onSubmit}>
        <p className="tec-login-label">Digite seu PIN</p>
        <input
          type="password"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={8}
          className="tec-pin-input"
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 8))}
          placeholder="••••••"
          disabled={loading}
          autoFocus
        />
        {error && <p className="tec-error">{error}</p>}
        <button
          type="submit"
          className="tec-btn-primary"
          disabled={loading || pin.length < 4}
        >
          {loading ? 'Entrando…' : 'Entrar'}
        </button>
      </form>
    </div>
  );
}
