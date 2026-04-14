/**
 * Shared utilities for admin moto form parsing.
 *
 * A single source of truth for which form fields map to which DB columns —
 * avoids drift between POST /api/motos and PUT /api/motos/[id].
 */

type Str = string | null;
type Num = number | null;

export type MotoUpsertFields = {
  nome: string;
  marca: string;
  categoria: string;
  condicao: string;
  preco: Num;
  preco_original: Num;
  descricao: string;
  destaque: 0 | 1;
  ativo: 0 | 1;
  ano: Num;
  km: Num;
  // Fichamento técnico (podem ser públicos)
  modelo: string;
  ano_fabricacao: Num;
  versao: string;
  cor: string;
  combustivel: string;
  transmissao: string;
  // Controle interno (admin-only)
  tipo_entrada: string;
  placa: string;
  chassi: string;
  renavam: string;
  numero_motor: string;
  valor_compra: Num;
  nome_cliente: string;
  responsavel_compra: string;
};

/**
 * Nomes das colunas na ordem que usamos em INSERT/UPDATE.
 * Excluir `imagem` porque esse é tratado separadamente (upload).
 */
export const MOTO_UPSERT_COLUMNS = [
  'nome',
  'marca',
  'categoria',
  'condicao',
  'preco',
  'preco_original',
  'descricao',
  'destaque',
  'ativo',
  'ano',
  'km',
  'modelo',
  'ano_fabricacao',
  'versao',
  'cor',
  'combustivel',
  'transmissao',
  'tipo_entrada',
  'placa',
  'chassi',
  'renavam',
  'numero_motor',
  'valor_compra',
  'nome_cliente',
  'responsavel_compra',
] as const;

function str(fd: FormData, key: string, fallback = ''): string {
  const v = fd.get(key);
  return typeof v === 'string' ? v : fallback;
}

function numOrNull(fd: FormData, key: string): Num {
  const v = fd.get(key);
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export function parseMotoForm(fd: FormData): MotoUpsertFields {
  const ativoVal = fd.get('ativo');
  return {
    nome: str(fd, 'nome'),
    marca: str(fd, 'marca'),
    categoria: str(fd, 'categoria', 'outros') || 'outros',
    condicao: str(fd, 'condicao', 'nova') || 'nova',
    preco: numOrNull(fd, 'preco'),
    preco_original: numOrNull(fd, 'preco_original'),
    descricao: str(fd, 'descricao'),
    destaque: fd.get('destaque') ? 1 : 0,
    ativo: ativoVal === '0' ? 0 : 1,
    ano: numOrNull(fd, 'ano'),
    km: numOrNull(fd, 'km'),
    modelo: str(fd, 'modelo'),
    ano_fabricacao: numOrNull(fd, 'ano_fabricacao'),
    versao: str(fd, 'versao'),
    cor: str(fd, 'cor'),
    combustivel: str(fd, 'combustivel'),
    transmissao: str(fd, 'transmissao'),
    tipo_entrada: str(fd, 'tipo_entrada'),
    placa: str(fd, 'placa'),
    chassi: str(fd, 'chassi'),
    renavam: str(fd, 'renavam'),
    numero_motor: str(fd, 'numero_motor'),
    valor_compra: numOrNull(fd, 'valor_compra'),
    nome_cliente: str(fd, 'nome_cliente'),
    responsavel_compra: str(fd, 'responsavel_compra'),
  };
}
