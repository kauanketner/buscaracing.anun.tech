'use client';

import { useCallback, useEffect, useState } from 'react';
import { useToast } from '@/components/Toast';
import styles from './page.module.css';

export default function NotificacoesVenda() {
  const { showToast } = useToast();
  const [templateId, setTemplateId] = useState('');
  const [numeros, setNumeros] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await fetch('/api/config');
      if (r.ok) {
        const cfg = (await r.json()) as Record<string, string>;
        setTemplateId(cfg.venda_notif_template_id || '');
        setNumeros(cfg.venda_notif_numeros || '');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const salvar = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const r = await fetch('/api/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          venda_notif_template_id: templateId.trim(),
          venda_notif_numeros: numeros.trim(),
        }),
      });
      if (!r.ok) throw new Error('fail');
      showToast('Configuração salva', 'success');
    } catch {
      showToast('Erro ao salvar', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className={styles.configSection}>
      <h2 className={styles.configSectionTitle}>Notificações de venda (WhatsApp)</h2>
      <p style={{ fontSize: '0.85rem', color: '#777', margin: '0 0 1rem', lineHeight: 1.5 }}>
        Quando uma venda for registrada no sistema, dispara uma mensagem por WhatsApp
        (via WTS Chat) para os números abaixo, com os dados da venda preenchidos no template.
        {' '}A notificação é enviada <strong>após</strong> o upload dos comprovantes
        (pra que o campo <code>p10</code> mostre o número real).
        <br />
        Template usa 10 variáveis nomeadas (<code>p1</code>–<code>p10</code>):
        {' '}<strong>p1</strong>=vendedor,{' '}
        <strong>p2</strong>=moto, <strong>p3</strong>=chassi,{' '}
        <strong>p4</strong>=motor, <strong>p5</strong>=cliente,{' '}
        <strong>p6</strong>=endereço, <strong>p7</strong>=valor,{' '}
        <strong>p8</strong>=forma de pagamento,{' '}
        <strong>p9</strong>=CPF,{' '}
        <strong>p10</strong>=comprovantes.
      </p>

      {loading ? (
        <p style={{ color: '#777' }}>Carregando...</p>
      ) : (
        <form onSubmit={salvar}>
          <div className={styles.formGroup}>
            <label>ID do template WTS</label>
            <input
              type="text"
              value={templateId}
              onChange={(e) => setTemplateId(e.target.value)}
              placeholder="Ex: 58f53_venda_realizada"
            />
            <span style={{ fontSize: '0.75rem', color: '#999', marginTop: 4, display: 'block' }}>
              Deixe vazio para desativar as notificações de venda.
            </span>
          </div>

          <div className={styles.formGroup}>
            <label>Números destinatários</label>
            <textarea
              value={numeros}
              onChange={(e) => setNumeros(e.target.value)}
              placeholder="5511999999999, 5511888888888"
              rows={3}
              style={{ fontFamily: 'monospace', fontSize: '0.88rem' }}
            />
            <span style={{ fontSize: '0.75rem', color: '#999', marginTop: 4, display: 'block' }}>
              Separe por vírgula, ponto-e-vírgula ou quebra de linha. Use formato internacional
              (55 + DDD + número). Ex: <code>5511991543712</code>
            </span>
          </div>

          <button
            type="submit"
            className={`${styles.btn} ${styles.btnPrimary}`}
            disabled={saving}
          >
            {saving ? 'Salvando...' : 'Salvar configuração'}
          </button>
        </form>
      )}
    </section>
  );
}
