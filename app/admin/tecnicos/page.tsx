'use client';

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

export default function TecnicosPage() {
  const headerCtx = useContext(HeaderActionsContext);
  const { showToast } = useToast();

  const [list, setList] = useState<Mecanico[]>([]);
  const [loading, setLoading] = useState(true);
  const [slug, setSlug] = useState('');
  const [rotating, setRotating] = useState(false);
  const [pinModal, setPinModal] = useState<{ id: number; nome: string } | null>(
    null,
  );
  const [pinInput, setPinInput] = useState('');
  const [savingPin, setSavingPin] = useState(false);
  const [generatedPin, setGeneratedPin] = useState<string | null>(null);
  const [confirmRotate, setConfirmRotate] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const [r1, r2] = await Promise.all([
        fetch('/api/admin/tecnicos'),
        fetch('/api/admin/tecnicos/slug'),
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
      showToast('Erro ao carregar técnicos', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    reload();
  }, [reload]);

  useEffect(() => {
    if (!headerCtx) return;
    headerCtx.setActions(null);
    return () => headerCtx.setActions(null);
  }, [headerCtx]);

  const openPinModal = (m: Mecanico) => {
    setPinInput('');
    setGeneratedPin(null);
    setPinModal({ id: m.id, nome: m.nome });
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
      const r = await fetch(`/api/admin/tecnicos/${pinModal.id}/pin`, {
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

  const revokePin = async (m: Mecanico) => {
    if (!confirm(`Desativar o acesso de ${m.nome} ao /tecnico?`)) return;
    try {
      const r = await fetch(`/api/admin/tecnicos/${m.id}/pin`, {
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
      const r = await fetch('/api/admin/tecnicos/slug', { method: 'POST' });
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
  const fullLink = slug ? `${origin}/t/${slug}` : '';

  return (
    <>
      <div className={styles.wrap}>
        <div className={styles.linkCard}>
          <div className={styles.linkCardLabel}>Link de acesso do técnico</div>
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
            Rotacionar invalida o link atual e o PWA instalado nos celulares.
            Use quando um técnico sair ou você suspeitar de vazamento.
          </p>
        </div>

        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Nome</th>
                <th>Telefone</th>
                <th>Acesso</th>
                <th>Último PIN</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {list.map((m) => {
                const acesso = !m.ativo
                  ? { label: 'Inativo', cls: styles.bgGray }
                  : m.pin_ativo
                  ? { label: 'Ativo', cls: styles.bgGreen }
                  : m.has_pin
                  ? { label: 'Desativado', cls: styles.bgRed }
                  : { label: 'Sem PIN', cls: styles.bgGray };
                return (
                  <tr key={m.id}>
                    <td className={styles.tdName}>{m.nome}</td>
                    <td>{m.telefone || '—'}</td>
                    <td>
                      <span className={`${styles.badge} ${acesso.cls}`}>
                        {acesso.label}
                      </span>
                    </td>
                    <td className={styles.tdSub}>
                      {m.pin_trocado_em
                        ? new Date(m.pin_trocado_em.replace(' ', 'T')).toLocaleDateString(
                            'pt-BR',
                          )
                        : '—'}
                    </td>
                    <td>
                      <div className={styles.actionsCell}>
                        <button
                          type="button"
                          className={`${styles.btn} ${styles.btnPrimary} ${styles.btnSm}`}
                          onClick={() => openPinModal(m)}
                          disabled={!m.ativo}
                        >
                          {m.pin_ativo ? 'Trocar PIN' : 'Definir PIN'}
                        </button>
                        {m.pin_ativo ? (
                          <button
                            type="button"
                            className={`${styles.btn} ${styles.btnGhost} ${styles.btnSm}`}
                            onClick={() => revokePin(m)}
                          >
                            Desativar
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!loading && list.length === 0 && (
            <div className={styles.empty}>
              Nenhum mecânico cadastrado. Cadastre em Configurações → Mecânicos.
            </div>
          )}
          {loading && <div className={styles.empty}>Carregando...</div>}
        </div>
      </div>

      {pinModal && (
        <div
          className={styles.overlay}
          onClick={(e) => {
            if (e.target === e.currentTarget && !savingPin) closePinModal();
          }}
        >
          <div className={styles.modal}>
            <h2 className={styles.modalTitle}>
              PIN de {pinModal.nome}
            </h2>
            {generatedPin ? (
              <>
                <p className={styles.modalText}>
                  PIN definido. Anote e compartilhe com o técnico — ele não será
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
              O link atual deixará de funcionar imediatamente. Qualquer técnico
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
    </>
  );
}
