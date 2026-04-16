'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { useToast } from '@/components/Toast';

type Item = { id: number; tipo: string; label: string; ordem: number };
type ChecklistData = { id: number; titulo: string; descricao: string; itens: Item[] };

export default function ChecklistFillPage() {
  const params = useParams();
  const token = params?.token as string;
  const { showToast } = useToast();

  const [data, setData] = useState<ChecklistData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nome, setNome] = useState('');
  const [respostas, setRespostas] = useState<Record<number, { checkbox: boolean; texto: string; foto: string }>>({});
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const fileRefs = useRef<Record<number, HTMLInputElement | null>>({});

  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const r = await fetch(`/api/checklists/public/${token}`);
        if (!r.ok) { setError(r.status === 404 ? 'Checklist não encontrado ou desativado.' : 'Erro.'); return; }
        const d: ChecklistData = await r.json();
        setData(d);
        const init: typeof respostas = {};
        for (const item of d.itens) {
          init[item.id] = { checkbox: false, texto: '', foto: '' };
        }
        setRespostas(init);
      } catch {
        setError('Falha de conexão.');
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  const updateResp = (itemId: number, field: 'checkbox' | 'texto' | 'foto', val: boolean | string) => {
    setRespostas((prev) => ({
      ...prev,
      [itemId]: { ...prev[itemId], [field]: val },
    }));
  };

  const handleFoto = async (itemId: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const fd = new FormData();
      fd.append('file', file);
      const r = await fetch('/api/upload', { method: 'POST', body: fd });
      if (!r.ok) throw new Error('fail');
      const d = await r.json();
      if (d.url) updateResp(itemId, 'foto', d.url);
    } catch {
      showToast('Erro ao enviar foto', 'error');
    }
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) { showToast('Digite seu nome', 'error'); return; }
    if (!data) return;
    setSending(true);
    try {
      const respArray = data.itens.map((item) => ({
        item_id: item.id,
        valor_checkbox: respostas[item.id]?.checkbox ? 1 : 0,
        valor_texto: respostas[item.id]?.texto || '',
        valor_foto: respostas[item.id]?.foto || '',
      }));
      const r = await fetch(`/api/checklists/public/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preenchido_por: nome.trim(), respostas: respArray }),
      });
      if (!r.ok) throw new Error('fail');
      setSent(true);
      showToast('Checklist enviado!', 'success');
    } catch {
      showToast('Erro ao enviar', 'error');
    } finally {
      setSending(false);
    }
  };

  if (loading) return <div style={{ padding: '3rem', textAlign: 'center', color: '#777' }}>Carregando...</div>;
  if (error || !data) {
    return (
      <div style={{ padding: '3rem 1.5rem', textAlign: 'center' }}>
        <h2 style={{ color: '#27367D', fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.8rem', marginBottom: 8 }}>
          BUSCA<span style={{ color: '#DC2627' }}> RACING</span>
        </h2>
        <p style={{ color: '#777' }}>{error || 'Não encontrado.'}</p>
      </div>
    );
  }

  if (sent) {
    return (
      <div style={{ padding: '3rem 1.5rem', textAlign: 'center', maxWidth: 480, margin: '0 auto' }}>
        <div style={{ fontSize: '3rem', marginBottom: 12 }}>✓</div>
        <h2 style={{ color: '#155724', fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.6rem', marginBottom: 8 }}>
          Checklist enviado!
        </h2>
        <p style={{ color: '#777', fontSize: '0.88rem' }}>
          Obrigado, {nome}. O registro foi salvo.
        </p>
        <button
          type="button"
          onClick={() => {
            setSent(false);
            setNome('');
            const init: typeof respostas = {};
            for (const item of data.itens) init[item.id] = { checkbox: false, texto: '', foto: '' };
            setRespostas(init);
          }}
          style={{
            marginTop: 20, padding: '12px 24px', background: '#27367D', color: '#fff',
            border: 'none', fontWeight: 700, fontSize: '0.88rem', cursor: 'pointer',
            textTransform: 'uppercase', letterSpacing: '0.08em',
          }}
        >
          Preencher novamente
        </button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 520, margin: '0 auto', padding: '1rem' }}>
      {/* Header */}
      <div style={{ textAlign: 'center', padding: '1.5rem 0 1rem' }}>
        <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.4rem', color: '#27367D', margin: 0 }}>
          BUSCA<span style={{ color: '#DC2627' }}> RACING</span>
        </h1>
      </div>

      <div style={{ background: '#27367D', color: '#fff', padding: '1rem 1.25rem', marginBottom: '1rem' }}>
        <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>{data.titulo}</h2>
        {data.descricao && <p style={{ margin: '4px 0 0', fontSize: '0.82rem', opacity: 0.85 }}>{data.descricao}</p>}
      </div>

      <form onSubmit={onSubmit}>
        {/* Nome */}
        <div style={{ background: '#fff', border: '1px solid #e4e4e0', padding: '1rem 1.25rem', marginBottom: '1rem' }}>
          <label style={{ display: 'block', fontSize: '0.72rem', color: '#777', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 700, marginBottom: 6 }}>
            Seu nome *
          </label>
          <input
            type="text"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Digite seu nome"
            required
            autoFocus
            style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #e4e4e0', fontSize: '0.92rem', outline: 'none' }}
          />
        </div>

        {/* Items */}
        {data.itens.map((item) => (
          <div key={item.id} style={{ background: '#fff', border: '1px solid #e4e4e0', padding: '1rem 1.25rem', marginBottom: 8 }}>
            {item.tipo === 'checkbox' && (
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: '0.92rem' }}>
                <input
                  type="checkbox"
                  checked={respostas[item.id]?.checkbox || false}
                  onChange={(e) => updateResp(item.id, 'checkbox', e.target.checked)}
                  style={{ width: 20, height: 20, accentColor: '#27367D' }}
                />
                {item.label}
              </label>
            )}
            {item.tipo === 'texto' && (
              <>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: 6 }}>{item.label}</label>
                <textarea
                  value={respostas[item.id]?.texto || ''}
                  onChange={(e) => updateResp(item.id, 'texto', e.target.value)}
                  placeholder="Digite aqui..."
                  rows={2}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #e4e4e0', fontSize: '0.88rem', resize: 'vertical' }}
                />
              </>
            )}
            {item.tipo === 'foto' && (
              <>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: 6 }}>{item.label}</label>
                {respostas[item.id]?.foto ? (
                  <div style={{ position: 'relative' }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={respostas[item.id].foto} alt="" style={{ width: '100%', maxHeight: 200, objectFit: 'cover', border: '1px solid #e4e4e0' }} />
                    <button
                      type="button"
                      onClick={() => { updateResp(item.id, 'foto', ''); if (fileRefs.current[item.id]) fileRefs.current[item.id]!.value = ''; }}
                      style={{ position: 'absolute', top: 4, right: 4, background: 'rgba(0,0,0,0.6)', color: '#fff', border: 'none', padding: '4px 8px', cursor: 'pointer', fontSize: '0.75rem' }}
                    >
                      Remover
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileRefs.current[item.id]?.click()}
                    style={{
                      width: '100%', padding: '20px', border: '2px dashed #e4e4e0', background: '#fafaf8',
                      cursor: 'pointer', color: '#777', fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    }}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" stroke="currentColor" strokeWidth="2" /><circle cx="12" cy="13" r="4" stroke="currentColor" strokeWidth="2" /></svg>
                    Tirar / enviar foto
                  </button>
                )}
                <input
                  ref={(el) => { fileRefs.current[item.id] = el; }}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={(e) => handleFoto(item.id, e)}
                  style={{ display: 'none' }}
                />
              </>
            )}
          </div>
        ))}

        {/* Submit */}
        <button
          type="submit"
          disabled={sending}
          style={{
            display: 'block', width: '100%', padding: '14px', background: '#27367D', color: '#fff',
            border: 'none', fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer',
            textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: '1rem',
            opacity: sending ? 0.5 : 1,
          }}
        >
          {sending ? 'Enviando...' : 'Enviar checklist'}
        </button>
      </form>

      <p style={{ textAlign: 'center', fontSize: '0.72rem', color: '#aaa', marginTop: '2rem' }}>
        Busca Racing — Checklist
      </p>
    </div>
  );
}
