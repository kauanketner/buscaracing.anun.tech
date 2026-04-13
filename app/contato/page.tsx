import type { Metadata } from 'next';
import ContatoClient from './ContatoClient';

export const metadata: Metadata = {
  title: 'Contato',
  description:
    'Entre em contato com a Busca Racing. WhatsApp, telefone e endereço em Franco da Rocha - SP. Atendimento de segunda a sábado.',
  alternates: { canonical: 'https://buscaracing.com/contato' },
};

export default function ContatoPage() {
  return <ContatoClient />;
}
