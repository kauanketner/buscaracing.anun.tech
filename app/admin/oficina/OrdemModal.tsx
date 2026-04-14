'use client';

import { useEffect, useState } from 'react';
import styles from './page.module.css';

type Props = {
  editingId: number | null;
  onClose: () => void;
  onSaved: () => void;
  onToast: (msg: string, type: 'success' | 'error') => void;
};

type FormState = {
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
  valor_estimado: string;
  valor_final: string;
  status: string;
  data_entrada: string;
  data_prevista: string;
  data_conclusao: string;
};

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: 'aberta', label: 'Aberta' },
  { value: 'em_andamento', label: 'Em andamento' },
  { value: 'aguardando_peca', label: 'Aguardando peça' },
  { value: 'concluida', label: 'Concluída' },
  { value: 'entregue', label: 'Entregue' },
  { value: 'cancelada', label: 'Cancelada' },
];

const EMPTY: FormState = {
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
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!editingId) {
      setForm(EMPTY);
      return;
    }
    const load = async () => {
      setLoading(true);
      try {
        const r = await fetch(`/api/oficina/${editingId}`);
        if (!r.ok) throw new Error('fail');
        const d = await r.json();
        setForm({
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
          valor_estimado: normNum(d.valor_estimado),
          valor_final: normNum(d.valor_final),
          status: normStr(d.status) || 'aberta',
          data_entrada: normDate(d.data_entrada),
          data_prevista: normDate(d.data_prevista),
          data_conclusao: normDate(d.data_conclusao),
        });
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.cliente_nome.trim()) {
      onToast('Informe o nome do cliente', 'error');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        cliente_nome: form.cliente_nome.trim(),
        cliente_telefone: form.cliente_telefone.trim(),
        cliente_email: form.cliente_email.trim(),
        moto_marca: form.moto_marca.trim(),
        moto_modelo: form.moto_modelo.trim(),
        moto_ano: form.moto_ano.trim(),
        moto_placa: form.moto_placa.trim().toUpperCase(),
        moto_km: form.moto_km.trim(),
        servico_descricao: form.servico_descricao.trim(),
        observacoes: form.observacoes.trim(),
        mecanico: form.mecanico.trim(),
        valor_estimado: form.valor_estimado.trim(),
        valor_final: form.valor_final.trim(),
        status: form.status,
        data_entrada: form.data_entrada || null,
        data_prevista: form.data_prevista || null,
        data_conclusao: form.data_conclusao || null,
      };
      const url = editingId ? `/api/oficina/${editingId}` : '/api/oficina';
      const method = editingId ? 'PUT' : 'POST';
      const r = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        throw new Error(err?.error || 'fail');
      }
      onToast(editingId ? 'Ordem atualizada!' : 'Ordem criada!', 'success');
      onSaved();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao salvar';
      onToast(msg, 'error');
    } finally {
      setSaving(false);
    }
  };

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
            <h3>{editingId ? 'Editar Ordem' : 'Nova Ordem'}</h3>
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
                    <label>Nome *</label>
                    <input
                      type="text"
                      value={form.cliente_nome}
                      onChange={(e) => setField('cliente_nome', e.target.value)}
                      required
                    />
                  </div>
                  <div className={styles.formRow}>
                    <div className={styles.formGroup}>
                      <label>Telefone</label>
                      <input
                        type="text"
                        value={form.cliente_telefone}
                        onChange={(e) => setField('cliente_telefone', e.target.value)}
                      />
                    </div>
                    <div className={styles.formGroup}>
                      <label>Email</label>
                      <input
                        type="email"
                        value={form.cliente_email}
                        onChange={(e) => setField('cliente_email', e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <div className={styles.formSection}>
                  <div className={styles.formSectionTitle}>Moto</div>
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
                    <input
                      type="text"
                      value={form.mecanico}
                      onChange={(e) => setField('mecanico', e.target.value)}
                    />
                  </div>
                </div>

                <div className={styles.formSection}>
                  <div className={styles.formSectionTitle}>Valores e Status</div>
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
                  <div className={styles.formRow3}>
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
                    <div className={styles.formGroup}>
                      <label>Conclusão</label>
                      <input
                        type="date"
                        value={form.data_conclusao}
                        onChange={(e) => setField('data_conclusao', e.target.value)}
                      />
                    </div>
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
              {saving ? 'Salvando...' : editingId ? 'Salvar alterações' : 'Criar ordem'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
