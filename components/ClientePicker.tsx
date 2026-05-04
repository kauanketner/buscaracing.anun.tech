'use client';

/**
 * ClientePicker — autocomplete sobre /api/clientes com criação inline.
 *
 * Uso típico em formulários (PDV, Venda, Reserva, OS, etc.):
 *
 *   const [clienteId, setClienteId] = useState<number | null>(null);
 *   const [cliente, setCliente] = useState<Cliente | null>(null);
 *
 *   <ClientePicker
 *     value={clienteId}
 *     cliente={cliente}
 *     onChange={(id, c) => { setClienteId(id); setCliente(c); }}
 *     required
 *   />
 *
 * Quando o usuário seleciona um cliente, retorna `(id, cliente)` para o
 * formulário usar nos snapshots (cliente_nome, cliente_tel, etc.).
 */

import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { useToast } from '@/components/Toast';
import { formatCpfCnpj } from '@/lib/cpf-cnpj';

export type Cliente = {
  id: number;
  nome: string;
  telefone: string;
  email: string;
  cpf_cnpj: string;
  endereco: string;
  observacoes?: string;
  ativo?: number;
};

type Props = {
  value: number | null;
  cliente?: Cliente | null;
  onChange: (id: number | null, cliente: Cliente | null) => void;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
};

