'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/Toast';
import BlogForm, { type Post, type PostFormData } from '../BlogForm';

type RawPost = {
  id?: number;
  titulo?: string;
  slug?: string;
  resumo?: string | null;
  conteudo?: string | null;
  imagem_capa?: string | null;
  categoria?: string | null;
  tags?: string | null;
  publicado?: number | boolean | null;
  autor?: string | null;
  meta_title?: string | null;
  meta_desc?: string | null;
};

export default function EditPostPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const router = useRouter();
  const { showToast } = useToast();

  const [initial, setInitial] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const r = await fetch(`/api/blog/${id}`);
        if (!r.ok) throw new Error('not-found');
        const raw: RawPost = await r.json();
        if (cancelled) return;
        setInitial({
          id: raw.id,
          titulo: raw.titulo || '',
          slug: raw.slug || '',
          resumo: raw.resumo || '',
          conteudo: raw.conteudo || '',
          imagem_capa: raw.imagem_capa || '',
          categoria: raw.categoria || 'geral',
          tags: raw.tags || '',
          publicado: !!raw.publicado,
          autor: raw.autor || 'Busca Racing',
          meta_title: raw.meta_title || '',
          meta_desc: raw.meta_desc || '',
        });
      } catch {
        showToast('Post não encontrado', 'error');
        router.push('/admin/blog');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, router, showToast]);

  const handleSubmit = async (data: PostFormData) => {
    setSubmitting(true);
    try {
      const r = await fetch(`/api/blog/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        throw new Error(err.error || 'fail');
      }
      showToast('Post atualizado!', 'success');
      router.push('/admin/blog');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erro ao atualizar post';
      showToast(msg, 'error');
      setSubmitting(false);
    }
  };

  if (loading || !initial) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: '#777' }}>
        Carregando...
      </div>
    );
  }

  return (
    <BlogForm
      initialData={initial}
      isEditing={true}
      onSubmit={handleSubmit}
      submitting={submitting}
      onToast={showToast}
    />
  );
}
