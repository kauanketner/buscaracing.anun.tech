/**
 * Lista unificada de marcas de motos (street + offroad + custom + elétricas).
 * Usada em EntradaModal, MotoModal e qualquer formulário de seleção de marca.
 */
export const MOTO_MARCAS = [
  // Offroad / Enduro / Motocross (foco da loja)
  'Beta',
  'Fantic',
  'GasGas',
  'Husqvarna',
  'KTM',
  'MXF',
  'Rieju',
  'Scorpa',
  'Sherco',
  'Stark',
  'TM Racing',

  // Japonesas (street + trail + offroad)
  'Honda',
  'Kawasaki',
  'Suzuki',
  'Yamaha',

  // Europeias (street + adventure)
  'Aprilia',
  'Benelli',
  'BMW Motorrad',
  'Ducati',
  'Moto Guzzi',
  'MV Agusta',
  'Piaggio',
  'Royal Enfield',
  'Triumph',
  'Vespa',

  // Americanas
  'Buell',
  'Harley-Davidson',
  'Indian',

  // Chinesas / emergentes
  'CFMoto',
  'Haojue',
  'Lifan',
  'Shineray',
  'TVS',
  'Voge',
  'Zontes',

  // Brasileiras
  'Dafra',
  'Pro Tork',

  // Elétricas
  'Energica',
  'Zero Motorcycles',

  // Outros
  'Outra',
] as const;

export type MotoMarca = (typeof MOTO_MARCAS)[number];
