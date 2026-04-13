import type { Metadata } from 'next';
import VendaClient from './VendaClient';

export const metadata: Metadata = {
  title: 'Venda sua Moto',
  description:
    'Venda ou troque sua moto na Busca Racing. Avaliação justa e pagamento na hora. Franco da Rocha - SP.',
  alternates: { canonical: 'https://buscaracing.com/venda-sua-moto' },
};

export default function VendaSuaMotoPage() {
  return <VendaClient />;
}
