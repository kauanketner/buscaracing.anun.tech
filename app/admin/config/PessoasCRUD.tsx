'use client';

/**
 * CRUD genérico para entidades simples tipo "pessoa" (vendedor, comprador,
 * mecânico simplificado). Reutilizado em várias tabs de Configurações.
 *
 * Schema esperado da entidade: id, nome, telefone, email, ativo (+ extras).
 */

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { useToast } from '@/components/Toast';

type Pessoa = {
  id: number;
  nome: string;
  telefone: string;
  email: string;
  ativo: number;
  especialidade?: string; // só pra mecânicos
};

type Props = {
  /** Endpoint base, ex: '/api/config/vendedores' */
  endpoint: string;
  /** Substantivo singular usado em mensagens, ex: 'vendedor' */
  singular: string;
  /** Substantivo plural pro título, ex: 'Vendedores' */
  plural: string;
  /** Texto curto explicando o cadastro */
  descricao: string;
  /** Mostra campo "especialidade" (só pra mecânicos) */
  comEspecialidade?: boolean;
  /** Slot extra abaixo do form (ex: link "gestão completa →") */
  footer?: React.ReactNode;
};

export default function PessoasCRUD({
  endpoint, singular, plural, descricao, comEspecialidade, footer,
}: Props) {
  const { showToast } = useToast();
  const [items, setItems] = useState<Pessoa[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form
  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');
  const [email, setEmail] = useState('');
  const [especialidade, setEspecialidade] = useState('');

  const reload = useCallback(async () => {
    try {
      const r = await fetch(endpoint);
      if (!r.ok) throw new Error('fail');
      const d = await r.json();
      setItems(Array.isArray(d) ? d : []);
    } catch {
      // silencioso
    } finally {
      setLoading(false);
    }
  }, [endpoint]);

  useEffect(() => { reload(); }, [reload]);

  const adicionar = async (e: FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) {
      showToast(`Informe o nome do ${singular}`, 'error');
      return;
    }
    setSaving(true);
    try {
      const body: Record<string, string> = {
        nome: nome.trim(),
        telefone: telefone.trim(),
        email: email.trim(),
      };
      if (comEspecialidade) body.especialidade = especialidade.trim();
      const r = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!r.ok) throw new Error('fail');
      setNome('');
      setTelefone('');
      setEmail('');
      setEspecialidade('');
      showToast(`${singular[0].toUpperCase() + singular.slice(1)} cadastrado!`, 'success');
      await reload();
    } catch {
      showToast(`Erro ao cadastrar ${singular}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  const toggleAtivo = async (p: Pessoa) => {
    try {
      const body: Record<string, unknown> = {
        nome: p.nome,
        telefone: p.telefone,
        email: p.email,
        ativo: !p.ativo,
      };
      if (comEspecialidade) body.especialidade = p.especialidade || '';
      const r = await fetch(`${endpoint}/${p.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!r.ok) throw new Error('fail');
      await reload();
    } catch {
      showToast('Erro ao atualizar', 'error');
    }
  };

  const remover = async (p: Pessoa) => {
    if (!confirm(`Remover ${singular} "${p.nome}"? Esta ação não pode ser desfeita.`)) return;
    try {
      const r = await fetch(`${endpoint}/${p.id}`, { method: 'DELETE' });
      if (!r.ok) throw new Error('fail');
      showToast(`${singular[0].toUpperCase() + singular.slice(1)} removido`, 'success');
      await reload();
    } catch {
      showToast('Erro ao remover', 'error');
    }
  };

  const ativos = items.filter((p) => p.ativo);
  const inativos = items.filter((p) => !p.ativo);

  return (
    <div>
      <div style={{ marginBottom: '1.25rem' }}>
        <h3
          style={{
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize: '1.4rem',
            color: '#27367D',
            margin: '0 0 4px',
          }}
        >
          {plural}
        </h3>
        <p style={{ fontSize: '0.86rem', color: '#777', margin: 0 }}>{descricao}</p>
      </div>

      {/* Form de cadastro */}
      <form
        onSubmit={adicionar}
        style={{
          background: '#fafaf8',
          border: '1px solid #e4e4e0',
          padding: '1rem 1.1rem',
          marginBottom: '1.25rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem',
        }}
      >
        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1.2fr', gap: '0.75rem' }}>
          <FormField label="Nome *">
            <input
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Nome completo"
              required
            />
          </FormField>
          <FormField label="Telefone">
            <input
              type="text"
              value={telefone}
              onChange={(e) => setTelefone(e.target.value)}
              placeholder="(11) 99999-9999"
            />
          </FormField>
          <FormField label="E-mail">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@exemplo.com"
            />
          </FormField>
        </div>
        {comEspecialidade && (
          <FormField label="Especialidade">
            <input
              type="text"
              value={especialidade}
              onChange={(e) => setEspecialidade(e.target.value)}
              placeholder="Ex: motor, elétrica, suspensão"
            />
          </FormField>
        )}
        <div>
          <button
            type="submit"
            disabled={saving}
            style={{
              padding: '8px 18px',
              background: '#27367D',
              color: '#FDFDFB',
              border: 'none',
              fontFamily: "'Barlow Condensed', sans-serif",
              fontWeight: 700,
              fontSize: '0.82rem',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              cursor: 'pointer',
              clipPath: 'polygon(8px 0%, 100% 0%, calc(100% - 8px) 100%, 0% 100%)',
              opacity: saving ? 0.6 : 1,
            }}
          >
            {saving ? 'Salvando...' : `+ Adicionar ${singular}`}
          </button>
        </div>
      </form>

      {/* Lista */}
      {loading ? (
        <p style={{ color: '#777' }}>Carregando...</p>
      ) : items.length === 0 ? (
        <p style={{ color: '#999', textAlign: 'center', padding: '2rem 0' }}>
          Nenhum {singular} cadastrado ainda.
        </p>
      ) : (
        <>
          {ativos.length > 0 && (
            <PessoasList
              titulo={`Ativos (${ativos.length})`}
              items={ativos}
              comEspecialidade={comEspecialidade}
              onToggle={toggleAtivo}
              onRemove={remover}
            />
          )}
          {inativos.length > 0 && (
            <PessoasList
              titulo={`Inativos (${inativos.length})`}
              items={inativos}
              comEspecialidade={comEspecialidade}
              onToggle={toggleAtivo}
              onRemove={remover}
              dimmed
            />
          )}
        </>
      )}

      {footer && <div style={{ marginTop: '1.5rem' }}>{footer}</div>}
    </div>
  );
}

