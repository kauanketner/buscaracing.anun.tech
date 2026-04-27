'use client';

import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { useToast } from '@/components/Toast';

type OsServico = {
  id: number;
  servico_id: number | null;
  nome_snapshot: string;
  codigo_snapshot: string;
  quantidade: number;
  preco_unitario: number;
};

type Servico = {
  id: number;
  nome: string;
  codigo: string;
  categoria: string;
  preco: number | null;
  ativo: number;
};

type Props = {
  ordemId: number;
  onTotalChange?: (total: number) => void;
};

function fmtBRL(v: number): string {
  return `R$ ${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
}

export default function ServicosSection({ ordemId, onTotalChange }: Props) {
  const { showToast } = useToast();
  const [servicos, setServicos] = useState<OsServico[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPicker, setShowPicker] = useState(false);
  const [showCustom, setShowCustom] = useState(false);

  const reload = useCallback(async () => {
    try {
      const r = await fetch(`/api/oficina/${ordemId}/servicos`);
      if (r.ok) setServicos(await r.json());
    } catch {
      showToast('Erro ao carregar serviços', 'error');
    } finally {
      setLoading(false);
    }
  }, [ordemId, showToast]);

  useEffect(() => { reload(); }, [reload]);

  const total = useMemo(
    () => servicos.reduce((s, p) => s + Number(p.preco_unitario) * Number(p.quantidade), 0),
    [servicos],
  );

  useEffect(() => {
    onTotalChange?.(total);
  }, [total, onTotalChange]);

  const attach = async (payload: { servico_id?: number; nome?: string; codigo?: string; quantidade: number; preco_unitario: number }) => {
    try {
      const r = await fetch(`/api/oficina/${ordemId}/servicos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!r.ok) throw new Error('fail');
      showToast('Serviço adicionado', 'success');
      setShowPicker(false);
      setShowCustom(false);
      await reload();
    } catch {
      showToast('Erro ao adicionar serviço', 'error');
    }
  };

  const update = async (id: number, patch: { quantidade?: number; preco_unitario?: number }) => {
    try {
      await fetch(`/api/oficina/${ordemId}/servicos/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
      await reload();
    } catch {
      showToast('Erro ao atualizar', 'error');
    }
  };

  const remove = async (id: number) => {
    if (!confirm('Remover este serviço da OS?')) return;
    try {
      const r = await fetch(`/api/oficina/${ordemId}/servicos/${id}`, { method: 'DELETE' });
      if (!r.ok) throw new Error('fail');
      showToast('Serviço removido', 'success');
      await reload();
    } catch {
      showToast('Erro ao remover', 'error');
    }
  };

  const wrapStyle: React.CSSProperties = {
    background: '#fff',
    border: '1px solid #e4e4e0',
    padding: '1.25rem',
    marginTop: '1rem',
  };
  const titleStyle: React.CSSProperties = {
    fontFamily: "'Barlow Condensed', sans-serif",
    fontWeight: 700,
    fontSize: '0.78rem',
    letterSpacing: '0.14em',
    textTransform: 'uppercase',
    color: '#27367D',
    margin: 0,
  };
  const btnPrimary: React.CSSProperties = {
    background: '#27367D',
    color: '#fff',
    border: 'none',
    padding: '6px 14px',
    fontFamily: "'Barlow Condensed', sans-serif",
    fontWeight: 700,
    fontSize: '0.75rem',
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    cursor: 'pointer',
  };
  const btnGhost: React.CSSProperties = {
    background: 'transparent',
    color: '#555',
    border: '1px solid #e4e4e0',
    padding: '6px 14px',
    fontFamily: "'Barlow Condensed', sans-serif",
    fontWeight: 700,
    fontSize: '0.75rem',
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    cursor: 'pointer',
  };

  return (
    <div style={wrapStyle}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
        <h3 style={titleStyle}>
          Serviços executados ({servicos.length})
        </h3>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <button type="button" style={btnGhost} onClick={() => setShowCustom(true)}>
            + Serviço avulso
          </button>
          <button type="button" style={btnPrimary} onClick={() => setShowPicker(true)}>
            + Do catálogo
          </button>
        </div>
      </div>

      {loading && <p style={{ color: '#777', fontSize: '0.85rem', margin: 0 }}>Carregando...</p>}
      {!loading && servicos.length === 0 && (
        <p style={{ color: '#999', fontSize: '0.85rem', margin: 0 }}>
          Nenhum serviço lançado ainda. Clique em &ldquo;+ Do catálogo&rdquo; ou &ldquo;+ Serviço avulso&rdquo;.
        </p>
      )}

      {servicos.length > 0 && (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #e4e4e0' }}>
              <th style={{ padding: '8px 0', textAlign: 'left', fontWeight: 700, fontSize: '0.72rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#777' }}>Serviço</th>
              <th style={{ padding: '8px 0', textAlign: 'center', fontWeight: 700, fontSize: '0.72rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#777', width: 70 }}>Qtd</th>
              <th style={{ padding: '8px 0', textAlign: 'right', fontWeight: 700, fontSize: '0.72rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#777', width: 110 }}>Preço un.</th>
              <th style={{ padding: '8px 0', textAlign: 'right', fontWeight: 700, fontSize: '0.72rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#777', width: 110 }}>Subtotal</th>
              <th style={{ width: 60 }}></th>
            </tr>
          </thead>
          <tbody>
            {servicos.map((p) => {
              const subtotal = Number(p.preco_unitario) * Number(p.quantidade);
              return (
                <tr key={p.id} style={{ borderBottom: '1px solid #f1f1ee' }}>
                  <td style={{ padding: '10px 0' }}>
                    <div style={{ fontWeight: 600 }}>{p.nome_snapshot}</div>
                    {p.codigo_snapshot && (
                      <div style={{ fontSize: '0.76rem', color: '#777' }}>#{p.codigo_snapshot}</div>
                    )}
                  </td>
                  <td style={{ padding: '10px 6px', textAlign: 'center' }}>
                    <input
                      type="number" min="1" value={p.quantidade}
                      onChange={(e) => {
                        const q = Math.max(1, Math.floor(Number(e.target.value) || 1));
                        setServicos((cur) => cur.map((x) => x.id === p.id ? { ...x, quantidade: q } : x));
                      }}
                      onBlur={(e) => {
                        const q = Math.max(1, Math.floor(Number(e.target.value) || 1));
                        if (q !== p.quantidade) update(p.id, { quantidade: q });
                      }}
                      style={{ width: 56, padding: '4px 6px', border: '1px solid #e4e4e0', textAlign: 'center', fontSize: '0.88rem' }}
                    />
                  </td>
                  <td style={{ padding: '10px 6px', textAlign: 'right' }}>
                    <input
                      type="number" min="0" step="0.01" value={p.preco_unitario}
                      onChange={(e) => {
                        const val = Number(e.target.value) || 0;
                        setServicos((cur) => cur.map((x) => x.id === p.id ? { ...x, preco_unitario: val } : x));
                      }}
                      onBlur={(e) => {
                        const val = Number(e.target.value) || 0;
                        if (val !== p.preco_unitario) update(p.id, { preco_unitario: val });
                      }}
                      style={{ width: 90, padding: '4px 6px', border: '1px solid #e4e4e0', textAlign: 'right', fontSize: '0.88rem' }}
                    />
                  </td>
                  <td style={{ padding: '10px 0', textAlign: 'right', fontWeight: 600, color: '#155724' }}>
                    {fmtBRL(subtotal)}
                  </td>
                  <td style={{ padding: '10px 0', textAlign: 'right' }}>
                    <button type="button" onClick={() => remove(p.id)}
                      style={{ background: 'none', border: 'none', color: '#dc3545', cursor: 'pointer', padding: 4 }}
                      title="Remover">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                        <polyline points="3 6 5 6 21 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6M10 11v6M14 11v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={3} style={{ padding: '12px 0 4px', textAlign: 'right', fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: '0.82rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#777' }}>
                Total dos serviços
              </td>
              <td style={{ padding: '12px 0 4px', textAlign: 'right', fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.3rem', color: '#27367D' }}>
                {fmtBRL(total)}
              </td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      )}

      {showPicker && (
        <ServicoPickerModal
          onClose={() => setShowPicker(false)}
          onPick={(s) => attach({ servico_id: s.id, quantidade: 1, preco_unitario: s.preco || 0 })}
        />
      )}
      {showCustom && (
        <CustomServicoModal
          onClose={() => setShowCustom(false)}
          onAdd={(payload) => attach(payload)}
        />
      )}
    </div>
  );
}

// ---- Modal: picker do catálogo ----
function ServicoPickerModal({ onClose, onPick }: { onClose: () => void; onPick: (s: Servico) => void }) {
  const { showToast } = useToast();
  const [items, setItems] = useState<Servico[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch('/api/servicos');
        if (r.ok) setItems(await r.json());
      } catch {
        showToast('Erro ao carregar catálogo', 'error');
      } finally {
        setLoading(false);
      }
    })();
  }, [showToast]);

  const filtered = items.filter((s) => {
    if (!s.ativo) return false;
    if (q) {
      const t = `${s.nome} ${s.codigo} ${s.categoria}`.toLowerCase();
      if (!t.includes(q.toLowerCase())) return false;
    }
    return true;
  });

  return (
    <div style={overlayStyle} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ ...modalStyle, maxWidth: 560 }}>
        <div style={modalHeader}>
          <h3 style={{ margin: 0, fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.4rem', color: '#27367D' }}>
            Adicionar serviço do catálogo
          </h3>
          <button type="button" onClick={onClose} style={closeBtn}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #e4e4e0' }}>
          <input type="text" placeholder="Buscar serviço..."
            value={q} onChange={(e) => setQ(e.target.value)}
            style={{ width: '100%', padding: '8px 12px', border: '1px solid #e4e4e0', fontSize: '0.88rem' }} />
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '0.5rem 1.25rem 1.25rem' }}>
          {loading && <p style={{ color: '#777', padding: '1rem 0' }}>Carregando...</p>}
          {!loading && filtered.length === 0 && (
            <p style={{ color: '#999', padding: '1rem 0' }}>
              {items.length === 0
                ? 'Nenhum serviço cadastrado. Cadastre em /admin/servicos.'
                : 'Nenhum resultado para a busca.'}
            </p>
          )}
          {filtered.map((s) => (
            <button key={s.id} type="button" onClick={() => onPick(s)}
              style={{
                display: 'flex', width: '100%', alignItems: 'center', gap: 12, padding: '10px 0',
                borderBottom: '1px solid #f1f1ee', background: 'none', border: 0,
                borderBottomWidth: 1, borderBottomStyle: 'solid', borderBottomColor: '#f1f1ee',
                cursor: 'pointer', textAlign: 'left',
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: '0.92rem' }}>{s.nome}</div>
                <div style={{ fontSize: '0.75rem', color: '#777' }}>
                  {s.codigo && `#${s.codigo} · `}{s.categoria || 'sem categoria'}
                </div>
              </div>
              <div style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                <div style={{ fontWeight: 700, color: '#27367D', fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.1rem' }}>
                  {s.preco ? fmtBRL(s.preco) : '—'}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---- Modal: serviço avulso (sem estar no catálogo) ----
function CustomServicoModal({ onClose, onAdd }: { onClose: () => void; onAdd: (payload: { nome: string; codigo: string; quantidade: number; preco_unitario: number }) => void }) {
  const [nome, setNome] = useState('');
  const [codigo, setCodigo] = useState('');
  const [qtd, setQtd] = useState('1');
  const [preco, setPreco] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) return;
    setSaving(true);
    await onAdd({
      nome: nome.trim(),
      codigo: codigo.trim(),
      quantidade: Math.max(1, Number(qtd) || 1),
      preco_unitario: Number(preco) || 0,
    });
    setSaving(false);
  };

  return (
    <div style={overlayStyle} onClick={(e) => { if (e.target === e.currentTarget && !saving) onClose(); }}>
      <div style={{ ...modalStyle, maxWidth: 440 }}>
        <div style={modalHeader}>
          <h3 style={{ margin: 0, fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.4rem', color: '#27367D' }}>
            Serviço avulso
          </h3>
          <button type="button" onClick={onClose} style={closeBtn}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <form onSubmit={submit}>
          <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label style={fieldLabel}>Nome do serviço *</label>
              <input type="text" value={nome} onChange={(e) => setNome(e.target.value)} required
                style={fieldInput} placeholder="Ex: Diagnóstico elétrico avulso" autoFocus />
            </div>
            <div>
              <label style={fieldLabel}>Código</label>
              <input type="text" value={codigo} onChange={(e) => setCodigo(e.target.value)}
                style={fieldInput} placeholder="Opcional" />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label style={fieldLabel}>Quantidade</label>
                <input type="number" min="1" value={qtd} onChange={(e) => setQtd(e.target.value)}
                  style={fieldInput} />
              </div>
              <div>
                <label style={fieldLabel}>Preço unitário (R$)</label>
                <input type="number" step="0.01" min="0" value={preco} onChange={(e) => setPreco(e.target.value)}
                  style={fieldInput} placeholder="0.00" />
              </div>
            </div>
          </div>
          <div style={{ padding: '1rem 1.25rem', borderTop: '1px solid #e4e4e0', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button type="button" onClick={onClose} disabled={saving}
              style={{ padding: '8px 16px', background: 'transparent', border: '1.5px solid #e4e4e0', cursor: 'pointer', fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: '0.82rem', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              Cancelar
            </button>
            <button type="submit" disabled={saving}
              style={{ padding: '8px 16px', background: '#27367D', color: '#fff', border: 'none', cursor: 'pointer', fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: '0.82rem', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              {saving ? 'Adicionando...' : 'Adicionar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Shared styles
const overlayStyle: React.CSSProperties = {
  position: 'fixed', inset: 0, zIndex: 500, background: 'rgba(0,0,0,0.6)',
  display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem',
};
const modalStyle: React.CSSProperties = {
  background: '#fff', width: '100%', maxHeight: '92vh',
  display: 'flex', flexDirection: 'column',
  boxShadow: '0 24px 60px rgba(0,0,0,0.3)',
};
const modalHeader: React.CSSProperties = {
  padding: '1rem 1.25rem', borderBottom: '1px solid #e4e4e0',
  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
};
const closeBtn: React.CSSProperties = {
  background: 'none', border: 'none', cursor: 'pointer', color: '#aaa', padding: 4,
};
const fieldLabel: React.CSSProperties = {
  display: 'block', fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700,
  fontSize: '0.72rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#777', marginBottom: 4,
};
const fieldInput: React.CSSProperties = {
  width: '100%', padding: '10px 12px', border: '1.5px solid #e4e4e0', fontSize: '0.92rem', outline: 'none',
};
