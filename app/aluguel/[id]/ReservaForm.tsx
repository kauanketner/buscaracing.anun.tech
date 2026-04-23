'use client';

import { useMemo, useState } from 'react';
import { DayPicker, type DateRange } from 'react-day-picker';
import { ptBR } from 'date-fns/locale';
import 'react-day-picker/dist/style.css';
import styles from './aluguel-detalhe.module.css';

type Props = {
  motoId: number;
  valorDiaria: number;
  valorCaucao: number;
  bloqueadas: string[];
};

function diasEntre(inicio: string, fim: string): number {
  if (!inicio || !fim) return 0;
  const a = new Date(inicio + 'T12:00:00').getTime();
  const b = new Date(fim + 'T12:00:00').getTime();
  if (b < a) return 0;
  return Math.round((b - a) / 86400000) + 1;
}

function temConflito(inicio: string, fim: string, bloq: string[]): boolean {
  if (!inicio || !fim) return false;
  const bloqSet = new Set(bloq);
  const cur = new Date(inicio + 'T12:00:00');
  const end = new Date(fim + 'T12:00:00');
  while (cur <= end) {
    if (bloqSet.has(cur.toISOString().slice(0, 10))) return true;
    cur.setDate(cur.getDate() + 1);
  }
  return false;
}