function PessoasList({
  titulo, items, comEspecialidade, onToggle, onRemove, dimmed,
}: {
  titulo: string;
  items: Pessoa[];
  comEspecialidade?: boolean;
  onToggle: (p: Pessoa) => void;
  onRemove: (p: Pessoa) => void;
  dimmed?: boolean;
}) {
  return (
    <div style={{ marginBottom: '1rem' }}>
      <div
        style={{
          fontFamily: "'Barlow Condensed', sans-serif",
          fontWeight: 700,
          fontSize: '0.72rem',
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          color: '#777',
          marginBottom: 8,
        }}
      >
        {titulo}
      </div>
      <div style={{ border: '1px solid #e4e4e0', background: '#fff' }}>
        {items.map((p, i) => (
          <div
            key={p.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '10px 14px',
              borderTop: i > 0 ? '1px solid #f1f1ee' : 'none',
              opacity: dimmed ? 0.6 : 1,
            }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, color: '#222', fontSize: '0.95rem' }}>{p.nome}</div>
              <div style={{ fontSize: '0.78rem', color: '#777' }}>
                {[p.telefone, p.email, comEspecialidade ? p.especialidade : null]
                  .filter(Boolean)
                  .join(' · ') || 'Sem dados'}
              </div>
            </div>
            <button
              type="button"
              onClick={() => onToggle(p)}
              style={{
                background: 'none',
                border: '1px solid #e4e4e0',
                padding: '5px 10px',
                fontFamily: "'Barlow Condensed', sans-serif",
                fontWeight: 700,
                fontSize: '0.7rem',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                color: '#555',
                cursor: 'pointer',
              }}
            >
              {p.ativo ? 'Desativar' : 'Reativar'}
            </button>
            <button
              type="button"
              onClick={() => onRemove(p)}
              style={{
                background: 'none',
                border: '1px solid #e4e4e0',
                padding: '5px 8px',
                color: '#dc3545',
                cursor: 'pointer',
              }}
              title="Remover"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <polyline points="3 6 5 6 21 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6M10 11v6M14 11v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <label
        style={{
          fontFamily: "'Barlow Condensed', sans-serif",
          fontWeight: 700,
          fontSize: '0.7rem',
          letterSpacing: '0.16em',
          textTransform: 'uppercase',
          color: '#777',
          marginBottom: 5,
        }}
      >
        {label}
      </label>
      <style jsx>{`
        div :global(input),
        div :global(textarea),
        div :global(select) {
          width: 100%;
          padding: 9px 12px;
          border: 1.5px solid #e4e4e0;
          background: #fff;
          font-family: 'Barlow', sans-serif;
          font-size: 0.92rem;
          color: #333;
          outline: none;
        }
        div :global(input:focus),
        div :global(textarea:focus),
        div :global(select:focus) {
          border-color: #27367d;
        }
      `}</style>
      {children}
    </div>
  );
}