export default function ClientePicker({
  value, cliente, onChange, required, disabled, placeholder,
}: Props) {
  const { showToast } = useToast();
  const [query, setQuery] = useState(cliente?.nome || '');
  const [results, setResults] = useState<Cliente[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showNewModal, setShowNewModal] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number; width: number }>({
    top: 0, left: 0, width: 0,
  });
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Marca como montado pra createPortal só rodar no client (evita SSR mismatch)
  useEffect(() => { setMounted(true); }, []);

  // Sincroniza query com cliente externo
  useEffect(() => {
    if (cliente && cliente.id === value) {
      setQuery(cliente.nome);
    } else if (value == null) {
      // sem cliente selecionado externo — query reflete digitação
    }
  }, [cliente, value]);

  // Calcula posição do dropdown a partir do bounding box do input
  const updateDropdownPos = useCallback(() => {
    const el = inputRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setDropdownPos({
      top: rect.bottom + window.scrollY,
      left: rect.left + window.scrollX,
      width: rect.width,
    });
  }, []);

  // Atualiza posição quando dropdown abre + em scroll/resize
  useEffect(() => {
    if (!showDropdown) return;
    updateDropdownPos();
    const handler = () => updateDropdownPos();
    window.addEventListener('scroll', handler, true); // capture pra pegar scroll de containers
    window.addEventListener('resize', handler);
    return () => {
      window.removeEventListener('scroll', handler, true);
      window.removeEventListener('resize', handler);
    };
  }, [showDropdown, updateDropdownPos]);

  // Busca debounced — agora reporta erro via toast (era silencioso antes)
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!showDropdown) return;
    debounceRef.current = setTimeout(async () => {
      try {
        setLoading(true);
        const url = query.trim()
          ? `/api/clientes?q=${encodeURIComponent(query)}&ativo=1`
          : '/api/clientes?ativo=1';
        const r = await fetch(url);
        if (!r.ok) {
          const errData = await r.json().catch(() => ({}));
          throw new Error(errData?.error || `HTTP ${r.status}`);
        }
        const data = await r.json();
        setResults(Array.isArray(data) ? data.slice(0, 10) : []);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'falha';
        showToast(`Erro ao buscar clientes: ${msg}`, 'error');
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 220);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, showDropdown, showToast]);

  const selecionar = (c: Cliente) => {
    onChange(c.id, c);
    setQuery(c.nome);
    setShowDropdown(false);
  };

  const limpar = () => {
    onChange(null, null);
    setQuery('');
    setShowDropdown(false);
    inputRef.current?.focus();
  };

  return (
    <>
      <div style={{ position: 'relative' }}>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            // Se o usuário muda o texto após selecionar, considera "deselecionou"
            if (cliente && e.target.value !== cliente.nome) {
              onChange(null, null);
            }
            setShowDropdown(true);
          }}
          onFocus={() => setShowDropdown(true)}
          onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
          required={required}
          disabled={disabled}
          placeholder={placeholder || 'Buscar cliente por nome, telefone ou CPF...'}
          style={{
            width: '100%',
            padding: '11px 38px 11px 14px',
            border: '1.5px solid #e4e4e0',
            background: cliente ? '#f0f7f0' : '#fafaf8',
            fontFamily: 'inherit',
            fontSize: '0.95rem',
            color: '#333',
            outline: 'none',
          }}
        />
        {cliente && (
          <button
            type="button"
            onClick={limpar}
            disabled={disabled}
            title="Limpar"
            style={{
              position: 'absolute',
              right: 8,
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 4,
              color: '#777',
              display: 'flex',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        )}

        {showDropdown && mounted && createPortal(
          <div
            style={{
              position: 'fixed',
              top: dropdownPos.top,
              left: dropdownPos.left,
              width: dropdownPos.width,
              background: '#fff',
              border: '1.5px solid #27367D',
              borderTop: 'none',
              maxHeight: 320,
              overflowY: 'auto',
              zIndex: 9999,
              boxShadow: '0 12px 32px rgba(0,0,0,0.18)',
            }}
            // mousedown preventDefault evita perder foco do input
            onMouseDown={(e) => e.preventDefault()}
          >
            {/* Botão "+ Novo cliente" sempre disponível no topo */}
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => { setShowDropdown(false); setShowNewModal(true); }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                width: '100%',
                padding: '10px 14px',
                background: '#f3f4f8',
                border: 'none',
                borderBottom: '1px solid #e4e4e0',
                cursor: 'pointer',
                color: '#27367D',
                fontFamily: 'inherit',
                fontSize: '0.88rem',
                fontWeight: 600,
                textAlign: 'left',
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <line x1="12" y1="5" x2="12" y2="19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <line x1="5" y1="12" x2="19" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
              Cadastrar novo cliente
              {query.trim() && (
                <span style={{ color: '#777', fontWeight: 400 }}>
                  &nbsp;— &ldquo;{query.trim()}&rdquo;
                </span>
              )}
            </button>

            {loading ? (
              <div style={{ padding: 14, color: '#777', fontSize: '0.86rem' }}>Buscando...</div>
            ) : results.length === 0 ? (
              <div style={{ padding: 14, color: '#999', fontSize: '0.86rem' }}>
                {query.trim() ? 'Nenhum cliente encontrado.' : 'Digite para buscar...'}
              </div>
            ) : (
              results.map((c) => (
                <div
                  key={c.id}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => selecionar(c)}
                  style={{
                    padding: '10px 14px',
                    cursor: 'pointer',
                    borderBottom: '1px solid #f1f1ee',
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = '#f3f4f8'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = '#fff'; }}
                >
                  <div style={{ fontWeight: 600, fontSize: '0.92rem', color: '#222' }}>
                    {c.nome}
                  </div>
                  <div style={{ fontSize: '0.76rem', color: '#777', marginTop: 2 }}>
                    {[c.telefone, c.cpf_cnpj, c.email].filter(Boolean).join(' · ') || 'Sem dados de contato'}
                  </div>
                </div>
              ))
            )}
          </div>,
          document.body,
        )}
      </div>

      {showNewModal && mounted && createPortal(
        <NovoClienteModal
          nomeInicial={query.trim()}
          onClose={() => setShowNewModal(false)}
          onCreated={(c) => {
            setShowNewModal(false);
            onChange(c.id, c);
            setQuery(c.nome);
            showToast('Cliente cadastrado!', 'success');
          }}
        />,
        document.body,
      )}
    </>
  );
}

// ─── Modal de criação inline ───────────────────────────────────────────

