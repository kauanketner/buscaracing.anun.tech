'use client';

import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { useToast } from '@/components/Toast';
import { PECAS_CATEGORIAS } from '@/lib/pecas-categorias';
import { MOTO_MARCAS } from '@/lib/moto-marcas';
import styles from './page.module.css';

type Peca = {
  id: number;
  nome: string;
  categoria: string;
  descricao: string;
  preco: number | null;
  preco_original: number | null;
  imagem: string | null;
  marca_moto: string;
  modelo_compat: string;
  codigo: string;
  destaque: number;
  ativo: number;
};

type Props = {
  editingId: number | null;
  onClose: () => void;
  onSaved: () => void;
};

export default function PecaModal({ editingId, onClose, onSaved }: Props) {
  const { showToast } = useToast();
  const isEditing = editingId != null;

  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);

  const [nome, setNome] = useState('');
  const [categoria, setCategoria] = useState('motor');
  const [descricao, setDescricao] = useState('');
  const [preco, setPreco] = useState('');
  const [precoOriginal, setPrecoOriginal] = useState('');
  const [imagem, setImagem] = useState('');
  const [marcaMoto, setMarcaMoto] = useState('');
  const [modeloCompat, setModeloCompat] = useState('');
  const [codigo, setCodigo] = useState('');
  const [destaque, setDestaque] = useState(false);
  const [ativo, setAtivo] = useState(true);

  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isEditing) return;
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch(`/api/pecas/${editingId}`);
        if (!r.ok) throw new Error('fail');
        const p: Peca = await r.json();
        if (cancelled) return;
        setNome(p.nome || '');
        setCategoria(p.categoria || 'motor');
        setDescricao(p.descricao || '');
        setPreco(p.preco != null ? String(p.preco) : '');
        setPrecoOriginal(p.preco_original != null ? String(p.preco_original) : '');
        setImagem(p.imagem || '');
        setMarcaMoto(p.marca_moto || '');
        setModeloCompat(p.modelo_compat || '');
        setCodigo(p.codigo || '');
        setDestaque(!!p.destaque);
        setAtivo(!!p.ativo);
      } catch {
        showToast('Erro ao carregar peça', 'error');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [editingId, isEditing, showToast]);

  const onUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const r = await fetch('/api/upload', { method: 'POST', body: fd });
      if (!r.ok) throw new Error('fail');
      const d = await r.json();
      if (d.url) setImagem(d.url);
    } catch {
      showToast('Erro ao enviar imagem', 'error');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) { showToast('Nome obrigatório', 'error'); return; }
    setSaving(true);
    try {
      const body = {
        nome: nome.trim(),
        categoria,
        descricao: descricao.trim(),
        preco: preco ? Number(preco) : null,
        preco_original: precoOriginal ? Number(precoOriginal) : null,
        imagem: imagem || null,
        marca_moto: marcaMoto.trim(),
        modelo_compat: modeloCompat.trim(),
        codigo: codigo.trim(),
        destaque,
        ativo,
      };
      const url = isEditing ? `/api/pecas/${editingId}` : '/api/pecas';
      const method = isEditing ? 'PUT' : 'POST';
      const r = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!r.ok) throw new Error('fail');
      showToast(isEditing ? 'Peça atualizada!' : 'Peça criada!', 'success');
      onSaved();
    } catch {
      showToast('Erro ao salvar', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={(e) => { if (e.target === e.currentTarget && !saving) onClose(); }}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <h3>{isEditing ? 'Editar peça' : 'Nova peça'}</h3>
          <button type="button" className={styles.modalClose} onClick={onClose} disabled={saving}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
          <div className={styles.modalBody}>
            {loading && <p style={{ color: '#777', fontSize: '0.85rem' }}>Carregando...</p>}

            {/* Imagem */}
            <div className={styles.formGroup}>
              <label>Foto</label>
              <div
                className={styles.imgUploadArea}
                onClick={() => fileInputRef.current?.click()}
                style={{ height: imagem ? 180 : 120 }}
              >
                {imagem ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={imagem} alt="" style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }} />
                ) : (
                  <>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" stroke="#aaa" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                    <span style={{ fontSize: '0.82rem', color: '#999' }}>
                      {uploading ? 'Enviando...' : 'Clique para enviar foto'}
                    </span>
                  </>
                )}
                <input ref={fileInputRef} type="file" accept="image/*" onChange={onUpload} style={{ display: 'none' }} />
              </div>
              {imagem && (
                <button type="button" onClick={() => setImagem('')}
                  style={{ marginTop: 6, background: 'none', border: 'none', color: '#dc3545', fontSize: '0.78rem', cursor: 'pointer' }}>
                  Remover foto
                </button>
              )}
            </div>

            {/* Nome + Código */}
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label>Nome *</label>
                <input type="text" value={nome} onChange={(e) => setNome(e.target.value)}
                  placeholder="Ex: Pastilha Freio Frente CRF 250" required />
              </div>
              <div className={styles.formGroup}>
                <label>Código / SKU</label>
                <input type="text" value={codigo} onChange={(e) => setCodigo(e.target.value)} placeholder="Opcional" />
              </div>
            </div>

            {/* Categoria + Destaque */}
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label>Categoria *</label>
                <select value={categoria} onChange={(e) => setCategoria(e.target.value)}>
                  {PECAS_CATEGORIAS.map((c) => (
                    <option key={c.slug} value={c.slug}>{c.label}</option>
                  ))}
                </select>
              </div>
              <div className={styles.formGroup}>
                <label>Destaque</label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', padding: '11px 0' }}>
                  <input type="checkbox" checked={destaque} onChange={(e) => setDestaque(e.target.checked)} style={{ width: 'auto' }} />
                  <span>Exibir em destaque</span>
                </label>
              </div>
            </div>

            {/* Preço */}
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label>Preço (R$)</label>
                <input type="number" step="0.01" value={preco} onChange={(e) => setPreco(e.target.value)} placeholder="89.90" />
              </div>
              <div className={styles.formGroup}>
                <label>Preço original (riscado)</label>
                <input type="number" step="0.01" value={precoOriginal} onChange={(e) => setPrecoOriginal(e.target.value)} placeholder="Opcional" />
              </div>
            </div>

            {/* Compatibilidade */}
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label>Marca da moto</label>
                <select value={marcaMoto} onChange={(e) => setMarcaMoto(e.target.value)}>
                  <option value="">Universal / várias</option>
                  {MOTO_MARCAS.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
              <div className={styles.formGroup}>
                <label>Modelo compatível</label>
                <input type="text" value={modeloCompat} onChange={(e) => setModeloCompat(e.target.value)}
                  placeholder="Ex: CRF 250 2020+" />
              </div>
            </div>

            {/* Descrição */}
            <div className={styles.formGroup}>
              <label>Descrição</label>
              <textarea value={descricao} onChange={(e) => setDescricao(e.target.value)}
                placeholder="Detalhes da peça, material, origem..." rows={3} />
            </div>

            {/* Ativo */}
            <div className={styles.formGroup}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input type="checkbox" checked={ativo} onChange={(e) => setAtivo(e.target.checked)} style={{ width: 'auto' }} />
                <span>Publicada no site</span>
              </label>
            </div>
          </div>

          <div className={styles.modalFooter}>
            <button type="button" className={`${styles.btn} ${styles.btnGhost}`} onClick={onClose} disabled={saving}>
              Cancelar
            </button>
            <button type="submit" className={`${styles.btn} ${styles.btnPrimary}`} disabled={saving}>
              {saving ? 'Salvando...' : isEditing ? 'Salvar alterações' : 'Criar peça'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
