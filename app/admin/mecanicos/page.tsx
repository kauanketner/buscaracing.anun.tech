'use client';

/**
 * Página unificada de mecânicos.
 *
 * Aqui o admin:
 *  - cadastra / edita / remove mecânicos (mesma tabela mecanicos; "mecânico" é o
 *    papel quem pode logar no PWA, mas todo mundo que está aqui também serve
 *    como mecânico no modal de OS);
 *  - define / troca / desativa o PIN de acesso ao PWA;
 *  - copia / rotaciona o link compartilhado (`/m/<slug>`).
 *
 * A antiga seção "Mecânicos" em /admin/config foi removida — este é o lugar
 * único pra administrar pessoas da oficina.
 */
import { useCallback, useContext, useEffect, useState } from 'react';
import { HeaderActionsContext } from '../HeaderActionsContext';
import { useToast } from '@/components/Toast';
import styles from './page.module.css';

type Mecanico = {
  id: number;
  nome: string;
  telefone: string;
  email: string;
  especialidade: string;
  ativo: number;
  pin_ativo: number;
  pin_trocado_em: string | null;
  has_pin: number;
};

type FormState = {
  nome: string;
  especialidade: string;
  telefone: string;
  email: string;
};

const EMPTY_FORM: FormState = {
  nome: '',
  especialidade: '',
  telefone: '',
  email: '',
};