function formatBRL(v: number) {
  return `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function ReservaForm({
  motoId,
  valorDiaria,
  valorCaucao,
  bloqueadas,
}: Props) {
  const [range, setRange] = useState<DateRange | undefined>(undefined);

  // Converte Date -> "YYYY-MM-DD" em BRT (local)
  const toISO = (d?: Date) => {
    if (!d) return '';
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };
  const inicio = toISO(range?.from);
  const fim = toISO(range?.to);

  // Converte "YYYY-MM-DD" bloqueadas -> Date[] pra passar ao DayPicker
  const bloqueadasDates = useMemo(
    () => bloqueadas.map((s) => {
      const [y, m, d] = s.split('-').map(Number);
      return new Date(y, m - 1, d);
    }),
    [bloqueadas],
  );

  const hojeDate = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);
  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');
  const [email, setEmail] = useState('');
  const [cpf, setCpf] = useState('');
  const [cnh, setCnh] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState('');
  const [success, setSuccess] = useState(false);

  const dias = useMemo(() => diasEntre(inicio, fim), [inicio, fim]);
  const conflito = useMemo(
    () => temConflito(inicio, fim, bloqueadas),
    [inicio, fim, bloqueadas],
  );
  const valorTotal = dias * valorDiaria;
  const datasValidas = inicio && fim && dias > 0 && !conflito;

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr('');

    if (!datasValidas) {
      setErr('Selecione datas válidas para continuar.');
      return;
    }
    if (!nome.trim() || !telefone.trim()) {
      setErr('Informe nome e telefone.');
      return;
    }
    if (cpf.replace(/\D/g, '').length !== 11) {
      setErr('CPF deve conter 11 dígitos.');
      return;
    }
    const cnhDigits = cnh.replace(/\D/g, '');
    if (cnhDigits.length < 9 || cnhDigits.length > 11) {
      setErr('CNH deve conter de 9 a 11 dígitos.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/aluguel/reservar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          moto_id: motoId,
          data_inicio: inicio,
          data_fim: fim,
          cliente_nome: nome.trim(),
          telefone: telefone.trim(),
          email: email.trim(),
          cpf: cpf.replace(/\D/g, ''),
          cnh: cnhDigits,
          observacoes: observacoes.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErr(typeof data?.error === 'string' ? data.error : 'Não foi possível enviar sua solicitação.');
        setSubmitting(false);
        return;
      }
      setSuccess(true);
    } catch {
      setErr('Erro de rede. Tente novamente.');
      setSubmitting(false);
    }
  }

  if (success) {
    const waMsg = encodeURIComponent(
      `Olá! Acabei de solicitar uma reserva de aluguel pelo site (${inicio} a ${fim}). Podemos confirmar?`,
    );
    return (
      <div className={styles.form}>
        <div className={styles.success}>
          <div className={styles.successIcon} aria-hidden="true">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="11" stroke="currentColor" strokeWidth="2" />
              <path d="M7 12l3.5 3.5L17 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h3 className={styles.successTitle}>Recebemos sua solicitação</h3>
          <p className={styles.successMsg}>
            Entraremos em contato em breve para confirmar a reserva e combinar a retirada.
          </p>
          <a
            href={`https://wa.me/5511947807036?text=${waMsg}`}
            className={styles.successWa}
            target="_blank"
            rel="noopener noreferrer"
          >
            Falar no WhatsApp agora
          </a>
        </div>
      </div>
    );
  }

  return (
    <form className={styles.form} onSubmit={onSubmit} noValidate>
      <h2 className={styles.formTitle}>Reservar esta moto</h2>

      <div className={styles.datesField}>
        <label className={styles.datesLabel}>Selecione o período</label>
        <div className={styles.datesSummary}>
          <div className={styles.dateBox}>
            <span className={styles.dateBoxLabel}>Retirada</span>
            <span className={styles.dateBoxValue}>
              {range?.from
                ? range.from.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
                : '—'}
            </span>
          </div>
          <span className={styles.dateArrow}>→</span>
          <div className={styles.dateBox}>
            <span className={styles.dateBoxLabel}>Devolução</span>
            <span className={styles.dateBoxValue}>
              {range?.to
                ? range.to.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
                : '—'}
            </span>
          </div>
        </div>
        <div className={styles.calendarWrap}>
          <DayPicker
            mode="range"
            selected={range}
            onSelect={setRange}
            locale={ptBR}
            disabled={[{ before: hojeDate }, ...bloqueadasDates]}
            numberOfMonths={1}
            fixedWeeks
            showOutsideDays
            ISOWeek={false}
            weekStartsOn={0}
          />
        </div>
        {(range?.from && !range?.to) && (
          <p className={styles.datesHint}>Agora selecione a data de devolução.</p>
        )}
        {!range?.from && (
          <p className={styles.datesHint}>Clique no dia da retirada no calendário.</p>
        )}
      </div>

      {conflito && (
        <div className={styles.conflito}>
          Uma ou mais datas selecionadas já estão reservadas. Escolha outro período.
        </div>
      )}

      {datasValidas && (
        <div className={styles.resumo}>
          <div className={styles.resumoLine}>
            <span>{dias} {dias === 1 ? 'diária' : 'diárias'} × {formatBRL(valorDiaria)}</span>
            <strong>{formatBRL(valorTotal)}</strong>
          </div>
          {valorCaucao > 0 && (
            <div className={styles.resumoLineSmall}>
              Caução: {formatBRL(valorCaucao)} (devolvido após devolução)
            </div>
          )}
        </div>
      )}

      <div className={styles.field}>
        <label htmlFor="cliente_nome">Nome completo</label>
        <input
          id="cliente_nome"
          type="text"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          required
          autoComplete="name"
        />
      </div>

      <div className={styles.row}>
        <div className={styles.field}>
          <label htmlFor="telefone">Telefone / WhatsApp</label>
          <input
            id="telefone"
            type="tel"
            value={telefone}
            onChange={(e) => setTelefone(e.target.value)}
            required
            autoComplete="tel"
            placeholder="(11) 99999-0000"
          />
        </div>
        <div className={styles.field}>
          <label htmlFor="email">E-mail</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
        </div>
      </div>

      <div className={styles.row}>
        <div className={styles.field}>
          <label htmlFor="cpf">CPF</label>
          <input
            id="cpf"
            type="text"
            inputMode="numeric"
            value={cpf}
            onChange={(e) => setCpf(e.target.value.replace(/\D/g, '').slice(0, 11))}
            required
            maxLength={11}
            placeholder="Somente números"
          />
        </div>
        <div className={styles.field}>
          <label htmlFor="cnh">CNH</label>
          <input
            id="cnh"
            type="text"
            inputMode="numeric"
            value={cnh}
            onChange={(e) => setCnh(e.target.value.replace(/\D/g, '').slice(0, 11))}
            required
            maxLength={11}
            placeholder="Somente números"
          />
        </div>
      </div>

      <div className={styles.field}>
        <label htmlFor="observacoes">Observações (opcional)</label>
        <textarea
          id="observacoes"
          value={observacoes}
          onChange={(e) => setObservacoes(e.target.value)}
          rows={3}
        />
      </div>

      {err && <div className={styles.err}>{err}</div>}

      <button
        type="submit"
        className={styles.btnSubmit}
        disabled={submitting || conflito || !datasValidas}
      >
        {submitting ? 'Enviando...' : 'Solicitar reserva'}
      </button>

      <p className={styles.disclaimer}>
        Sua solicitação passará por aprovação. Entraremos em contato para confirmar
        disponibilidade, caução e retirada.
      </p>
    </form>
  );
}
