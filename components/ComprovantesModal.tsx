'use client';

/**
 * Modal genérico para gerenciar comprovantes de uma venda OU reserva.
 * Reusa as APIs /api/{kind}s/[id]/comprovantes.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useToast } from '@/components/Toast';

type Comprovante = {
  id: number;
  url: string;
  nome_arquivo: string;
  tipo_mime: string;
  descricao: string;
  created_at: string;
};

type Kind = 'venda' | 'reserva';

type Props = {
  kind: Kind;
  refId: number;
  label?: string;
  onClose: () => void;
  onChanged?: () => void;
};

const MAX_COMPROVANTES = 10;

function endpoint(kind: Kind, id: number): string {
  return kind === 'venda'
    ? `/api/vendas/${id}/comprovantes`
    : `/api/reservas/${id}/comprovantes`;
}

export default function ComprovantesModal({ kind, refId, label, onClose, onChanged }: Props) {
  const { showToast } = useToast();
  const [lista, setLista] = useState<Comprovante[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    try {
      const r = await fetch(endpoint(kind, refId));
      if (!r.ok) throw new Error('fail');
      const d = await r.json();
      setLista(Array.isArray(d) ? d : []);
    } catch {
      showToast('Erro ao carregar comprovantes', 'error');
    } finally {
      setLoading(false);
    }
  }, [kind, refId, showToast]);

  useEffect(() => { load(); }, [load]);

  const onSelectFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const arr = Array.from(files);
    const espacoLivre = MAX_COMPROVANTES - lista.length;
    if (arr.length > espacoLivre) {
      showToast(`Máximo ${MAX_COMPROVANTES}. Restam ${espacoLivre}.`, 'error');
      if (inputRef.current) inputRef.current.value = '';
      return;
    }

    setUploading(true);
    let ok = 0;
    let fail = 0;
    for (const file of arr) {
      const mimeOk = file.type.startsWith('image/') || file.type === 'application/pdf';
      if (!mimeOk) { fail++; continue; }
      const fd = new FormData();
      fd.append('file', file);
      try {
        const r = await fetch(endpoint(kind, refId), { method: 'POST', body: fd });
        if (r.ok) ok++; else fail++;
      } catch { fail++; }
    }
    if (inputRef.current) inputRef.current.value = '';
    if (ok > 0) showToast(`${ok} comprovante(s) enviado(s).`, 'success');
    if (fail > 0) showToast(`${fail} falha(s) no envio.`, 'error');
    await load();
    if (onChanged) onChanged();
    setUploading(false);
  };

  const deletar = async (comp: Comprovante) => {
    if (!confirm(`Remover "${comp.nome_arquivo || 'comprovante'}"?`)) return;
    setDeletingId(comp.id);
    try {
      const r = await fetch(`${endpoint(kind, refId)}/${comp.id}`, { method: 'DELETE' });
      if (!r.ok) throw new Error('fail');
      showToast('Comprovante removido', 'success');
      await load();
      if (onChanged) onChanged();
    } catch {
      showToast('Erro ao remover', 'error');
    } finally {
      setDeletingId(null);
    }
  };

  const isImg = (mime: string) => mime && mime.startsWith('image/');

  // Estilos inline pra não depender de CSS module externo
  const overlay: React.CSSProperties = {
    position: 'fixed', inset: 0, zIndex: 500,
    background: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(4px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem',
  };
  const modalBox: React.CSSProperties = {
    background: '#FDFDFB', width: '100%', maxWidth: 680, maxHeight: '92vh',
    display: 'flex', flexDirection: 'column', boxShadow: '0 24px 60px rgba(0,0,0,0.3)',
  };
  const header: React.CSSProperties = {
    padding: '1.25rem 1.5rem', borderBottom: '1px solid #e4e4e0',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
  };
  const titleStyle: React.CSSProperties = {
    fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.4rem', color: '#27367D',
    fontWeight: 400, margin: 0,
  };
  const closeBtn: React.CSSProperties = {
    background: 'none', border: 'none', cursor: 'pointer', color: '#aaa', padding: 4,
  };
  const body: React.CSSProperties = {
    flex: 1, overflowY: 'auto', padding: '1.5rem',
  };
  const footer: React.CSSProperties = {
    padding: '1rem 1.5rem', borderTop: '1px solid #e4e4e0',
    display: 'flex', justifyContent: 'flex-end', flexShrink: 0,
  };
  const btnGhost: React.CSSProperties = {
    background: 'transparent', color: '#777', border: '1.5px solid #e4e4e0',
    padding: '9px 20px', fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700,
    fontSize: '0.85rem', letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer',
  };

  const titlePrefix = kind === 'venda' ? 'Comprovantes da venda' : 'Comprovantes da reserva';

  return (
    <div style={overlay} onClick={(e) => { if (e.target === e.currentTarget && !uploading) onClose(); }}>
      <div style={modalBox}>
        <div style={header}>
          <h3 style={titleStyle}>
            {label ? `${titlePrefix} — ${label}` : `${titlePrefix} #${refId}`}
          </h3>
          <button type="button" style={closeBtn} onClick={onClose} disabled={uploading}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div style={body}>
          <div
            style={{
              border: '1.5px dashed #e4e4e0', padding: 12, background: '#fafaf8',
              marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
            }}
          >
            <input
              ref={inputRef}
              type="file"
              accept="image/*,application/pdf"
              multiple
              onChange={(e) => onSelectFiles(e.target.files)}
              style={{ display: 'none' }}
              disabled={uploading || lista.length >= MAX_COMPROVANTES}
            />
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={uploading || lista.length >= MAX_COMPROVANTES}
              style={{
                background: '#fff', border: '1.5px solid #e4e4e0', padding: '8px 14px',
                fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: '0.78rem',
                letterSpacing: '0.08em', textTransform: 'uppercase', color: '#27367D',
                cursor: uploading || lista.length >= MAX_COMPROVANTES ? 'not-allowed' : 'pointer',
                opacity: uploading || lista.length >= MAX_COMPROVANTES ? 0.5 : 1,
              }}
            >
              {uploading ? 'Enviando...' : '+ Adicionar comprovantes'}
            </button>
            <span style={{ fontSize: '0.8rem', color: '#777' }}>
              {lista.length}/{MAX_COMPROVANTES} anexos · Imagens ou PDF
            </span>
          </div>

          {loading ? (
            <p style={{ color: '#777', textAlign: 'center', padding: 20 }}>Carregando...</p>
          ) : lista.length === 0 ? (
            <p style={{ color: '#777', textAlign: 'center', padding: 20, fontSize: '0.9rem' }}>
              Nenhum comprovante anexado ainda.
            </p>
          ) : (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {lista.map((c) => (
                <li
                  key={c.id}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: 10,
                    background: '#fff', border: '1px solid #e4e4e0',
                  }}
                >
                  {isImg(c.tipo_mime) ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={c.url}
                      alt=""
                      style={{
                        width: 52, height: 52, objectFit: 'cover',
                        flexShrink: 0, border: '1px solid #e4e4e0', background: '#f1f1ee',
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        width: 52, height: 52, display: 'flex',
                        alignItems: 'center', justifyContent: 'center',
                        background: '#f1f1ee', border: '1px solid #e4e4e0',
                        color: '#27367D', flexShrink: 0,
                      }}
                    >
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
                        <polyline points="14 2 14 8 20 8" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
                      </svg>
                    </div>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontWeight: 600, fontSize: '0.9rem', color: '#222',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}
                    >
                      {c.nome_arquivo || 'comprovante'}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#777' }}>
                      {c.tipo_mime || '—'}
                      {c.created_at ? ` · ${new Date(c.created_at).toLocaleString('pt-BR')}` : ''}
                    </div>
                  </div>
                  <a
                    href={c.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      background: 'none', border: '1px solid #e4e4e0', padding: '5px 10px',
                      fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700,
                      fontSize: '0.7rem', letterSpacing: '0.08em', textTransform: 'uppercase',
                      color: '#27367D', textDecoration: 'none',
                    }}
                  >
                    Abrir
                  </a>
                  <button
                    type="button"
                    onClick={() => deletar(c)}
                    disabled={deletingId === c.id}
                    style={{
                      background: 'none', border: 'none', color: '#dc3545',
                      cursor: deletingId === c.id ? 'not-allowed' : 'pointer',
                      padding: 4, opacity: deletingId === c.id ? 0.5 : 1,
                    }}
                    title="Remover"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                      <path d="M3 6h18M19 6l-2 14H7L5 6M10 11v6M14 11v6M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div style={footer}>
          <button type="button" style={btnGhost} onClick={onClose} disabled={uploading}>
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
