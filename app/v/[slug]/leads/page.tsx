'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useToast } from '@/components/Toast';
import BottomNav from '../BottomNav';

type Lead = {
  id: number;
  moto_id: number | null;
  moto_nome: string | null;
  moto_marca: string | null;
  nome: string;
  telefone: string;
  origem: string;
  notas: string;
  status: string;
  created_at: string;
};

type MotoOpt = { id: number; nome: string; marca: string };

export default function VendedorLeadsPage() {
  const params = useParams();
  const router = useRouter();
  const slug = (params?.slug as string) || '';
  const { showToast } = useToast();

  const [leads, setLeads] = useState<Lead[]>([]);
  const [motos, setMotos] = useState<MotoOpt[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');
  const [motoId, setMotoId] = useState('');
  const [origem, setOrigem] = useState('');
  const [notas, setNotas] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const [lr, mr] = await Promise.all([
        fetch('/api/vendedor/leads'),
        fetch('/api/vendedor/motos'),
      ]);
      if (lr.status === 401) { router.replace(`/v/${slug}/login`); return; }
      if (lr.ok) setLeads(await lr.json());
      if (mr.ok) setMotos(await mr.json());
    } catch {
      showToast('Erro ao carregar', 'error');
    } finally {
      setLoading(false);
    }
  }, [router, slug, showToast]);

  useEffect(() => { load(); }, [load]);

  const addLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) { showToast('Nome obrigatório', 'error'); return; }
    setSaving(true);
    try {
      const r = await fetch('/api/vendedor/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: nome.trim(),
          telefone: telefone.trim(),
          moto_id: motoId ? Number(motoId) : null,
          origem: origem.trim(),
          notas: notas.trim(),
        }),
      });
      if (!r.ok) throw new Error('fail');
      showToast('Lead registrado!', 'success');
      setNome(''); setTelefone(''); setMotoId(''); setOrigem(''); setNotas('');
      setShowForm(false);
      await load();
    } catch {
      showToast('Erro ao salvar', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div style={{
        position: 'sticky', top: 0, zIndex: 10, background: '#27367D', color: '#fff',
        padding: '12px 16px', paddingTop: 'calc(12px + env(safe-area-inset-top))',
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <h1 style={{ flex: 1, fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.15rem', margin: 0, letterSpacing: '0.06em' }}>
          Meus leads
        </h1>
        <button
          type="button"
          onClick={() => setShowForm(!showForm)}
          style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', padding: '6px 12px', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.08em' }}
        >
          {showForm ? 'Fechar' : '+ Novo lead'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={addLead} style={{ background: '#fff', border: '1px solid #e4e4e0', margin: '12px 16px', padding: '1rem' }}>
          <input type="text" placeholder="Nome do cliente *" value={nome} onChange={(e) => setNome(e.target.value)} required
            style={{ display: 'block', width: '100%', padding: '10px', border: '1px solid #e4e4e0', marginBottom: 8, fontSize: '0.9rem' }} />
          <input type="text" placeholder="Telefone" value={telefone} onChange={(e) => setTelefone(e.target.value)}
            style={{ display: 'block', width: '100%', padding: '10px', border: '1px solid #e4e4e0', marginBottom: 8, fontSize: '0.9rem' }} />
          <select value={motoId} onChange={(e) => setMotoId(e.target.value)}
            style={{ display: 'block', width: '100%', padding: '10px', border: '1px solid #e4e4e0', marginBottom: 8, fontSize: '0.9rem' }}>
            <option value="">Moto interessada (opcional)</option>
            {motos.map((m) => <option key={m.id} value={String(m.id)}>{m.nome} — {m.marca}</option>)}
          </select>
          <select value={origem} onChange={(e) => setOrigem(e.target.value)}
            style={{ display: 'block', width: '100%', padding: '10px', border: '1px solid #e4e4e0', marginBottom: 8, fontSize: '0.9rem' }}>
            <option value="">Como soube? (opcional)</option>
            <option value="instagram">Instagram</option>
            <option value="site">Site</option>
            <option value="indicacao">Indicação</option>
            <option value="presencial">Presencial</option>
            <option value="whatsapp">WhatsApp</option>
          </select>
          <textarea placeholder="Notas" value={notas} onChange={(e) => setNotas(e.target.value)} rows={2}
            style={{ display: 'block', width: '100%', padding: '10px', border: '1px solid #e4e4e0', marginBottom: 8, fontSize: '0.9rem', resize: 'vertical' }} />
          <button type="submit" disabled={saving}
            style={{ width: '100%', padding: '12px', background: '#27367D', color: '#fff', border: 'none', fontWeight: 700, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.08em', cursor: 'pointer', opacity: saving ? 0.5 : 1 }}>
            {saving ? 'Salvando...' : 'Registrar lead'}
          </button>
        </form>
      )}

      <div style={{ padding: '0 16px' }}>
        {loading && <p style={{ color: '#777', textAlign: 'center', padding: '2rem 0' }}>Carregando...</p>}
        {!loading && leads.length === 0 && (
          <p style={{ color: '#777', textAlign: 'center', padding: '2rem 0' }}>Nenhum lead registrado. Toque em "+ Novo lead".</p>
        )}
        {leads.map((l) => (
          <div key={l.id} style={{ background: '#fff', border: '1px solid #e4e4e0', padding: '12px 14px', marginBottom: 8 }}>
            <div style={{ fontWeight: 600, fontSize: '0.92rem' }}>{l.nome}</div>
            {l.telefone && <div style={{ color: '#777', fontSize: '0.82rem' }}>{l.telefone}</div>}
            {l.moto_nome && <div style={{ color: '#27367D', fontSize: '0.82rem', marginTop: 2 }}>{l.moto_nome} — {l.moto_marca}</div>}
            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              {l.origem && <span style={{ fontSize: '0.68rem', padding: '2px 6px', background: '#e2e3e5', color: '#383d41', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{l.origem}</span>}
              <span style={{ fontSize: '0.68rem', color: '#999' }}>
                {l.created_at ? new Date(l.created_at.replace(' ', 'T')).toLocaleDateString('pt-BR') : ''}
              </span>
            </div>
            {l.notas && <div style={{ fontSize: '0.82rem', color: '#555', marginTop: 4, fontStyle: 'italic' }}>{l.notas}</div>}
          </div>
        ))}
      </div>

      <BottomNav slug={slug} active="leads" />
    </>
  );
}