function NovoClienteModal({
  nomeInicial, onClose, onCreated,
}: {
  nomeInicial: string;
  onClose: () => void;
  onCreated: (c: Cliente) => void;
}) {
  const { showToast } = useToast();
  const [nome, setNome] = useState(nomeInicial);
  const [telefone, setTelefone] = useState('');
  const [email, setEmail] = useState('');
  const [cpfCnpj, setCpfCnpj] = useState('');
  const [endereco, setEndereco] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) {
      showToast('Nome obrigatório', 'error');
      return;
    }
    setSaving(true);
    try {
      const r = await fetch('/api/clientes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: nome.trim(),
          telefone: telefone.trim(),
          email: email.trim(),
          cpf_cnpj: cpfCnpj.trim(),
          endereco: endereco.trim(),
          observacoes: observacoes.trim(),
        }),
      });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        throw new Error(d.error || 'fail');
      }
      const d = await r.json();
      onCreated({
        id: d.id,
        nome: nome.trim(),
        telefone: telefone.trim(),
        email: email.trim(),
        cpf_cnpj: cpfCnpj.trim(),
        endereco: endereco.trim(),
      });
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Erro ao cadastrar', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 600,
        background: 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
      }}
      onClick={(e) => { if (e.target === e.currentTarget && !saving) onClose(); }}
    >
      <form
        onSubmit={submit}
        style={{
          background: '#FDFDFB',
          width: '100%',
          maxWidth: 520,
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 24px 60px rgba(0,0,0,0.3)',
        }}
      >
        <div
          style={{
            padding: '1.1rem 1.5rem',
            borderBottom: '1px solid #e4e4e0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <h3 style={{ margin: 0, fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.4rem', color: '#27367D' }}>
            Novo cliente
          </h3>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#aaa', padding: 4 }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }}>
          <FormField label="Nome *">
            <input
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Maria Santos"
              required
              autoFocus
            />
          </FormField>
          <Row>
            <FormField label="Telefone">
              <input
                type="text"
                value={telefone}
                onChange={(e) => setTelefone(e.target.value)}
                placeholder="(11) 99999-9999"
              />
            </FormField>
            <FormField label="CPF / CNPJ">
              <input
                type="text"
                value={cpfCnpj}
                onChange={(e) => setCpfCnpj(formatCpfCnpj(e.target.value))}
                placeholder="CPF ou CNPJ"
                inputMode="numeric"
              />
            </FormField>
          </Row>
          <FormField label="E-mail">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="cliente@exemplo.com"
            />
          </FormField>
          <FormField label="Endereço">
            <input
              type="text"
              value={endereco}
              onChange={(e) => setEndereco(e.target.value)}
              placeholder="Rua, número, bairro, cidade/UF"
            />
          </FormField>
          <FormField label="Observações">
            <textarea
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Notas internas (opcional)"
              rows={2}
            />
          </FormField>
        </div>

        <div
          style={{
            padding: '1rem 1.5rem',
            borderTop: '1px solid #e4e4e0',
            display: 'flex',
            gap: 10,
            justifyContent: 'flex-end',
          }}
        >
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            style={{
              padding: '9px 18px',
              background: 'transparent',
              border: '1.5px solid #e4e4e0',
              color: '#777',
              fontFamily: "'Barlow Condensed', sans-serif",
              fontWeight: 700,
              fontSize: '0.85rem',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              cursor: 'pointer',
            }}
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving}
            style={{
              padding: '9px 22px',
              background: '#27367D',
              color: '#FDFDFB',
              border: 'none',
              fontFamily: "'Barlow Condensed', sans-serif",
              fontWeight: 700,
              fontSize: '0.85rem',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              cursor: 'pointer',
              clipPath: 'polygon(8px 0%, 100% 0%, calc(100% - 8px) 100%, 0% 100%)',
              opacity: saving ? 0.6 : 1,
            }}
          >
            {saving ? 'Salvando...' : 'Cadastrar'}
          </button>
        </div>
      </form>
    </div>
  );
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '1.1rem' }}>
      <label
        style={{
          display: 'block',
          fontFamily: "'Barlow Condensed', sans-serif",
          fontWeight: 700,
          fontSize: '0.72rem',
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color: '#777',
          marginBottom: 5,
        }}
      >
        {label}
      </label>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <style jsx>{`
          div :global(input),
          div :global(textarea),
          div :global(select) {
            width: 100%;
            padding: 10px 12px;
            border: 1.5px solid #e4e4e0;
            background: #fafaf8;
            font-family: 'Barlow', sans-serif;
            font-size: 0.92rem;
            color: #333;
            outline: none;
          }
          div :global(input:focus),
          div :global(textarea:focus),
          div :global(select:focus) {
            border-color: #27367d;
            background: #fdfdfb;
          }
          div :global(textarea) {
            resize: vertical;
            min-height: 60px;
          }
        `}</style>
        {children}
      </div>
    </div>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
      {children}
    </div>
  );
}
