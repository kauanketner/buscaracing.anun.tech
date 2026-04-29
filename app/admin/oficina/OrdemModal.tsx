'use client';

import { useEffect, useState } from 'react';
import ClientePicker, { type Cliente } from '@/components/ClientePicker';
import styles from './page.module.css';

type Props = {
  editingId: number | null;
  onClose: () => void;
  onSaved: () => void;
  onToast: (msg: string, type: 'success' | 'error') => void;
};

type FormState = {
  moto_id: string;
  cliente_id: number | null;
  // Snapshot de cliente (preservado pra exibição em OS antigas sem cliente_id)
  cliente_nome: string;
  cliente_telefone: string;
  cliente_email: string;
  moto_marca: string;
  moto_modelo: string;
  moto_ano: string;
  moto_placa: string;
  moto_km: string;
  servico_descricao: string;
  observacoes: string;
  mecanico: string;
  mecanico_id: string;
  valor_estimado: string;
  valor_final: string;
  status: string;
  data_entrada: string;
  data_prevista: string;
  data_conclusao: string;
};

type MotoOption = {
  id: number;
  nome: string;
  marca: string;
  modelo: string | null;
  placa: string | null;
  ano: number | null;
  ano_fabricacao: number | null;
  km: number | null;
};

type MecanicoOption = {
  id: number;
  nome: string;
  ativo: number;
};

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: 'aberta', label: 'Aberta' },
  { value: 'diagnostico', label: 'Diagnóstico' },
  { value: 'em_servico', label: 'Em serviço' },
  { value: 'aguardando_peca', label: 'Aguardando peça' },
  { value: 'aguardando_aprovacao', label: 'Aguardando aprovação' },
  { value: 'aguardando_administrativo', label: 'Aguardando administrativo' },
  { value: 'agendar_entrega', label: 'Agendar entrega' },
  { value: 'lavagem', label: 'Lavagem' },
  { value: 'cancelada', label: 'Cancelada' },
  // 'finalizada' não aparece aqui: use o botão "Fechar OS" (exige valor final).
];

const EMPTY: FormState = {
  moto_id: '',
  cliente_id: null,
  cliente_nome: '',
  cliente_telefone: '',
  cliente_email: '',
  moto_marca: '',
  moto_modelo: '',
  moto_ano: '',
  moto_placa: '',
  moto_km: '',
  servico_descricao: '',
  observacoes: '',
  mecanico: '',
  mecanico_id: '',
  valor_estimado: '',
  valor_final: '',
  status: 'aberta',
  data_entrada: new Date().toISOString().slice(0, 10),
  data_prevista: '',
  data_conclusao: '',
};

function normDate(v: unknown): string {
  if (typeof v !== 'string' || !v) return '';
  return v.slice(0, 10);
}
function normStr(v: unknown): string {
  return typeof v === 'string' ? v : '';
}
function normNum(v: unknown): string {
  if (v === null || v === undefined || v === '') return '';
  return String(v);
}

