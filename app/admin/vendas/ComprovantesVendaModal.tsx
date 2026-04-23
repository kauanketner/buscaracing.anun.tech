'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useToast } from '@/components/Toast';
import styles from './page.module.css';

type Comprovante = {
  id: number;
  venda_id: number;
  url: string;
  nome_arquivo: string;
  tipo_mime: string;
  descricao: string;
  created_at: string;
};

type Props = {
  vendaId: number;
  vendaLabel?: string;
  onClose: () => void;
  onChanged?: () => void;
};

const MAX_COMPROVANTES = 10;

export default function ComprovantesVendaModal({ vendaId, vendaLabel, onClose, onChanged }: Props) {
  const { showToast } = useToast();
  const [lista, setLista] = useState<Comprovante[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    try {
      const r = await fetch(`/api/vendas/${vendaId}/comprovantes`);
      if (!r.ok) throw new Error('fail');
      const d = await r.json();
      setLista(Array.isArray(d) ? d : []);
    } catch {
      showToast('Erro ao carregar comprovantes', 'error');
    } finally {
      setLoading(false);
    }
  }, [vendaId, showToast]);

  useEffect(() => { load(); }, [load]);

  const onSelectFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const arr = Array.from(files);
    const espacoLivre = MAX_COMPROVANTES - lista.length;
    if (arr.length > espacoLivre) {
      showToast(`Máximo ${MAX_COMPROVANTES} comprovantes. Restam ${espacoLivre}.`, 'error');
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
        const r = await fetch(`/api/vendas/${vendaId}/comprovantes`, { method: 'POST', body: fd });
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
      const r = await fetch(`/api/vendas/${vendaId}/comprovantes/${comp.id}`, { method: 'DELETE' });
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

  const fmtKB = (bytes?: number | null) => {
    if (!bytes) return '';
    return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  };

  const isImg = (mime: string) => mime && mime.startsWith('image/');

  return (
    <div
      className={styles.modalOverlay}
      onClick={(e) => { if (e.target === e.currentTarget && !uploading) onClose(); }}
    >
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <h3>Comprovantes {vendaLabel ? `— ${vendaLabel}` : `da venda #${vendaId}`}</h3>
          <button type="button" className={styles.modalClose} onClick={onClose} disabled={uploading}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className={styles.modalBody}>
          <div
            style={{
              border: '1.5px dashed #e4e4e0',
              padding: 12,
              background: '#fafaf8',
              marginBottom: 16,
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              flexWrap: 'wrap',
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
                background: '#fff',
                border: '1.5px solid #e4e4e0',
                padding: '8px 14px',
                fontFamily: "'Barlow Condensed', sans-serif",
                fontWeight: 700,
                fontSize: '0.78rem',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: '#27367D',
                cursor:
                  uploading || lista.length >= MAX_COMPROVANTES ? 'not-allowed' : 'pointer',
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
              Nenhum comprovante anexado a esta venda ainda.
            </p>
          ) : (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {lista.map((c) => (
                <li
                  key={c.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: 10,
                    background: '#fff',
                    border: '1px solid #e4e4e0',
                  }}
                >
                  {/* Thumb/Icon */}
                  {isImg(c.tipo_mime) ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={c.url}
                      alt=""
                      style={{
                        width: 52,
                        height: 52,
                        objectFit: 'cover',
                        flexShrink: 0,
                        border: '1px solid #e4e4e0',
                        background: '#f1f1ee',
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        width: 52,
                        height: 52,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: '#f1f1ee',
                        border: '1px solid #e4e4e0',
                        color: '#27367D',
                        flexShrink: 0,
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
                        fontWeight: 600,
                        fontSize: '0.9rem',
                        color: '#222',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
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
                      background: 'none',
                      border: '1px solid #e4e4e0',
                      padding: '5px 10px',
                      fontFamily: "'Barlow Condensed', sans-serif",
                      fontWeight: 700,
                      fontSize: '0.7rem',
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      color: '#27367D',
                      textDecoration: 'none',
                    }}
                  >
                    Abrir
                  </a>
                  <button
                    type="button"
                    onClick={() => deletar(c)}
                    disabled={deletingId === c.id}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#dc3545',
                      cursor: deletingId === c.id ? 'not-allowed' : 'pointer',
                      padding: 4,
                      opacity: deletingId === c.id ? 0.5 : 1,
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

        <div className={styles.modalFooter}>
          <button
            type="button"
            className={`${styles.btn} ${styles.btnGhost}`}
            onClick={onClose}
            disabled={uploading}
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
