'use client';

import { useEffect, useRef, useState, FormEvent, ChangeEvent } from 'react';
import Link from 'next/link';
import BlogEditor from '@/components/BlogEditor';
import styles from './form.module.css';

export type PostFormData = {
  titulo: string;
  slug: string;
  resumo: string;
  conteudo: string;
  imagem_capa: string;
  categoria: string;
  tags: string;
  publicado: boolean;
  autor: string;
  meta_title: string;
  meta_desc: string;
};

export type Post = Partial<PostFormData> & {
  id?: number;
  created_at?: string;
  updated_at?: string;
};

type Props = {
  initialData?: Post;
  isEditing?: boolean;
  onSubmit: (data: PostFormData) => Promise<void>;
  submitting?: boolean;
  onToast: (msg: string, type: 'success' | 'error') => void;
};

const CATEGORIAS = [
  { value: 'geral', label: 'Geral' },
  { value: 'Dicas', label: 'Dicas' },
  { value: 'Novidades', label: 'Novidades' },
  { value: 'Comparativos', label: 'Comparativos' },
  { value: 'Manutenção', label: 'Manutenção' },
];

export function generateSlug(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export default function BlogForm({
  initialData,
  isEditing,
  onSubmit,
  submitting,
  onToast,
}: Props) {
  const [titulo, setTitulo] = useState(initialData?.titulo || '');
  const [slug, setSlug] = useState(initialData?.slug || '');
  const [slugTouched, setSlugTouched] = useState(!!initialData?.slug);
  const [resumo, setResumo] = useState(initialData?.resumo || '');
  const [conteudo, setConteudo] = useState(initialData?.conteudo || '');
  const [imagemCapa, setImagemCapa] = useState(initialData?.imagem_capa || '');
  const [categoria, setCategoria] = useState(initialData?.categoria || 'geral');
  const [tags, setTags] = useState(initialData?.tags || '');
  const [publicado, setPublicado] = useState(!!initialData?.publicado);
  const [autor, setAutor] = useState(initialData?.autor || 'Busca Racing');
  const [metaTitle, setMetaTitle] = useState(initialData?.meta_title || '');
  const [metaDesc, setMetaDesc] = useState(initialData?.meta_desc || '');

  const [uploadingCover, setUploadingCover] = useState(false);
  const coverInputRef = useRef<HTMLInputElement>(null);

  // Sync if initialData changes (e.g. async load on edit page)
  useEffect(() => {
    if (!initialData) return;
    setTitulo(initialData.titulo || '');
    setSlug(initialData.slug || '');
    setSlugTouched(!!initialData.slug);
    setResumo(initialData.resumo || '');
    setConteudo(initialData.conteudo || '');
    setImagemCapa(initialData.imagem_capa || '');
    setCategoria(initialData.categoria || 'geral');
    setTags(initialData.tags || '');
    setPublicado(!!initialData.publicado);
    setAutor(initialData.autor || 'Busca Racing');
    setMetaTitle(initialData.meta_title || '');
    setMetaDesc(initialData.meta_desc || '');
  }, [initialData]);

  // Auto-generate slug from titulo (until user edits the slug field)
  useEffect(() => {
    if (slugTouched) return;
    setSlug(generateSlug(titulo));
  }, [titulo, slugTouched]);

  const onCoverChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingCover(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const r = await fetch('/api/upload', { method: 'POST', body: fd });
      if (!r.ok) throw new Error('upload-fail');
      const d: { url?: string } = await r.json();
      if (d.url) {
        setImagemCapa(d.url);
        onToast('Imagem de capa enviada', 'success');
      }
    } catch {
      onToast('Erro ao enviar imagem', 'error');
    } finally {
      setUploadingCover(false);
      if (coverInputRef.current) coverInputRef.current.value = '';
    }
  };

  const removeCover = () => {
    setImagemCapa('');
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const t = titulo.trim();
    const s = slug.trim();
    if (!t) {
      onToast('Informe o título', 'error');
      return;
    }
    if (!s) {
      onToast('Informe o slug', 'error');
      return;
    }
    if (!conteudo.trim() || conteudo === '<p></p>') {
      onToast('Escreva o conteúdo do post', 'error');
      return;
    }
    await onSubmit({
      titulo: t,
      slug: s,
      resumo: resumo.trim(),
      conteudo,
      imagem_capa: imagemCapa,
      categoria,
      tags: tags.trim(),
      publicado,
      autor: autor.trim() || 'Busca Racing',
      meta_title: metaTitle.trim(),
      meta_desc: metaDesc.trim(),
    });
  };

  return (
    <form className={styles.wrap} onSubmit={handleSubmit}>
      <Link href="/admin/blog" className={styles.backLink}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
          <path d="M19 12H5M12 19l-7-7 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Voltar para lista
      </Link>

      <div className={styles.formGrid}>
        {/* Main column */}
        <div>
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>Conteúdo</h3>
            <div className={styles.formGroup}>
              <label>Título *</label>
              <input
                type="text"
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                placeholder="Ex: 5 dicas para manter sua moto sempre nova"
              />
            </div>
            <div className={styles.formGroup}>
              <label>Slug (URL)</label>
              <input
                type="text"
                value={slug}
                onChange={(e) => {
                  setSlug(e.target.value);
                  setSlugTouched(true);
                }}
                placeholder="ex: 5-dicas-manter-sua-moto-nova"
              />
              <p className={styles.helpText}>
                URL amigável. Gerado automaticamente do título — você pode editar.
              </p>
            </div>
            <div className={styles.formGroup}>
              <label>Resumo</label>
              <textarea
                value={resumo}
                onChange={(e) => setResumo(e.target.value)}
                placeholder="Pequeno resumo que aparece nos cards do blog (2-3 linhas)"
                rows={3}
              />
            </div>
            <div className={styles.formGroup}>
              <label>Conteúdo *</label>
              <BlogEditor
                value={conteudo}
                onChange={setConteudo}
                placeholder="Comece a escrever o conteúdo do post..."
              />
            </div>
          </div>

          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>SEO</h3>
            <div className={styles.formGroup}>
              <label>Meta Title</label>
              <input
                type="text"
                value={metaTitle}
                onChange={(e) => setMetaTitle(e.target.value)}
                placeholder="Título para Google (deixe em branco para usar o título do post)"
              />
            </div>
            <div className={styles.formGroup}>
              <label>Meta Description</label>
              <textarea
                value={metaDesc}
                onChange={(e) => setMetaDesc(e.target.value)}
                placeholder="Descrição para Google (~160 caracteres)"
                rows={3}
                maxLength={300}
              />
              <div className={styles.charCount}>{metaDesc.length} / 160</div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div>
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>Publicação</h3>
            <div className={styles.formGroup}>
              <div className={styles.checkRow}>
                <label className={styles.checkItem}>
                  <input
                    type="checkbox"
                    checked={publicado}
                    onChange={(e) => setPublicado(e.target.checked)}
                  />
                  <span>{publicado ? 'Publicado' : 'Rascunho'}</span>
                </label>
              </div>
              <p className={styles.helpText}>
                Posts em rascunho não aparecem no site público.
              </p>
            </div>
            <div className={styles.formGroup}>
              <label>Categoria</label>
              <select value={categoria} onChange={(e) => setCategoria(e.target.value)}>
                {CATEGORIAS.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
            <div className={styles.formGroup}>
              <label>Autor</label>
              <input
                type="text"
                value={autor}
                onChange={(e) => setAutor(e.target.value)}
                placeholder="Busca Racing"
              />
            </div>
            <div className={styles.formGroup}>
              <label>Tags</label>
              <input
                type="text"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="moto, manutenção, dicas"
              />
              <p className={styles.helpText}>Separe por vírgulas.</p>
            </div>
          </div>

          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>Imagem de Capa</h3>
            <div
              className={`${styles.coverArea} ${imagemCapa ? styles.hasCover : ''}`}
              onClick={() => coverInputRef.current?.click()}
            >
              {imagemCapa ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={imagemCapa} alt="Capa" />
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
                  <span className={styles.coverPlaceholder}>Clique para enviar</span>
                </>
              )}
              <div className={styles.coverOverlay}>
                {uploadingCover ? 'Enviando...' : 'Trocar imagem'}
              </div>
            </div>
            <input
              ref={coverInputRef}
              type="file"
              accept="image/*"
              className={styles.hidden}
              onChange={onCoverChange}
            />
            {imagemCapa && (
              <button
                type="button"
                className={`${styles.btn} ${styles.btnGhost}`}
                style={{ marginTop: '0.75rem', width: '100%', justifyContent: 'center' }}
                onClick={removeCover}
              >
                Remover capa
              </button>
            )}
          </div>
        </div>
      </div>

      <div className={styles.actions}>
        <Link href="/admin/blog" className={`${styles.btn} ${styles.btnGhost}`}>
          Cancelar
        </Link>
        <button type="submit" className={`${styles.btn} ${styles.btnPrimary}`} disabled={submitting}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" stroke="currentColor" strokeWidth="2" />
            <polyline points="17 21 17 13 7 13 7 21" stroke="currentColor" strokeWidth="2" />
            <polyline points="7 3 7 8 15 8" stroke="currentColor" strokeWidth="2" />
          </svg>
          {submitting ? 'Salvando...' : isEditing ? 'Atualizar Post' : 'Criar Post'}
        </button>
      </div>
    </form>
  );
}
