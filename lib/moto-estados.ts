export const MOTO_ESTADOS = [
  'avaliacao',
  'em_oficina',
  'disponivel',
  'anunciada',
  'reservada',
  'vendida',
  'em_revisao',
  'entregue',
  'retirada',
] as const;

export type MotoEstado = (typeof MOTO_ESTADOS)[number];

export const MOTO_ESTADO_LABELS: Record<MotoEstado, string> = {
  avaliacao: 'Avaliação',
  em_oficina: 'Em oficina',
  disponivel: 'Disponível',
  anunciada: 'Anunciada',
  reservada: 'Reservada',
  vendida: 'Vendida',
  em_revisao: 'Em revisão',
  entregue: 'Entregue',
  retirada: 'Retirada',
};

export const MOTO_ORIGENS = ['compra_direta', 'consignada', 'troca'] as const;
export type MotoOrigem = (typeof MOTO_ORIGENS)[number];

export const MOTO_ORIGEM_LABELS: Record<MotoOrigem, string> = {
  compra_direta: 'Compra direta',
  consignada: 'Consignada',
  troca: 'Troca',
};

/** States visible on the public site */
export const ESTADOS_PUBLICOS: MotoEstado[] = ['anunciada', 'reservada'];

/** States that are terminal (no more transitions) */
export const ESTADOS_TERMINAIS: MotoEstado[] = ['entregue', 'retirada'];

/** Badge color per state */
export const ESTADO_COR: Record<MotoEstado, { bg: string; color: string }> = {
  avaliacao:   { bg: '#fff3cd', color: '#856404' },
  em_oficina:  { bg: '#cce5ff', color: '#004085' },
  disponivel:  { bg: '#e2e3e5', color: '#383d41' },
  anunciada:   { bg: '#d4edda', color: '#155724' },
  reservada:   { bg: '#d6d8ff', color: '#27367D' },
  vendida:     { bg: '#d4f5dc', color: '#1a7430' },
  em_revisao:  { bg: '#cce5ff', color: '#004085' },
  entregue:    { bg: '#d1d1d1', color: '#555' },
  retirada:    { bg: '#f5c6cb', color: '#721c24' },
};
