'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useToast } from '@/components/Toast';
import styles from '../../vendas/page.module.css';

type Item = { id: number; tipo: string; label: string; ordem: number };
type Resposta = { id: number; preenchido_por: string; created_at: string };
type ChecklistDetail = {
  id: number;
  titulo: string;
  descricao: string;
  token: string;
  ativo: number;
  itens: Item[];
  respostas: Resposta[];
};

function fmtDateTime(iso: string): string {
  if (!iso) return '—';
  const d = new Date(iso.replace(' ', 'T'));
  return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

const TIPO_ICONS: Record<string, string> = { checkbox: '☑', texto: '✏', foto: '📷' };

export default function ChecklistDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const { showToast } = useToast();

  const [data, setData] = useState<ChecklistDetail | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const r = await fetch(`/api/checklists/${id}`);
      if (r.ok) setData(await r.json());
    } catch {
      showToast('Erro ao carregar', 'error');
    } finally {
      setLoading(false);
    }
  }, [id, showToast]);

  useEffect(() => { load(); }, [load]);

  const origin = typeof window !== 'undefined' ? window.location.origin : '';

  if (loading) return <div className={styles.wrap} style={{ padding: '2rem', color: '#777' }}>Carregando...</div>;
  if (!data) return <div className={styles.wrap} style={{ padding: '2rem', color: '#777' }}>Checklist não encontrado.</div>;

  return (
    <div className={styles.wrap}>
      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.6rem', color: '#27367D', margin: '0 0 4px' }}>
          {data.titulo}
        </h2>
        {data.descricao && <p style={{ color: '#777', fontSize: '0.88rem', margin: 0 }}>{data.descricao}</p>}
        <div style={{ marginTop: 10, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <span className={styles.badge} style={{
            background: data.ativo ? '#d4edda' : '#e2e3e5',
            color: data.ativo ? '#155724' : '#555',
          }}>
            {data.ativo ? 'Ativo' : 'Inativo'}
          </span>
          <code style={{ fontSize: '0.78rem', color: '#27367D', background: '#f8f8f5', padding: '4px 8px', border: '1px solid #e4e4e0' }}>
            {origin}/checklist/{data.token}
          </code>
          <button
            type="button"
            onClick={() => {
              navigator.clipboard.writeText(`${origin}/checklist/${data.token}`);
              showToast('Link copiado!', 'success');
            }}
            style={{
              background: 'none', border: '1px solid #e4e4e0', padding: '4px 10px',
              fontSize: '0.72rem', cursor: 'pointer', fontFamily: "'Barlow Condensed', sans-serif",
              fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#27367D',
            }}
          >
            Copiar link
          </button>
        </div>
      </div>

      {/* Items */}
      <div style={{ background: '#fff', border: '1px solid #e4e4e0', padding: '1rem 1.25rem', marginBottom: '1.5rem' }}>
        <div style={{ fontSize: '0.72rem', color: '#777', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 700, marginBottom: 10 }}>
          Itens ({data.itens.length})
        </div>
        {data.itens.map((item, i) => (
          <div key={item.id} style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '6px 0', borderBottom: i < data.itens.length - 1 ? '1px solid #f1f1ee' : 'none' }}>
            <span style={{ fontSize: '0.9rem', width: 24, textAlign: 'center' }}>{TIPO_ICONS[item.tipo] || '·'}</span>
            <span style={{ flex: 1, fontSize: '0.9rem' }}>{item.label}</span>
            <span className={styles.badge} style={{ background: '#f0f0ed', color: '#777', fontSize: '0.65rem' }}>{item.tipo}</span>
          </div>
        ))}
      </div>

      {/* History */}
      <div style={{ background: '#fff', border: '1px solid #e4e4e0', padding: '1rem 1.25rem' }}>
        <div style={{ fontSize: '0.72rem', color: '#777', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 700, marginBottom: 10 }}>
          Historico de preenchimentos ({data.respostas.length})
        </div>
        {data.respostas.length === 0 ? (
          <p style={{ color: '#999', fontSize: '0.85rem' }}>Nenhum preenchimento ainda.</p>
        ) : (
          <table className={styles.table} style={{ margin: 0 }}>
            <thead>
              <tr>
                <th>#</th>
                <th>Preenchido por</th>
                <th>Data/Hora</th>
              </tr>
            </thead>
            <tbody>
              {data.respostas.map((r, i) => (
                <tr key={r.id}>
                  <td className={styles.tdSub}>{data.respostas.length - i}</td>
                  <td className={styles.tdName}>{r.preenchido_por}</td>
                  <td className={styles.tdSub}>{fmtDateTime(r.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