export default function OrdemModal({ editingId, onClose, onSaved, onToast }: Props) {
  const [form, setForm] = useState<FormState>(EMPTY);
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [motosSelector, setMotosSelector] = useState<MotoOption[]>([]);
  const [mecanicos, setMecanicos] = useState<MecanicoOption[]>([]);

  const isEditing = editingId !== null;

  // Load selector options once
  useEffect(() => {
    (async () => {
      try {
        const [mr, kr] = await Promise.all([
          fetch('/api/motos/selector'),
          fetch('/api/config/mecanicos'),
        ]);
        if (mr.ok) {
          const md = await mr.json();
          setMotosSelector(Array.isArray(md) ? md : []);
        }
        if (kr.ok) {
          const kd = await kr.json();
          setMecanicos(Array.isArray(kd) ? kd : []);
        }
      } catch {
        // silent — selectors are optional
      }
    })();
  }, []);

  useEffect(() => {
    if (!editingId) {
      setForm(EMPTY);
      setCliente(null);
      return;
    }
    const load = async () => {
      setLoading(true);
      try {
        const r = await fetch(`/api/oficina/${editingId}`);
        if (!r.ok) throw new Error('fail');
        const d = await r.json();
        const clienteIdRaw = d.cliente_id;
        const clienteIdNum = clienteIdRaw != null ? Number(clienteIdRaw) : null;
        setForm({
          moto_id: normNum(d.moto_id),
          cliente_id: clienteIdNum,
          cliente_nome: normStr(d.cliente_nome),
          cliente_telefone: normStr(d.cliente_telefone),
          cliente_email: normStr(d.cliente_email),
          moto_marca: normStr(d.moto_marca),
          moto_modelo: normStr(d.moto_modelo),
          moto_ano: normNum(d.moto_ano),
          moto_placa: normStr(d.moto_placa),
          moto_km: normNum(d.moto_km),
          servico_descricao: normStr(d.servico_descricao),
          observacoes: normStr(d.observacoes),
          mecanico: normStr(d.mecanico),
          mecanico_id: normNum(d.mecanico_id),
          valor_estimado: normNum(d.valor_estimado),
          valor_final: normNum(d.valor_final),
          status: normStr(d.status) || 'aberta',
          data_entrada: normDate(d.data_entrada),
          data_prevista: normDate(d.data_prevista),
          data_conclusao: normDate(d.data_conclusao),
        });
        // Se a OS já tem cliente_id, carrega o cliente pra mostrar pré-selecionado
        if (clienteIdNum) {
          try {
            const cr = await fetch(`/api/clientes/${clienteIdNum}`);
            if (cr.ok) {
              const c = await cr.json();
              setCliente({
                id: c.id, nome: c.nome, telefone: c.telefone || '',
                email: c.email || '', cpf_cnpj: c.cpf_cnpj || '',
                endereco: c.endereco || '',
              });
            }
          } catch { /* cliente nao encontrado */ }
        }
      } catch {
        onToast('Erro ao carregar ordem', 'error');
        onClose();
      } finally {
        setLoading(false);
      }
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingId]);

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const onSelectMoto = (id: string) => {
    if (!id) {
      setForm((prev) => ({
        ...prev,
        moto_id: '',
        moto_marca: '',
        moto_modelo: '',
        moto_placa: '',
        moto_ano: '',
      }));
      return;
    }
    const moto = motosSelector.find((m) => String(m.id) === id);
    if (!moto) {
      setForm((prev) => ({ ...prev, moto_id: id }));
      return;
    }
    // Quando vincula, sempre sobrescreve os campos com os dados da moto.
    setForm((prev) => ({
      ...prev,
      moto_id: id,
      moto_marca: moto.marca || '',
      moto_modelo: moto.modelo || moto.nome || '',
      moto_placa: moto.placa || '',
      moto_ano:
        moto.ano != null
          ? String(moto.ano)
          : moto.ano_fabricacao != null
          ? String(moto.ano_fabricacao)
          : '',
    }));
  };

  const clearMoto = () => {
    setForm((prev) => ({
      ...prev,
      moto_id: '',
      moto_marca: '',
      moto_modelo: '',
      moto_placa: '',
      moto_ano: '',
    }));
  };

  const isLinked = !!form.moto_id;
  const motoVinculada = isLinked
    ? motosSelector.find((m) => String(m.id) === form.moto_id) || null
    : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Se temos cliente do banco, ele e a fonte de verdade. Senão, exige nome no snapshot
    // (compatibilidade com OS antigas em edição).
    const clienteNomeFinal = cliente ? cliente.nome : form.cliente_nome.trim();
    const clienteTelFinal = cliente ? (cliente.telefone || '') : form.cliente_telefone.trim();
    const clienteEmailFinal = cliente ? (cliente.email || '') : form.cliente_email.trim();
    if (!clienteNomeFinal) {
      onToast('Selecione ou cadastre o cliente', 'error');
      return;
    }
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        moto_id: form.moto_id || null,
        cliente_id: form.cliente_id || null,
        cliente_nome: clienteNomeFinal,
        cliente_telefone: clienteTelFinal,
        cliente_email: clienteEmailFinal,
        moto_marca: form.moto_marca.trim(),
        moto_modelo: form.moto_modelo.trim(),
        moto_ano: form.moto_ano.trim(),
        moto_placa: form.moto_placa.trim().toUpperCase(),
        moto_km: form.moto_km.trim(),
        servico_descricao: form.servico_descricao.trim(),
        observacoes: form.observacoes.trim(),
        mecanico: form.mecanico.trim(),
        mecanico_id: form.mecanico_id || null,
        status: form.status,
        data_entrada: form.data_entrada || null,
        data_prevista: form.data_prevista || null,
      };
      // Fields that only exist/are relevant in edit mode
      if (isEditing) {
        payload.valor_estimado = form.valor_estimado.trim();
        payload.valor_final = form.valor_final.trim();
        payload.data_conclusao = form.data_conclusao || null;
      }

      const url = isEditing ? `/api/oficina/${editingId}` : '/api/oficina';
      const method = isEditing ? 'PUT' : 'POST';
      const r = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        throw new Error(err?.error || 'fail');
      }
      onToast(isEditing ? 'Ordem atualizada!' : 'Ordem criada!', 'success');
      onSaved();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao salvar';
      onToast(msg, 'error');
    } finally {
      setSaving(false);
    }
  };

  const mecanicosAtivos = mecanicos.filter(
    (m) => m.ativo || String(m.id) === form.mecanico_id,
  );

  return (
    <div
      className={styles.modalOverlay}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className={styles.modal}>
        <form onSubmit={handleSubmit} className={styles.modalForm}>
          <div className={styles.modalHeader}>
            <h3>{isEditing ? 'Editar Ordem' : 'Nova Ordem'}</h3>
            <button
              type="button"
              className={styles.modalClose}
              onClick={onClose}
              aria-label="Fechar"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          <div className={styles.modalBody}>
            {loading ? (
              <div className={styles.empty}>Carregando...</div>
            ) : (
              <>
                <div className={styles.formSection}>
                  <div className={styles.formSectionTitle}>Cliente</div>
                  <div className={styles.formGroup}>
                    <label>Cliente *</label>
                    <ClientePicker
                      value={form.cliente_id}
                      cliente={cliente}
                      onChange={(id, c) => {
                        setCliente(c);
                        setForm((prev) => ({
                          ...prev,
                          cliente_id: id,
                          cliente_nome: c?.nome || '',
                          cliente_telefone: c?.telefone || '',
                          cliente_email: c?.email || '',
                        }));
                      }}
                      required
                    />
                    {cliente && (
                      <div style={{ fontSize: '0.78rem', color: '#777', marginTop: 6 }}>
                        {[cliente.telefone, cliente.cpf_cnpj, cliente.email].filter(Boolean).join(' · ') || 'Sem dados de contato'}
                      </div>
                    )}
                    {/* Compatibilidade: OS antiga sem cliente_id mas com snapshot */}
                    {!cliente && form.cliente_nome && (
                      <div
                        style={{
                          marginTop: 8,
                          padding: '8px 10px',
                          background: '#fff8ec',
                          border: '1px solid #f0b429',
                          fontSize: '0.78rem',
                          color: '#856404',
                        }}
                      >
                        OS antiga — snapshot atual: <strong>{form.cliente_nome}</strong>
                        {form.cliente_telefone && ` · ${form.cliente_telefone}`}
                        {form.cliente_email && ` · ${form.cliente_email}`}.
                        Selecione um cliente acima para vincular.
                      </div>
                    )}
                  </div>
                </div>

                {/* Vínculo com anúncio (opcional) */}
                <div className={styles.formSection}>
                  <div className={styles.formSectionTitle}>Moto do estoque (opcional)</div>
                  <div className={styles.formGroup}>
                    <label>Vincular a um anúncio</label>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <select
                        style={{ flex: 1 }}
                        value={form.moto_id}
                        onChange={(e) => onSelectMoto(e.target.value)}
                      >
                        <option value="">— Não vinculado —</option>
                        {motosSelector.map((m) => (
                          <option key={m.id} value={m.id}>
                            #{m.id} {m.nome}
                            {m.placa ? ` — ${m.placa}` : ''}
                          </option>
                        ))}
                      </select>
                      {isLinked && (
                        <button
                          type="button"
                          className={`${styles.btn} ${styles.btnGhost} ${styles.btnSm}`}
                          onClick={clearMoto}
                        >
                          Desvincular
                        </button>
                      )}
                    </div>
                    {isLinked && (
                      <p style={{ fontSize: '0.75rem', color: '#777', marginTop: 6 }}>
                        O custo desta ordem será somado aos custos da moto e reduzirá o lucro do anúncio.
                      </p>
                    )}
                  </div>
                </div>

                <div className={styles.formSection}>
                  <div className={styles.formSectionTitle}>Moto</div>
                  {isLinked ? (
                    <>
                      <div
                        style={{
                          background: '#f8f8f5',
                          border: '1px solid #e4e4e0',
                          padding: '10px 14px',
                          marginBottom: 12,
                          fontSize: '0.85rem',
                          color: '#333',
                          display: 'grid',
                          gridTemplateColumns: 'repeat(2, 1fr)',
                          gap: '6px 16px',
                        }}
                      >
                        <div>
                          <strong style={{ color: '#777', fontSize: '0.72rem', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                            Moto vinculada
                          </strong>
                          <div>
                            {motoVinculada?.nome ||
                              [form.moto_marca, form.moto_modelo].filter(Boolean).join(' ') ||
                              '—'}
                          </div>
                        </div>
                        <div>
                          <strong style={{ color: '#777', fontSize: '0.72rem', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                            Placa · Ano
                          </strong>
                          <div style={{ fontFamily: 'Courier New, monospace', textTransform: 'uppercase' }}>
                            {(form.moto_placa || '—')}
                            {' · '}
                            <span style={{ fontFamily: 'Barlow, sans-serif', textTransform: 'none' }}>
                              {form.moto_ano || '—'}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className={styles.formGroup}>
                        <label>KM atual (na entrada)</label>
                        <input
                          type="number"
                          value={form.moto_km}
                          onChange={(e) => setField('moto_km', e.target.value)}
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      <div className={styles.formRow}>
                        <div className={styles.formGroup}>
                          <label>Marca</label>
                          <input
                            type="text"
                            value={form.moto_marca}
                            onChange={(e) => setField('moto_marca', e.target.value)}
                          />
                        </div>
                        <div className={styles.formGroup}>
                          <label>Modelo</label>
                          <input
                            type="text"
                            value={form.moto_modelo}
                            onChange={(e) => setField('moto_modelo', e.target.value)}
                          />
                        </div>
                      </div>
                      <div className={styles.formRow3}>
                        <div className={styles.formGroup}>
                          <label>Ano</label>
                          <input
                            type="number"
                            value={form.moto_ano}
                            onChange={(e) => setField('moto_ano', e.target.value)}
                          />
                        </div>
                        <div className={styles.formGroup}>
                          <label>Placa</label>
                          <input
                            type="text"
                            value={form.moto_placa}
                            onChange={(e) => setField('moto_placa', e.target.value.toUpperCase())}
                            style={{ textTransform: 'uppercase' }}
                          />
                        </div>
                        <div className={styles.formGroup}>
                          <label>KM</label>
                          <input
                            type="number"
                            value={form.moto_km}
                            onChange={(e) => setField('moto_km', e.target.value)}
                          />
                        </div>
                      </div>
                    </>
                  )}
                </div>

                <div className={styles.formSection}>
                  <div className={styles.formSectionTitle}>Serviço</div>
                  <div className={styles.formGroup}>
                    <label>Descrição do serviço</label>
                    <textarea
                      value={form.servico_descricao}
                      onChange={(e) => setField('servico_descricao', e.target.value)}
                      rows={3}
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label>Observações</label>
                    <textarea
                      value={form.observacoes}
                      onChange={(e) => setField('observacoes', e.target.value)}
                      rows={2}
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label>Mecânico responsável</label>
                    <select
                      value={form.mecanico_id}
                      onChange={(e) => {
                        const id = e.target.value;
                        const found = mecanicos.find((m) => String(m.id) === id);
                        setForm((prev) => ({
                          ...prev,
                          mecanico_id: id,
                          mecanico: found ? found.nome : '',
                        }));
                      }}
                    >
                      <option value="">— Selecione —</option>
                      {mecanicosAtivos.map((m) => (
                        <option key={m.id} value={String(m.id)}>
                          {m.nome}
                          {!m.ativo ? ' (inativo)' : ''}
                        </option>
                      ))}
                    </select>
                    {mecanicos.length === 0 && (
                      <p style={{ fontSize: '0.75rem', color: '#777', marginTop: 6 }}>
                        Nenhum mecânico cadastrado. Cadastre em Admin → Mecânicos.
                      </p>
                    )}
                  </div>
                </div>

                <div className={styles.formSection}>
                  <div className={styles.formSectionTitle}>Status e Prazos</div>
                  {isEditing && (
                    <>
                      <div className={styles.formRow}>
                        <div className={styles.formGroup}>
                          <label>Valor estimado (R$)</label>
                          <input
                            type="number"
                            step="0.01"
                            value={form.valor_estimado}
                            onChange={(e) => setField('valor_estimado', e.target.value)}
                          />
                        </div>
                        <div className={styles.formGroup}>
                          <label>Valor final (R$)</label>
                          <input
                            type="number"
                            step="0.01"
                            value={form.valor_final}
                            onChange={(e) => setField('valor_final', e.target.value)}
                          />
                        </div>
                      </div>
                    </>
                  )}
                  <div className={styles.formGroup}>
                    <label>Status</label>
                    <select
                      value={form.status}
                      onChange={(e) => setField('status', e.target.value)}
                    >
                      {STATUS_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className={isEditing ? styles.formRow : styles.formRow}>
                    <div className={styles.formGroup}>
                      <label>Data de entrada</label>
                      <input
                        type="date"
                        value={form.data_entrada}
                        onChange={(e) => setField('data_entrada', e.target.value)}
                      />
                    </div>
                    <div className={styles.formGroup}>
                      <label>Previsão</label>
                      <input
                        type="date"
                        value={form.data_prevista}
                        onChange={(e) => setField('data_prevista', e.target.value)}
                      />
                    </div>
                    {isEditing && (
                      <div className={styles.formGroup}>
                        <label>Conclusão</label>
                        <input
                          type="date"
                          value={form.data_conclusao}
                          onChange={(e) => setField('data_conclusao', e.target.value)}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          <div className={styles.modalFooter}>
            <button
              type="button"
              className={`${styles.btn} ${styles.btnGhost}`}
              onClick={onClose}
              disabled={saving}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className={`${styles.btn} ${styles.btnPrimary}`}
              disabled={saving || loading}
            >
              {saving ? 'Salvando...' : isEditing ? 'Salvar alterações' : 'Criar ordem'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
