'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/Toast';
import BlogForm, { type PostFormData } from '../BlogForm';

export default function NovoPostPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (data: PostFormData) => {
    setSubmitting(true);
    try {
      const r = await fetch('/api/blog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        throw new Error(err.error || 'fail');
      }
      showToast('Post criado!', 'success');
      router.push('/admin/blog');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erro ao criar post';
      showToast(msg, 'error');
      setSubmitting(false);
    }
  };

  return (
    <BlogForm
      isEditing={false}
      onSubmit={handleSubmit}
      submitting={submitting}
      onToast={showToast}
    />
  );
}
