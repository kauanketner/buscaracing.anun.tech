/**
 * Helpers para CPF e CNPJ.
 *
 * Aceita o mesmo campo para ambos os documentos: a máscara é aplicada
 * dinamicamente conforme o tamanho. Até 11 dígitos formata como CPF,
 * 12+ dígitos formata como CNPJ.
 */

/**
 * Aplica máscara dinâmica em um valor — detecta se é CPF (até 11 dígitos)
 * ou CNPJ (12+ dígitos) e formata adequadamente.
 *
 * Exemplos:
 *   formatCpfCnpj('123')           → '123'
 *   formatCpfCnpj('12345678900')   → '123.456.789-00'  (CPF)
 *   formatCpfCnpj('12345678000190') → '12.345.678/0001-90'  (CNPJ)
 */
export function formatCpfCnpj(input: string): string {
  const digits = (input || '').replace(/\D/g, '').slice(0, 14);
  if (digits.length <= 11) {
    return formatCpf(digits);
  }
  return formatCnpj(digits);
}

function formatCpf(d: string): string {
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9, 11)}`;
}

function formatCnpj(d: string): string {
  // d.length é 12, 13 ou 14
  if (d.length <= 12) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8)}`;
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12, 14)}`;
}

/**
 * Retorna 'cpf' (≤11 dígitos), 'cnpj' (12-14 dígitos) ou 'invalido'.
 */
export function detectarTipoDocumento(input: string): 'cpf' | 'cnpj' | 'invalido' {
  const digits = (input || '').replace(/\D/g, '');
  if (digits.length === 11) return 'cpf';
  if (digits.length === 14) return 'cnpj';
  return 'invalido';
}
