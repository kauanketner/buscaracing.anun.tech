/**
 * Categorias canônicas de peças — usadas no admin e no site público.
 * Slug é o ID curto (URL-friendly), label é o nome de exibição.
 */
export const PECAS_CATEGORIAS = [
  { slug: 'motor', label: 'Motor e Transmissão', desc: 'Pistões, anéis, juntas, correntes, kit relação, embreagem e mais.' },
  { slug: 'freios', label: 'Freios', desc: 'Pastilhas, discos, manetes, cabos e fluidos de freio para todas as motos.' },
  { slug: 'suspensao', label: 'Suspensão', desc: 'Amortecedores, molas, bengalas, retentores e kits de reparo.' },
  { slug: 'eletrica', label: 'Elétrica', desc: 'Baterias, velas, CDI, reguladores, chicotes e lâmpadas.' },
  { slug: 'carenagem', label: 'Carenagem e Plásticos', desc: 'Carenagens, para-lamas, laterais e peças plásticas originais e alternativas.' },
  { slug: 'pneus-rodas', label: 'Pneus e Rodas', desc: 'Pneus de rua, trilha e misto. Câmaras, aros e cubos completos.' },
  { slug: 'outros', label: 'Outros', desc: 'Outras peças e acessórios diversos.' },
] as const;

export type PecaCategoriaSlug = (typeof PECAS_CATEGORIAS)[number]['slug'];

export const CATEGORIA_LABEL: Record<string, string> = Object.fromEntries(
  PECAS_CATEGORIAS.map((c) => [c.slug, c.label]),
);

export function getCategoria(slug: string) {
  return PECAS_CATEGORIAS.find((c) => c.slug === slug);
}
