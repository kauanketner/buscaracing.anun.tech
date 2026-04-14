'use client';

import { useEffect, useRef, useState, FormEvent, ChangeEvent } from 'react';
import styles from './page.module.css';

const BRANDS = [
  'Honda',
  'Yamaha',
  'Kawasaki',
  'Suzuki',
  'KTM',
  'BMW Motorrad',
  'MXF',
  'Ducati',
  'Triumph',
  'CF Moto',
  'Royal Enfield',
  'Dafra',
  'Haojue',
  'Shineray',
  'Husqvarna',
];

export type Moto = {
  id?: number;
  nome?: string;
  marca?: string;
  categoria?: string;
  condicao?: string;
  preco?: number | null;
  preco_original?: number | null;
  descricao?: string | null;
  imagem?: string | null;
  destaque?: number;
  ativo?: number;
  ano?: number | null;
  km?: number | null;
};

type Foto = { id: number; url: string };

type Props = {
  editingId: number | null;
  onClose: () => void;
  onSaved: () => void;
  onToast: (msg: string, type: 'success' | 'error') => void;
};

export default function MotoModal({ editingId, onClose, onSaved, onToast }: Props) {
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [nome, setNome] = useState('');
  const [marca, setMarca] = useState('');
  const [categoria, setCategoria] = useState('');
  const [condicao, setCondicao] = useState('nova');
  const [preco, setPreco] = useState('');
  const [precoOriginal, setPrecoOriginal] = useState('');
  const [ano, setAno] = useState('');
  const [km, setKm] = useState('');
  const [descricao, setDescricao] = useState('');
  const [destaque, setDestaque] = useState(false);
  const [ativo, setAtivo] = useState(true);
  const [imagemAtual, setImagemAtual] = useState('');
  const [imgPreview, setImgPreview] = useState<string | null>(null);

  const [fotos, setFotos] = useState<Foto[]>([]);
  const [fotosLoading, setFotosLoading] = useState(false);
  const [uploadingCount, setUploadingCount] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const fotosInputRef = useRef<HTMLInputElement>(null);

  const isEditing = editingId !== null;

  useEffect(() => {
    if (editingId === null) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const r = await fetch(`/api/motos/${editingId}`);
        const m: Moto = await r.json();
        if (cancelled) return;
        setNome(m.nome || '');
        setMarca(m.marca || '');
        setCategoria(m.categoria || '');
        setCondicao(m.condicao || 'nova');
        setPreco(m.preco != null ? String(m.preco) : '');
        setPrecoOriginal(m.preco_original != null ? String(m.preco_original) : '');
        setAno(m.ano != null ? String(m.ano) : '');
        setKm(m.km != null ? String(m.km) : '');
        setDescricao(m.descricao || '');
        setDestaque(!!m.destaque);
        setAtivo(!!m.ativo);
        if (m.imagem) {
          setImagemAtual(m.imagem);
          setImgPreview(m.imagem);
        }
      } catch {
        onToast('Erro ao carregar moto', 'error');
      } finally {
        if (!cancelled) setLoading(false);
      }
      // Load fotos
      try {
        setFotosLoading(true);
        const fr = await fetch(`/api/motos/${editingId}/fotos`);
        const fl: Foto[] = await fr.json();
        if (!cancelled) setFotos(Array.isArray(fl) ? fl : []);
      } catch {
        // ignore
      } finally {
        if (!cancelled) setFotosLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [editingId, onToast]);

  const onImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setImgPreview((ev.target?.result as string) || null);
    };
    reader.readAsDataURL(file);
  };

  const refreshFotos = async () => {
    if (editingId === null) return;
    try {
      const fr = await fetch(`/api/motos/${editingId}/fotos`);
      const fl: Foto[] = await fr.json();
      setFotos(Array.isArray(fl) ? fl : []);
    } catch {
      // ignore
    }
  };

  const onFotosUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    if (editingId === null) return;
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const count = files.length;
    setUploadingCount(count);
    const fd = new FormData();
    Array.from(files).forEach((f) => fd.append('fotos', f));
    try {
      const r = await fetch(`/api/motos/${editingId}/fotos`, { method: 'POST', body: fd });
      if (!r.ok) throw new Error('fail');
      onToast(`${count} foto(s) adicionada(s)!`, 'success');
    } catch {
      onToast('Erro ao enviar fotos', 'error');
    } finally {
      setUploadingCount(0);
      if (fotosInputRef.current) fotosInputRef.current.value = '';
      await refreshFotos();
    }
  };

  const onFotoDelete = async (id: number) => {
    try {
      const r = await fetch(`/api/fotos/${id}`, { method: 'DELETE' });
      if (!r.ok) throw new Error('fail');
      onToast('Foto removida', 'success');
      await refreshFotos();
    } catch {
      onToast('Erro ao remover foto', 'error');
    }
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const n = nome.trim();
    const b = marca.trim();
    if (!n || !b || !categoria) {
      onToast('Preencha nome, marca e categoria', 'error');
      return;
    }
    setSubmitting(true);
    const fd = new FormData();
    fd.append('nome', n);
    fd.append('marca', b);
    fd.append('categoria', categoria);
    fd.append('condicao', condicao);
    fd.append('preco', preco);
    fd.append('preco_original', precoOriginal);
    fd.append('ano', ano);
    fd.append('km', km);
    fd.append('descricao', descricao);
    fd.append('destaque', destaque ? '1' : '0');
    fd.append('ativo', ativo ? '1' : '0');
    fd.append('imagem_atual', imagemAtual);
    const file = fileInputRef.current?.files?.[0];
    if (file) fd.append('imagem', file);

    try {
      const url = isEditing ? `/api/motos/${editingId}` : '/api/motos';
      const method = isEditing ? 'PUT' : 'POST';
      const r = await fetch(url, { method, body: fd });
      if (!r.ok) throw new Error('fail');
      onToast(isEditing ? 'Moto atualizada!' : 'Moto cadastrada!', 'success');
      onSaved();
    } catch {
      onToast('Erro ao salvar moto', 'error');
      setSubmitting(false);
    }
  };

  return (
    <div
      className={styles.modalOverlay}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <form className={styles.modal} onSubmit={onSubmit}>
        <div className={styles.modalHeader}>
          <h3>{isEditing ? 'Editar Moto' : 'Nova Moto'}</h3>
          <button type="button" className={styles.modalClose} onClick={onClose} aria-label="Fechar">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className={styles.modalBody}>
          {loading && <div style={{ color: '#777', fontSize: '0.85rem', marginBottom: '1rem' }}>Carregando...</div>}

          {/* Image upload */}
          <div
            className={`${styles.imgUploadArea} ${imgPreview ? styles.hasImg : ''}`}
            onClick={() => fileInputRef.current?.click()}
          >
            {imgPreview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={imgPreview} alt="" />
            ) : (
              <>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" style={{ color: '#ccc' }}>
                  <path
                    d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
                <span className={styles.imgUploadTxt}>Clique para adicionar foto</span>
              </>
            )}
            <div className={styles.imgUploadOverlay}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path
                  d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"
                  stroke="white"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
              <span className={`${styles.imgUploadTxt} ${styles.imgUploadTxtLight}`}>Trocar foto</span>
            </div>
          </div>
          <input
            ref={fileInputRef}
            className={styles.hiddenInput}
            type="file"
            accept="image/*"
            onChange={onImageChange}
          />

          {/* Fields */}
          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label>Nome da Moto *</label>
              <input
                type="text"
                placeholder="Ex: CB 650R Neo Sports"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
              />
            </div>
            <div className={styles.formGroup}>
              <label>Marca *</label>
              <input
                type="text"
                placeholder="Ex: Honda"
                list="marcas-list"
                value={marca}
                onChange={(e) => setMarca(e.target.value)}
              />
              <datalist id="marcas-list">
                {BRANDS.map((b) => (
                  <option key={b} value={b} />
                ))}
              </datalist>
            </div>
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label>Categoria *</label>
              <select value={categoria} onChange={(e) => setCategoria(e.target.value)}>
                <option value="">Selecione...</option>
                <option value="motos-rua">Motos de Rua</option>
                <option value="offroad">Offroad</option>
                <option value="quadriciclos">Quadriciclos</option>
                <option value="infantil">Infantil</option>
                <option value="outros">Outros</option>
              </select>
            </div>
            <div className={styles.formGroup}>
              <label>Condição *</label>
              <select value={condicao} onChange={(e) => setCondicao(e.target.value)}>
                <option value="nova">Nova</option>
                <option value="usada">Usada</option>
              </select>
            </div>
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label>Preço (R$)</label>
              <input
                type="number"
                placeholder="0.00"
                min="0"
                step="0.01"
                value={preco}
                onChange={(e) => setPreco(e.target.value)}
              />
            </div>
            <div className={styles.formGroup}>
              <label>
                Preço Original (R$){' '}
                <small style={{ fontWeight: 400, textTransform: 'none' }}>(opcional)</small>
              </label>
              <input
                type="number"
                placeholder="Para mostrar desconto"
                min="0"
                step="0.01"
                value={precoOriginal}
                onChange={(e) => setPrecoOriginal(e.target.value)}
              />
            </div>
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label>Ano</label>
              <input
                type="number"
                placeholder="2024"
                min="1990"
                max="2030"
                value={ano}
                onChange={(e) => setAno(e.target.value)}
              />
            </div>
            <div className={styles.formGroup}>
              <label>KM (0 para nova)</label>
              <input
                type="number"
                placeholder="0"
                min="0"
                value={km}
                onChange={(e) => setKm(e.target.value)}
              />
            </div>
          </div>

          <div className={styles.formGroup}>
            <label>Descrição</label>
            <textarea
              placeholder="Descreva os principais atributos desta moto..."
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
            />
          </div>

          <div className={styles.checkRow}>
            <label className={styles.checkItem}>
              <input type="checkbox" checked={destaque} onChange={(e) => setDestaque(e.target.checked)} />
              <span>⭐ Destaque</span>
            </label>
            <label className={styles.checkItem}>
              <input type="checkbox" checked={ativo} onChange={(e) => setAtivo(e.target.checked)} />
              <span>✓ Ativo (visível no site)</span>
            </label>
          </div>

          {isEditing && (
            <div className={styles.fotosSection}>
              <div className={styles.fotosHead}>
                <label className={styles.fotosHeadLabel}>Galeria de Fotos</label>
                <label
                  className={`${styles.btn} ${styles.btnGhost} ${styles.btnSm}`}
                  style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                  Adicionar fotos
                  <input
                    ref={fotosInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className={styles.hiddenInput}
                    onChange={onFotosUpload}
                  />
                </label>
              </div>
              <div className={styles.fotosGrid}>
                {fotos.map((f) => (
                  <div key={f.id} className={styles.fotoThumb}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={f.url} alt={`Foto ${f.id}`} loading="lazy" />
                    <button
                      type="button"
                      className={styles.fotoThumbDel}
                      onClick={() => onFotoDelete(f.id)}
                      title="Remover foto"
                    >
                      ✕
                    </button>
                  </div>
                ))}
                {Array.from({ length: uploadingCount }).map((_, i) => (
                  <div key={`up-${i}`} className={styles.fotoUploading}>
                    <div className={styles.fotoSpin} />
                    Enviando...
                  </div>
                ))}
                {!fotosLoading && fotos.length === 0 && uploadingCount === 0 && (
                  <div className={styles.fotosEmpty}>Nenhuma foto na galeria</div>
                )}
              </div>
              <p className={styles.fotosNote}>
                Você pode adicionar várias fotos de uma vez. Elas ficam salvas na pasta <code>fotos/</code>.
              </p>
            </div>
          )}
        </div>

        <div className={styles.modalFooter}>
          <button
            type="button"
            className={`${styles.btn} ${styles.btnGhost}`}
            onClick={onClose}
            disabled={submitting}
          >
            Cancelar
          </button>
          <button type="submit" className={`${styles.btn} ${styles.btnPrimary}`} disabled={submitting}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path
                d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"
                stroke="currentColor"
                strokeWidth="2"
              />
              <polyline points="17 21 17 13 7 13 7 21" stroke="currentColor" strokeWidth="2" />
              <polyline points="7 3 7 8 15 8" stroke="currentColor" strokeWidth="2" />
            </svg>
            {submitting ? 'Salvando...' : 'Salvar Moto'}
          </button>
        </div>
      </form>
    </div>
  );
}
