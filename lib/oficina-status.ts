/**
 * Status válidos para ordens de serviço da oficina.
 *
 * Regras de transição:
 *  - `finalizada` é terminal: uma vez finalizada, a OS não pode voltar a outro status.
 *    Para continuar atendendo o mesmo problema, o usuário abre uma "garantia" (cria
 *    uma NOVA OS com `garantia_de_id` apontando para a finalizada).
 *  - `finalizada` só pode ser atingida via o fluxo "Fechar OS" (PUT /api/oficina/[id]
 *    com valor_final). Não é opção no modal genérico de atualização de status.
 *  - `cancelada` também é terminal — não reabre.
 *  - Entre os demais status, qualquer transição é permitida (o fluxo da oficina
 *    não é linear: pode voltar de "em_servico" para "aguardando_peca" etc.).
 */

export const OFICINA_STATUSES = [
  'aberta',
  'diagnostico',
  'em_servico',
  'aguardando_peca',
  'aguardando_aprovacao',
  'aguardando_administrativo',
  'agendar_entrega',
  'lavagem',
  'cancelada',
  'finalizada',
] as const;

export type OficinaStatus = (typeof OFICINA_STATUSES)[number];

/**
 * Labels amigáveis pra UI (português, com acentos).
 */
export const OFICINA_STATUS_LABELS: Record<OficinaStatus, string> = {
  aberta: 'Aberta',
  diagnostico: 'Diagnóstico',
  em_servico: 'Em serviço',
  aguardando_peca: 'Aguardando peça',
  aguardando_aprovacao: 'Aguardando aprovação',
  aguardando_administrativo: 'Aguardando administrativo',
  agendar_entrega: 'Agendar entrega',
  lavagem: 'Lavagem',
  cancelada: 'Cancelada',
  finalizada: 'Finalizada',
};

/**
 * Status considerados "terminais" — não podem ser alterados via o fluxo de
 * atualização genérica.
 */
export const TERMINAL_STATUSES: OficinaStatus[] = ['finalizada', 'cancelada'];

/**
 * Status que NÃO devem aparecer no <select> do modal genérico de mudança de
 * status. `finalizada` fica de fora porque exige Fechar OS (captura valor_final).
 */
export const STATUS_EXCLUIDOS_DO_MODAL: OficinaStatus[] = ['finalizada'];

export function isOficinaStatus(value: unknown): value is OficinaStatus {
  return typeof value === 'string' && (OFICINA_STATUSES as readonly string[]).includes(value);
}

export function isTerminal(status: string | null | undefined): boolean {
  return !!status && (TERMINAL_STATUSES as string[]).includes(status);
}

/**
 * Valida uma transição de status a partir do atual.
 * Retorna { ok: true } ou { ok: false, reason: string } pra mostrar ao usuário.
 */
export function validateStatusTransition(
  atual: string | null | undefined,
  novo: string,
): { ok: true } | { ok: false; reason: string } {
  if (!isOficinaStatus(novo)) {
    return { ok: false, reason: `Status "${novo}" não é válido.` };
  }
  if (isTerminal(atual)) {
    return {
      ok: false,
      reason:
        'Esta OS está finalizada ou cancelada e não pode mais mudar de status. ' +
        'Se precisar atender o mesmo problema, abra uma garantia.',
    };
  }
  if (novo === 'finalizada') {
    return {
      ok: false,
      reason:
        'Para finalizar uma OS, use o botão "Fechar OS" (é obrigatório informar o valor final).',
    };
  }
  return { ok: true };
}

export function statusLabel(status: string | null | undefined): string {
  if (!status) return '—';
  if (isOficinaStatus(status)) return OFICINA_STATUS_LABELS[status];
  return status;
}