export default function MecanicosPage() {
  const headerCtx = useContext(HeaderActionsContext);
  const { showToast } = useToast();

  const [list, setList] = useState<Mecanico[]>([]);
  const [loading, setLoading] = useState(true);
  const [slug, setSlug] = useState('');
  const [rotating, setRotating] = useState(false);

  // Modal de PIN
  const [pinModal, setPinModal] = useState<{ id: number; nome: string } | null>(
    null,
  );
  const [pinInput, setPinInput] = useState('');
  const [savingPin, setSavingPin] = useState(false);
  const [generatedPin, setGeneratedPin] = useState<string | null>(null);

  // Modal de confirmação de rotação
  const [confirmRotate, setConfirmRotate] = useState(false);

  // Modal de criar / editar mecânico
  const [formModal, setFormModal] = useState<
    | { mode: 'create' }
    | { mode: 'edit'; id: number; ativo: number }
    | null
  >(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [savingForm, setSavingForm] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const [r1, r2] = await Promise.all([
        fetch('/api/admin/mecanicos'),
        fetch('/api/admin/mecanicos/slug'),
      ]);
      if (r1.ok) {
        const d = await r1.json();
        setList(Array.isArray(d) ? d : []);
      }
      if (r2.ok) {
        const d = await r2.json();
        setSlug(d?.slug || '');
      }
    } catch {
      showToast('Erro ao carregar mecânicos', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    reload();
  }, [reload]);

  useEffect(() => {
    if (!headerCtx) return;
    headerCtx.setActions(
      <button
        type="button"
        className={`${styles.btn} ${styles.btnPrimary}`}
        onClick={() => {
          setForm(EMPTY_FORM);
          setFormModal({ mode: 'create' });
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
          <line x1="12" y1="5" x2="12" y2="19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <line x1="5" y1="12" x2="19" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
        Novo mecânico
      </button>,
    );
    return () => headerCtx.setActions(null);
  }, [headerCtx]);

  // ---------- CRUD mecânico ----------

  const openEdit = (t: Mecanico) => {
    setForm({
      nome: t.nome || '',
      especialidade: t.especialidade || '',
      telefone: t.telefone || '',
      email: t.email || '',
    });
    setFormModal({ mode: 'edit', id: t.id, ativo: t.ativo });
  };

  const submitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formModal) return;
    const nome = form.nome.trim();
    if (!nome) {
      showToast('Informe o nome do mecânico', 'error');
      return;
    }
    setSavingForm(true);
    try {
      if (formModal.mode === 'create') {
        const r = await fetch('/api/config/mecanicos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nome,
            especialidade: form.especialidade.trim(),
            telefone: form.telefone.trim(),
            email: form.email.trim(),
          }),
        });
        if (!r.ok) throw new Error('fail');
        showToast('Mecânico cadastrado', 'success');
      } else {
        const r = await fetch(`/api/config/mecanicos/${formModal.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nome,
            especialidade: form.especialidade.trim(),
            telefone: form.telefone.trim(),
            email: form.email.trim(),
            ativo: !!formModal.ativo,
          }),
        });
        if (!r.ok) throw new Error('fail');
        showToast('Mecânico atualizado', 'success');
      }
      setFormModal(null);
      setForm(EMPTY_FORM);
      await reload();
    } catch {
      showToast('Erro ao salvar mecânico', 'error');
    } finally {
      setSavingForm(false);
    }
  };

  const toggleAtivo = async (t: Mecanico) => {
    try {
      const r = await fetch(`/api/config/mecanicos/${t.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: t.nome,
          telefone: t.telefone,
          email: t.email,
          especialidade: t.especialidade,
          ativo: !t.ativo,
        }),
      });
      if (!r.ok) throw new Error('fail');
      showToast(t.ativo ? 'Mecânico desativado' : 'Mecânico reativado', 'success');
      await reload();
    } catch {
      showToast('Erro ao atualizar mecânico', 'error');
    }
  };

  const removeMecanico = async (t: Mecanico) => {
    if (!confirm(`Remover o mecânico "${t.nome}"? Esta ação não pode ser desfeita.`)) return;
    try {
      const r = await fetch(`/api/config/mecanicos/${t.id}`, { method: 'DELETE' });
      if (!r.ok) throw new Error('fail');
      showToast('Mecânico removido', 'success');
      await reload();
    } catch {
      showToast('Erro ao remover mecânico', 'error');
    }
  };

  // ---------- PIN ----------

  const openPinModal = (t: Mecanico) => {
    setPinInput('');
    setGeneratedPin(null);
    setPinModal({ id: t.id, nome: t.nome });
  };
  const closePinModal = () => {
    setPinModal(null);
    setPinInput('');
    setGeneratedPin(null);
  };

  const savePin = async (gerar: boolean) => {
    if (!pinModal) return;
    if (!gerar && !/^\d{6}$/.test(pinInput)) {
      showToast('PIN deve ter 6 dígitos', 'error');
      return;
    }
    setSavingPin(true);
    try {
      const r = await fetch(`/api/admin/mecanicos/${pinModal.id}/pin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(gerar ? { gerar: true } : { pin: pinInput }),
      });
      if (!r.ok) throw new Error('fail');
      const d = await r.json();
      setGeneratedPin(d?.pin || null);
      await reload();
      showToast('PIN definido com sucesso', 'success');
    } catch {
      showToast('Erro ao salvar PIN', 'error');
    } finally {
      setSavingPin(false);
    }
  };

  const revokePin = async (t: Mecanico) => {
    if (!confirm(`Desativar o acesso de ${t.nome} ao app?`)) return;
    try {
      const r = await fetch(`/api/admin/mecanicos/${t.id}/pin`, {
        method: 'DELETE',
      });
      if (!r.ok) throw new Error('fail');
      showToast('Acesso revogado', 'success');
      await reload();
    } catch {
      showToast('Erro ao revogar acesso', 'error');
    }
  };

  const rotateSlug = async () => {
    setRotating(true);
    try {
      const r = await fetch('/api/admin/mecanicos/slug', { method: 'POST' });
      if (!r.ok) throw new Error('fail');
      const d = await r.json();
      setSlug(d?.slug || '');
      setConfirmRotate(false);
      showToast('Link rotacionado. Avise o time.', 'success');
    } catch {
      showToast('Erro ao rotacionar link', 'error');
    } finally {
      setRotating(false);
    }
  };

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const fullLink = slug ? `${origin}/m/${slug}` : '';

  return (
    <>
      <div className={styles.wrap}>
        <div className={styles.linkCard}>
          <div className={styles.linkCardLabel}>Link de acesso do app da oficina</div>
          <div className={styles.linkCardValue}>
            <code>{fullLink || '(gerando…)'}</code>
            <button
              type="button"
              className={styles.btnGhost}
              onClick={() => {
                if (fullLink) {
                  navigator.clipboard.writeText(fullLink);
                  showToast('Link copiado', 'success');
                }
              }}
            >
              Copiar
            </button>
            <button
              type="button"
              className={styles.btnDanger}
              onClick={() => setConfirmRotate(true)}
            >
              Rotacionar
            </button>
          </div>
          <p className={styles.linkCardHint}>
            Compartilhe este link com os mecânicos (WhatsApp). Rotacionar invalida
            o link atual e o PWA instalado — use quando alguém sair ou você
            suspeitar de vazamento.
          </p>
        </div>

        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Nome</th>
                <th>Especialidade</th>
                <th>Telefone</th>
                <th>Acesso ao app</th>
                <th>Último PIN</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {list.map((t) => {
                const acesso = !t.ativo
                  ? { label: 'Inativo', cls: styles.bgGray }
                  : t.pin_ativo
                  ? { label: 'Ativo', cls: styles.bgGreen }
                  : t.has_pin
                  ? { label: 'Desativado', cls: styles.bgRed }
                  : { label: 'Sem PIN', cls: styles.bgGray };
                return (
                  <tr key={t.id}>
                    <td className={styles.tdName}>{t.nome}</td>
                    <td className={styles.tdSub}>{t.especialidade || '—'}</td>
                    <td className={styles.tdSub}>{t.telefone || '—'}</td>
                    <td>
                      <span className={`${styles.badge} ${acesso.cls}`}>
                        {acesso.label}
                      </span>
                    </td>
                    <td className={styles.tdSub}>
                      {t.pin_trocado_em
                        ? new Date(t.pin_trocado_em.replace(' ', 'T')).toLocaleDateString(
                            'pt-BR',
                          )
                        : '—'}
                    </td>
                    <td>
                      <div className={styles.actionsCell}>
                        <button
                          type="button"
                          className={`${styles.btn} ${styles.btnPrimary} ${styles.btnSm}`}
                          onClick={() => openPinModal(t)}
                          disabled={!t.ativo}
                          title={!t.ativo ? 'Reative o mecânico para definir PIN' : ''}
                        >
                          {t.pin_ativo ? 'Trocar PIN' : 'Definir PIN'}
                        </button>
                        {t.pin_ativo ? (
                          <button
                            type="button"
                            className={`${styles.btn} ${styles.btnGhost} ${styles.btnSm}`}
                            onClick={() => revokePin(t)}
                          >
                            Revogar PIN
                          </button>
                        ) : null}
                        <button
                          type="button"
                          className={`${styles.btn} ${styles.btnGhost} ${styles.btnSm}`}
                          onClick={() => openEdit(t)}
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          className={`${styles.btn} ${styles.btnGhost} ${styles.btnSm}`}
                          onClick={() => toggleAtivo(t)}
                        >
                          {t.ativo ? 'Desativar' : 'Reativar'}
                        </button>
                        <button
                          type="button"
                          className={`${styles.btn} ${styles.btnGhost} ${styles.btnSm} ${styles.btnGhostDanger}`}
                          onClick={() => removeMecanico(t)}
                        >
                          Remover
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!loading && list.length === 0 && (
            <div className={styles.empty}>
              Nenhum mecânico cadastrado. Clique em <strong>Novo mecânico</strong> no topo da página.
            </div>
          )}
          {loading && <div className={styles.empty}>Carregando...</div>}
        </div>
      </div>

      {/* Modal PIN */}
      {pinModal && (
        <div
          className={styles.overlay}
          onClick={(e) => {
            if (e.target === e.currentTarget && !savingPin) closePinModal();
          }}
        >
          <div className={styles.modal}>
            <h2 className={styles.modalTitle}>PIN de {pinModal.nome}</h2>
            {generatedPin ? (
              <>
                <p className={styles.modalText}>
                  PIN definido. Anote e compartilhe com o mecânico — ele não será
                  mostrado novamente:
                </p>
                <div className={styles.pinDisplay}>{generatedPin}</div>
                <div className={styles.modalActions}>
                  <button
                    type="button"
                    className={`${styles.btn} ${styles.btnPrimary}`}
                    onClick={() => {
                      navigator.clipboard.writeText(generatedPin);
                      showToast('PIN copiado', 'success');
                    }}
                  >
                    Copiar PIN
                  </button>
                  <button
                    type="button"
                    className={`${styles.btn} ${styles.btnGhost}`}
                    onClick={closePinModal}
                  >
                    Fechar
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className={styles.modalText}>
                  Digite um PIN de 6 dígitos ou gere um aleatório:
                </p>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  pattern="[0-9]{6}"
                  className={styles.pinInput}
                  value={pinInput}
                  onChange={(e) =>
                    setPinInput(e.target.value.replace(/\D/g, '').slice(0, 6))
                  }
                  placeholder="000000"
                  disabled={savingPin}
                  autoFocus
                />
                <div className={styles.modalActions}>
                  <button
                    type="button"
                    className={`${styles.btn} ${styles.btnPrimary}`}
                    onClick={() => savePin(false)}
                    disabled={savingPin || pinInput.length !== 6}
                  >
                    {savingPin ? 'Salvando...' : 'Salvar PIN'}
                  </button>
                  <button
                    type="button"
                    className={`${styles.btn} ${styles.btnGhost}`}
                    onClick={() => savePin(true)}
                    disabled={savingPin}
                  >
                    Gerar aleatório
                  </button>
                  <button
                    type="button"
                    className={`${styles.btn} ${styles.btnGhost}`}
                    onClick={closePinModal}
                    disabled={savingPin}
                  >
                    Cancelar
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Modal rotação */}
      {confirmRotate && (
        <div
          className={styles.overlay}
          onClick={(e) => {
            if (e.target === e.currentTarget && !rotating) setConfirmRotate(false);
          }}
        >
          <div className={styles.modal}>
            <h2 className={styles.modalTitle}>Rotacionar link?</h2>
            <p className={styles.modalText}>
              O link atual deixará de funcionar imediatamente. Qualquer mecânico
              com o PWA instalado precisará receber o novo link e reinstalar.
              Confirma?
            </p>
            <div className={styles.modalActions}>
              <button
                type="button"
                className={`${styles.btn} ${styles.btnDanger}`}
                onClick={rotateSlug}
                disabled={rotating}
              >
                {rotating ? 'Rotacionando...' : 'Sim, gerar novo link'}
              </button>
              <button
                type="button"
                className={`${styles.btn} ${styles.btnGhost}`}
                onClick={() => setConfirmRotate(false)}
                disabled={rotating}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal criar/editar mecânico */}
      {formModal && (
        <div
          className={styles.overlay}
          onClick={(e) => {
            if (e.target === e.currentTarget && !savingForm) setFormModal(null);
          }}
        >
          <div className={styles.modal}>
            <h2 className={styles.modalTitle}>
              {formModal.mode === 'create' ? 'Novo mecânico' : 'Editar mecânico'}
            </h2>
            <form onSubmit={submitForm}>
              <div className={styles.formGroup}>
                <label>Nome *</label>
                <input
                  type="text"
                  value={form.nome}
                  onChange={(e) => setForm({ ...form, nome: e.target.value })}
                  placeholder="Ex: Rogério Silva"
                  disabled={savingForm}
                  autoFocus
                  required
                />
              </div>
              <div className={styles.formGroup}>
                <label>Especialidade</label>
                <input
                  type="text"
                  value={form.especialidade}
                  onChange={(e) =>
                    setForm({ ...form, especialidade: e.target.value })
                  }
                  placeholder="Ex: Motor, injeção, elétrica"
                  disabled={savingForm}
                />
              </div>
              <div className={styles.formGroup}>
                <label>Telefone</label>
                <input
                  type="text"
                  value={form.telefone}
                  onChange={(e) => setForm({ ...form, telefone: e.target.value })}
                  placeholder="(11) 99999-9999"
                  disabled={savingForm}
                />
              </div>
              <div className={styles.formGroup}>
                <label>E-mail</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="mecanico@buscaracing.com"
                  disabled={savingForm}
                />
              </div>
              <div className={styles.modalActions}>
                <button
                  type="submit"
                  className={`${styles.btn} ${styles.btnPrimary}`}
                  disabled={savingForm || !form.nome.trim()}
                >
                  {savingForm
                    ? 'Salvando...'
                    : formModal.mode === 'create'
                    ? 'Cadastrar'
                    : 'Salvar alterações'}
                </button>
                <button
                  type="button"
                  className={`${styles.btn} ${styles.btnGhost}`}
                  onClick={() => setFormModal(null)}
                  disabled={savingForm}
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
