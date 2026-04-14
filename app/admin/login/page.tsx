'use client';

import { useEffect, useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import styles from './page.module.css';

export default function LoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [logo, setLogo] = useState<string>('');

  useEffect(() => {
    let cancelled = false;
    // If already logged in, redirect to admin
    fetch('/api/auth')
      .then((r) => r.json())
      .then((d: { isAdmin: boolean }) => {
        if (!cancelled && d.isAdmin) router.replace('/admin');
      })
      .catch(() => {});
    fetch('/api/config/logo')
      .then((r) => r.json())
      .then((d: { logo?: string }) => {
        if (!cancelled && d.logo) setLogo(d.logo);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [router]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(false);
    setSubmitting(true);
    try {
      const r = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'login', password }),
      });
      if (r.ok) {
        router.replace('/admin');
      } else {
        setError(true);
        setSubmitting(false);
      }
    } catch {
      setError(true);
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.loginScreen}>
      <form className={styles.loginCard} onSubmit={onSubmit}>
        <div className={styles.loginLogo}>
          {logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logo} alt="Busca Racing" className={styles.loginLogoImg} />
          ) : (
            <>
              <span style={{ color: '#27367D' }}>BUSCA</span>
              <span style={{ color: '#DC2627' }}>&nbsp;RACING</span>
            </>
          )}
        </div>
        <div className={styles.loginSubtitle}>Área Administrativa</div>

        {error && <div className={styles.loginError}>Senha incorreta. Tente novamente.</div>}

        <div className={styles.formGroup}>
          <label htmlFor="senha">Senha de acesso</label>
          <input
            id="senha"
            type="password"
            placeholder="••••••••••"
            autoFocus
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <button type="submit" className={styles.btnFull} disabled={submitting}>
          {submitting ? 'Entrando...' : 'Entrar'}
        </button>
      </form>
    </div>
  );
}
