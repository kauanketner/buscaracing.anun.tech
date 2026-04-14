'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useEditor, EditorContent, type Editor } from '@tiptap/react';
// StarterKit (v3) already includes Link and Underline extensions.
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import styles from './BlogEditor.module.css';

type Props = {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
};

type ToolbarBtnProps = {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  title: string;
  children: React.ReactNode;
};

function TbBtn({ onClick, active, disabled, title, children }: ToolbarBtnProps) {
  return (
    <button
      type="button"
      className={`${styles.tbBtn} ${active ? styles.tbBtnActive : ''}`}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={title}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <span className={styles.tbDivider} aria-hidden="true" />;
}

function Toolbar({ editor }: { editor: Editor }) {
  const setLink = useCallback(() => {
    const previous = editor.getAttributes('link').href as string | undefined;
    const url = window.prompt('URL do link', previous || 'https://');
    if (url === null) return;
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  }, [editor]);

  const addImage = useCallback(async () => {
    const choice = window.prompt(
      'Insira a URL da imagem ou deixe em branco para fazer upload de um arquivo:',
      '',
    );
    if (choice === null) return;
    const trimmed = choice.trim();

    if (trimmed) {
      editor.chain().focus().setImage({ src: trimmed }).run();
      return;
    }

    // Upload flow
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      try {
        const fd = new FormData();
        fd.append('file', file);
        const r = await fetch('/api/upload', { method: 'POST', body: fd });
        if (!r.ok) throw new Error('upload-fail');
        const d: { url?: string } = await r.json();
        if (d.url) editor.chain().focus().setImage({ src: d.url }).run();
      } catch {
        window.alert('Erro ao enviar imagem');
      }
    };
    input.click();
  }, [editor]);

  return (
    <div className={styles.toolbar}>
      <TbBtn
        onClick={() => editor.chain().focus().toggleBold().run()}
        active={editor.isActive('bold')}
        title="Negrito"
      >
        <strong>B</strong>
      </TbBtn>
      <TbBtn
        onClick={() => editor.chain().focus().toggleItalic().run()}
        active={editor.isActive('italic')}
        title="Itálico"
      >
        <em>I</em>
      </TbBtn>
      <TbBtn
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        active={editor.isActive('underline')}
        title="Sublinhado"
      >
        <span style={{ textDecoration: 'underline' }}>U</span>
      </TbBtn>

      <Divider />

      <TbBtn
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        active={editor.isActive('heading', { level: 1 })}
        title="Título 1"
      >
        H1
      </TbBtn>
      <TbBtn
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        active={editor.isActive('heading', { level: 2 })}
        title="Título 2"
      >
        H2
      </TbBtn>
      <TbBtn
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        active={editor.isActive('heading', { level: 3 })}
        title="Título 3"
      >
        H3
      </TbBtn>
      <TbBtn
        onClick={() => editor.chain().focus().setParagraph().run()}
        active={editor.isActive('paragraph')}
        title="Parágrafo"
      >
        P
      </TbBtn>

      <Divider />

      <TbBtn
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        active={editor.isActive('bulletList')}
        title="Lista com marcadores"
      >
        •
      </TbBtn>
      <TbBtn
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        active={editor.isActive('orderedList')}
        title="Lista numerada"
      >
        1.
      </TbBtn>
      <TbBtn
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        active={editor.isActive('blockquote')}
        title="Citação"
      >
        ❝
      </TbBtn>
      <TbBtn
        onClick={() => editor.chain().focus().toggleCode().run()}
        active={editor.isActive('code')}
        title="Código"
      >
        {'</>'}
      </TbBtn>

      <Divider />

      <TbBtn
        onClick={setLink}
        active={editor.isActive('link')}
        title="Inserir link"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
          <path
            d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </TbBtn>
      <TbBtn onClick={addImage} title="Inserir imagem">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
          <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2" />
          <circle cx="8.5" cy="8.5" r="1.5" fill="currentColor" />
          <polyline points="21 15 16 10 5 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </TbBtn>

      <Divider />

      <TbBtn
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!editor.can().undo()}
        title="Desfazer"
      >
        ↶
      </TbBtn>
      <TbBtn
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!editor.can().redo()}
        title="Refazer"
      >
        ↷
      </TbBtn>
    </div>
  );
}

export default function BlogEditor({ value, onChange, placeholder }: Props) {
  const lastEmittedRef = useRef<string>(value);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        link: {
          openOnClick: false,
          autolink: true,
          HTMLAttributes: { rel: 'noopener noreferrer nofollow', target: '_blank' },
        },
      }),
      Image.configure({ inline: false }),
      Placeholder.configure({
        placeholder: placeholder || 'Comece a escrever o conteúdo do post...',
      }),
    ],
    content: value || '',
    immediatelyRender: false,
    onUpdate: ({ editor: ed }) => {
      const html = ed.getHTML();
      lastEmittedRef.current = html;
      onChange(html);
    },
    editorProps: {
      attributes: {
        class: styles.content,
      },
    },
  });

  // Sync external value -> editor (for prefilled forms after async load)
  useEffect(() => {
    if (!editor) return;
    if (value === lastEmittedRef.current) return;
    const current = editor.getHTML();
    if (current !== value) {
      editor.commands.setContent(value || '', { emitUpdate: false });
      lastEmittedRef.current = value;
    }
  }, [value, editor]);

  return (
    <div className={styles.editor}>
      {editor && <Toolbar editor={editor} />}
      <EditorContent editor={editor} className={styles.content} />
    </div>
  );
}
