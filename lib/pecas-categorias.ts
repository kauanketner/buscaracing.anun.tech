/**
 * Categorias de peças — fallback estático + função pra buscar do DB.
 * O fallback é usado só no client antes de carregar ou se o fetch falhar.
 * Use loadCategoriasPecas() pra pegar as ativas do banco.
 */

export type PecaCategoria = {
  slug: string;
  label: string;
  desc: string;
};

export const PECAS_CATEGORIAS_FALLBACK: PecaCategoria[] = [
  { slug: 'motor', label: 'Motor e Transmissão', desc: 'Pistões, anéis, juntas, correntes, kit relação, embreagem e mais.' },
  { slug: 'freios', label: 'Freios', desc: 'Pastilhas, discos, manetes, cabos e fluidos de freio para todas as motos.' },
  { slug: 'suspensao', label: 'Suspensão', desc: 'Amortecedores, molas, bengalas, retentores e kits de reparo.' },
  { slug: 'eletrica', label: 'Elétrica', desc: 'Baterias, velas, CDI, reguladores, chicotes e lâmpadas.' },
  { slug: 'carenagem', label: 'Carenagem e Plásticos', desc: 'Carenagens, para-lamas, laterais e peças plásticas originais e alternativas.' },
  { slug: 'pneus-rodas', label: 'Pneus e Rodas', desc: 'Pneus de rua, trilha e misto. Câmaras, aros e cubos completos.' },
  { slug: 'outros', label: 'Outros', desc: 'Outras peças e acessórios diversos.' },
];

/** Alias retrocompatível */
export const PECAS_CATEGORIAS = PECAS_CATEGORIAS_FALLBACK;

export const CATEGORIA_LABEL: Record<string, string> = Object.fromEntries(
  PECAS_CATEGORIAS_FALLBACK.map((c) => [c.slug, c.label]),
);

export function getCategoria(slug: string) {
  return PECAS_CATEGORIAS_FALLBACK.find((c) => c.slug === slug);
}
