import type { Metadata } from 'next';
import ProdutosClient from './ProdutosClient';

export const metadata: Metadata = {
  title: 'Motos à Venda',
  description:
    'Confira nosso estoque de motos novas e usadas. Motos de rua, offroad, quadriciclos e bikes infantis em Franco da Rocha - SP.',
  alternates: { canonical: 'https://buscaracing.com/produtos' },
};

export default function ProdutosPage() {
  return <ProdutosClient />;
}
