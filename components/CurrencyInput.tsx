'use client';

import { useMemo } from 'react';

/**
 * Input de valor monetário em R$.
 * - value é string de dígitos (representa o valor em CENTAVOS). Ex: "1490000" => R$ 14.900,00
 * - onChange recebe string de dígitos (sem pontos/vírgulas) para armazenar no state
 *
 * Converte pra número com: Number(value) / 100
 * Converte pra armazenar: String(Math.round(numero * 100))
 *
 * Também aceita `value` em formato decimal (string com ponto: "14900.00") —
 * detectamos e normalizamos pra dígitos.
 */

export type CurrencyInputProps = {
  value: string;
  onChange: (rawDigits: string) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  id?: string;
  min?: number;
};

function digitsOnly(s: string): string {
  return (s || '').replace(/\D/g, '');
}

/** Converte dígitos em centavos pra string formatada "R$ 14.900,00" */
function formatBRL(digits: string): string {
  const d = digitsOnly(digits);
  if (!d) return '';
  const n = Number(d) / 100;
  return n.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** Converte valor armazenado (pode ser "14900" em centavos OU "14900.00" decimal) pra dígitos em centavos */
export function normalizeToCents(value: string): string {
  if (!value) return '';
  const trimmed = value.trim();
  // Se contém ponto/vírgula, assume decimal. Converte pra centavos.
  if (/[.,]/.test(trimmed)) {
    const n = Number(trimmed.replace(',', '.'));
    if (Number.isNaN(n) || n < 0) return '';
    return String(Math.round(n * 100));
  }
  return digitsOnly(trimmed);
}

/** Converte dígitos em centavos pra decimal string ("1490000" -> "14900.00") */
export function centsToDecimal(cents: string): string {
  const d = digitsOnly(cents);
  if (!d) return '';
  const n = Number(d) / 100;
  return n.toFixed(2);
}

export default function CurrencyInput({
  value,
  onChange,
  placeholder = 'R$ 0,00',
  required,
  disabled,
  className,
  id,
}: CurrencyInputProps) {
  const display = useMemo(() => formatBRL(value), [value]);

  return (
    <input
      id={id}
      type="text"
      inputMode="numeric"
      placeholder={placeholder}
      value={display}
      required={required}
      disabled={disabled}
      className={className}
      onChange={(e) => {
        const raw = digitsOnly(e.target.value);
        onChange(raw);
      }}
      onKeyDown={(e) => {
        // Backspace remove último dígito
        if (e.key === 'Backspace') {
          e.preventDefault();
          onChange(value.slice(0, -1));
        }
      }}
    />
  );
}
