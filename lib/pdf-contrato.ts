/**
 * Geração de contratos em PDF (server-side, pdfkit).
 *
 * Cada contrato é uma função que recebe dados e retorna um Buffer PDF.
 * Template visual: cabeçalho com logo/nome da loja, corpo com seções,
 * rodapé com assinaturas e data.
 */
import PDFDocument from 'pdfkit';
import { getDb } from './db';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getLojaInfo(): { nome: string; telefone: string; endereco: string; email: string } {
  const db = getDb();
  const get = (k: string) => {
    const r = db.prepare('SELECT valor FROM configuracoes WHERE chave=?').get(k) as { valor: string } | undefined;
    return r?.valor || '';
  };
  return {
    nome: 'Busca Racing',
    telefone: get('telefone'),
    endereco: get('endereco'),
    email: get('email'),
  };
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '___/___/______';
  const d = new Date(iso.slice(0, 10) + 'T12:00:00');
  return d.toLocaleDateString('pt-BR');
}

function fmtBRL(v: number | null | undefined): string {
  if (v == null) return 'R$ ___________';
  return `R$ ${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
}

function collectPdf(doc: PDFKit.PDFDocument): Promise<Buffer> {
  return new Promise((resolve) => {
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.end();
  });
}

// ---------------------------------------------------------------------------
// Shared layout
// ---------------------------------------------------------------------------

function header(doc: PDFKit.PDFDocument, titulo: string): void {
  const loja = getLojaInfo();
  doc.fontSize(18).font('Helvetica-Bold').text('BUSCA RACING', { align: 'center' });
  doc.fontSize(8).font('Helvetica')
    .text(`${loja.endereco}  |  ${loja.telefone}  |  ${loja.email}`, { align: 'center' });
  doc.moveDown(0.5);
  doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke('#27367D');
  doc.moveDown(0.5);
  doc.fontSize(14).font('Helvetica-Bold').fillColor('#27367D').text(titulo, { align: 'center' });
  doc.fillColor('#000');
  doc.moveDown(1);
}

function sectionTitle(doc: PDFKit.PDFDocument, titulo: string): void {
  doc.moveDown(0.5);
  doc.fontSize(10).font('Helvetica-Bold').fillColor('#27367D').text(titulo.toUpperCase());
  doc.fillColor('#000');
  doc.moveDown(0.3);
}

function field(doc: PDFKit.PDFDocument, label: string, value: string): void {
  doc.fontSize(9).font('Helvetica-Bold').text(`${label}: `, { continued: true });
  doc.font('Helvetica').text(value || '________________________________');
}

function fieldRow(doc: PDFKit.PDFDocument, fields: [string, string][]): void {
  const x = doc.x;
  const y = doc.y;
  const colW = 245;
  for (let i = 0; i < fields.length; i++) {
    doc.fontSize(9).font('Helvetica-Bold').text(`${fields[i][0]}: `, x + i * colW, y, { continued: true, width: colW });
    doc.font('Helvetica').text(fields[i][1] || '________________', { width: colW });
  }
  doc.y = y + 16;
}

function signatures(doc: PDFKit.PDFDocument, parteA: string, parteB: string): void {
  doc.moveDown(2);
  const y = doc.y;
  doc.fontSize(8).font('Helvetica').text(`Data: ____/____/________`, 50, y);
  doc.moveDown(3);
  const sigY = doc.y;
  doc.moveTo(50, sigY).lineTo(250, sigY).stroke();
  doc.moveTo(310, sigY).lineTo(545, sigY).stroke();
  doc.fontSize(8).text(parteA, 50, sigY + 4, { width: 200, align: 'center' });
  doc.text(parteB, 310, sigY + 4, { width: 235, align: 'center' });
}

function clausulas(doc: PDFKit.PDFDocument, items: string[]): void {
  doc.moveDown(0.5);
  for (let i = 0; i < items.length; i++) {
    doc.fontSize(8).font('Helvetica').text(`${i + 1}. ${items[i]}`, { width: 495 });
    doc.moveDown(0.2);
  }
}

// ---------------------------------------------------------------------------
// CONTRATO DE COMPRA
// ---------------------------------------------------------------------------

export async function gerarContratoCompra(motoId: number): Promise<Buffer> {
  const db = getDb();
  const m = db.prepare('SELECT * FROM motos WHERE id=?').get(motoId) as Record<string, unknown>;
  if (!m) throw new Error('Moto não encontrada');

  const doc = new PDFDocument({ size: 'A4', margin: 50 });
  header(doc, 'CONTRATO DE COMPRA DE VEÍCULO');

  sectionTitle(doc, 'Dados do veículo');
  fieldRow(doc, [['Marca', String(m.marca || '')], ['Modelo', String(m.modelo || m.nome || '')]]);
  fieldRow(doc, [['Ano', String(m.ano || '')], ['Cor', String(m.cor || '')]]);
  fieldRow(doc, [['Placa', String(m.placa || '')], ['Chassi', String(m.chassi || '')]]);
  fieldRow(doc, [['RENAVAM', String(m.renavam || '')], ['Nº Motor', String(m.numero_motor || '')]]);
  field(doc, 'KM', m.km ? `${Number(m.km).toLocaleString('pt-BR')} km` : '');

  sectionTitle(doc, 'Dados do vendedor');
  field(doc, 'Nome', String(m.nome_cliente || ''));
  field(doc, 'CPF/CNPJ', '');
  field(doc, 'Endereço', '');

  sectionTitle(doc, 'Condições de compra');
  field(doc, 'Valor de compra', fmtBRL(m.valor_compra as number));
  field(doc, 'Forma de pagamento', '');
  field(doc, 'Data da compra', fmtDate(m.created_at as string));

  sectionTitle(doc, 'Cláusulas');
  clausulas(doc, [
    'O vendedor declara ser o legítimo proprietário do veículo descrito acima e que o mesmo se encontra livre de quaisquer ônus, multas, gravames ou restrições.',
    'O vendedor se compromete a entregar toda a documentação necessária para a transferência de propriedade.',
    'O comprador (Busca Racing) realizará a transferência de propriedade no prazo de 30 dias úteis.',
    'Ambas as partes declaram que as informações prestadas são verdadeiras e se responsabilizam civil e criminalmente por sua veracidade.',
  ]);

  signatures(doc, 'Busca Racing (Compradora)', String(m.nome_cliente || 'Vendedor'));
  return collectPdf(doc);
}

// ---------------------------------------------------------------------------
// CONTRATO DE CONSIGNAÇÃO
// ---------------------------------------------------------------------------

export async function gerarContratoConsignacao(consignacaoId: number): Promise<Buffer> {
  const db = getDb();
  const c = db.prepare(
    `SELECT c.*, m.nome AS moto_nome, m.marca, m.modelo, m.ano, m.placa, m.chassi, m.renavam, m.numero_motor, m.km, m.cor
     FROM consignacoes c LEFT JOIN motos m ON c.moto_id = m.id WHERE c.id=?`
  ).get(consignacaoId) as Record<string, unknown>;
  if (!c) throw new Error('Consignação não encontrada');

  const doc = new PDFDocument({ size: 'A4', margin: 50 });
  header(doc, 'CONTRATO DE CONSIGNAÇÃO DE VEÍCULO');

  sectionTitle(doc, 'Dados do veículo');
  fieldRow(doc, [['Marca', String(c.marca || '')], ['Modelo', String(c.modelo || c.moto_nome || '')]]);
  fieldRow(doc, [['Ano', String(c.ano || '')], ['Cor', String(c.cor || '')]]);
  fieldRow(doc, [['Placa', String(c.placa || '')], ['Chassi', String(c.chassi || '')]]);
  fieldRow(doc, [['RENAVAM', String(c.renavam || '')], ['KM', c.km ? `${Number(c.km).toLocaleString('pt-BR')} km` : '']]);

  sectionTitle(doc, 'Dados do consignante (proprietário)');
  field(doc, 'Nome', String(c.dono_nome || ''));
  field(doc, 'Telefone', String(c.dono_telefone || ''));
  field(doc, 'CPF/CNPJ', '');
  field(doc, 'Endereço', '');

  sectionTitle(doc, 'Condições da consignação');
  field(doc, 'Margem da loja', `${c.margem_pct || 12}%`);
  field(doc, 'Data de entrada', fmtDate(c.data_entrada as string));

  sectionTitle(doc, 'Cláusulas');
  clausulas(doc, [
    'O CONSIGNANTE entrega o veículo acima descrito à CONSIGNATÁRIA (Busca Racing) para fins exclusivos de venda.',
    `A CONSIGNATÁRIA reterá ${c.margem_pct || 12}% do valor de venda como comissão pela intermediação.`,
    'A revisão pós-venda, quando necessária, será custeada pelo CONSIGNANTE e descontada do valor de repasse.',
    'O CONSIGNANTE poderá retirar o veículo a qualquer momento, desde que não haja reserva ou venda em andamento.',
    'A CONSIGNATÁRIA se compromete a manter o veículo em bom estado de conservação e segurança durante o período de consignação.',
    'O repasse ao CONSIGNANTE será efetuado em até 5 dias úteis após a conclusão da venda e eventual revisão.',
    'O CONSIGNANTE declara ser o legítimo proprietário do veículo e que o mesmo está livre de ônus, multas ou restrições.',
  ]);

  signatures(doc, 'Busca Racing (Consignatária)', String(c.dono_nome || 'Consignante'));
  return collectPdf(doc);
}

// ---------------------------------------------------------------------------
// CONTRATO DE VENDA
// ---------------------------------------------------------------------------

export async function gerarContratoVenda(vendaId: number): Promise<Buffer> {
  const db = getDb();
  const v = db.prepare(
    `SELECT v.*, m.nome AS moto_nome, m.marca, m.modelo, m.ano, m.placa, m.chassi, m.renavam, m.numero_motor, m.km, m.cor
     FROM vendas v LEFT JOIN motos m ON v.moto_id = m.id WHERE v.id=?`
  ).get(vendaId) as Record<string, unknown>;
  if (!v) throw new Error('Venda não encontrada');

  const doc = new PDFDocument({ size: 'A4', margin: 50 });
  header(doc, 'CONTRATO DE VENDA DE VEÍCULO');

  sectionTitle(doc, 'Dados do veículo');
  fieldRow(doc, [['Marca', String(v.marca || '')], ['Modelo', String(v.modelo || v.moto_nome || '')]]);
  fieldRow(doc, [['Ano', String(v.ano || '')], ['Cor', String(v.cor || '')]]);
  fieldRow(doc, [['Placa', String(v.placa || '')], ['Chassi', String(v.chassi || '')]]);
  fieldRow(doc, [['RENAVAM', String(v.renavam || '')], ['KM', v.km ? `${Number(v.km).toLocaleString('pt-BR')} km` : '']]);

  sectionTitle(doc, 'Dados do comprador');
  field(doc, 'Nome', String(v.comprador_nome || ''));
  field(doc, 'Telefone', String(v.comprador_tel || ''));
  field(doc, 'CPF/CNPJ', '');
  field(doc, 'Endereço', '');

  sectionTitle(doc, 'Condições de venda');
  field(doc, 'Valor de venda', fmtBRL(v.valor_venda as number));
  field(doc, 'Forma de pagamento', String(v.forma_pagamento || ''));
  if ((v.valor_sinal as number) > 0) {
    field(doc, 'Sinal pago', fmtBRL(v.valor_sinal as number));
  }
  if ((v.troca_valor as number) > 0) {
    field(doc, 'Valor da moto de troca (abatimento)', fmtBRL(v.troca_valor as number));
  }
  field(doc, 'Data da venda', fmtDate(v.data_venda as string));

  sectionTitle(doc, 'Cláusulas');
  clausulas(doc, [
    'A VENDEDORA (Busca Racing) declara que o veículo se encontra em condições de uso e livre de vícios ocultos conhecidos.',
    'O COMPRADOR declara ter examinado o veículo e estar ciente de seu estado de conservação.',
    'A transferência de propriedade é de responsabilidade do COMPRADOR e deverá ser realizada em até 30 dias.',
    'Garantia: o veículo possui garantia de motor e câmbio por 90 dias ou 3.000 km (o que ocorrer primeiro), a contar da data de entrega.',
    'A garantia não cobre desgaste natural, mau uso, acidentes, modificações ou falta de manutenção adequada.',
    'Em caso de troca, o veículo recebido como parte do pagamento foi avaliado no valor descrito acima, aceito por ambas as partes.',
  ]);

  signatures(doc, 'Busca Racing (Vendedora)', String(v.comprador_nome || 'Comprador'));
  return collectPdf(doc);
}

// ---------------------------------------------------------------------------
// ORDEM DE SERVIÇO (autorização)
// ---------------------------------------------------------------------------

export async function gerarContratoOS(ordemId: number): Promise<Buffer> {
  const db = getDb();
  const o = db.prepare('SELECT * FROM oficina_ordens WHERE id=?').get(ordemId) as Record<string, unknown>;
  if (!o) throw new Error('OS não encontrada');

  const doc = new PDFDocument({ size: 'A4', margin: 50 });
  header(doc, `ORDEM DE SERVIÇO #${o.id}`);

  sectionTitle(doc, 'Dados do cliente');
  field(doc, 'Nome', String(o.cliente_nome || ''));
  field(doc, 'Telefone', String(o.cliente_telefone || ''));
  field(doc, 'Email', String(o.cliente_email || ''));

  sectionTitle(doc, 'Dados do veículo');
  fieldRow(doc, [['Marca', String(o.moto_marca || '')], ['Modelo', String(o.moto_modelo || '')]]);
  fieldRow(doc, [['Ano', String(o.moto_ano || '')], ['Placa', String(o.moto_placa || '')]]);
  field(doc, 'KM', o.moto_km ? `${Number(o.moto_km).toLocaleString('pt-BR')} km` : '');

  sectionTitle(doc, 'Serviço');
  field(doc, 'Descrição', String(o.servico_descricao || ''));
  field(doc, 'Observações', String(o.observacoes || ''));
  field(doc, 'Valor estimado', fmtBRL(o.valor_estimado as number));
  if (o.valor_final) field(doc, 'Valor final', fmtBRL(o.valor_final as number));
  fieldRow(doc, [['Data de entrada', fmtDate(o.data_entrada as string)], ['Previsão', fmtDate(o.data_prevista as string)]]);

  sectionTitle(doc, 'Autorização');
  clausulas(doc, [
    'Autorizo a execução dos serviços descritos acima no veículo de minha propriedade.',
    'Caso sejam necessários serviços adicionais, a oficina deverá entrar em contato para aprovação prévia.',
    'O prazo de garantia dos serviços executados é de 90 dias, exceto peças de desgaste natural.',
    'O veículo não retirado em até 30 dias após a conclusão do serviço estará sujeito a cobrança de estadia.',
  ]);

  signatures(doc, 'Busca Racing (Oficina)', String(o.cliente_nome || 'Cliente'));
  return collectPdf(doc);
}

// ---------------------------------------------------------------------------
// RECIBO DE RESERVA / SINAL
// ---------------------------------------------------------------------------

export async function gerarReciboReserva(reservaId: number): Promise<Buffer> {
  const db = getDb();
  const r = db.prepare(
    `SELECT r.*, m.nome AS moto_nome, m.marca, m.modelo, m.ano, m.placa, m.preco
     FROM reservas r LEFT JOIN motos m ON r.moto_id = m.id WHERE r.id=?`
  ).get(reservaId) as Record<string, unknown>;
  if (!r) throw new Error('Reserva não encontrada');

  const doc = new PDFDocument({ size: 'A4', margin: 50 });
  header(doc, 'RECIBO DE SINAL / RESERVA');

  sectionTitle(doc, 'Dados do veículo reservado');
  fieldRow(doc, [['Marca', String(r.marca || '')], ['Modelo', String(r.modelo || r.moto_nome || '')]]);
  fieldRow(doc, [['Ano', String(r.ano || '')], ['Placa', String(r.placa || '')]]);
  field(doc, 'Preço anunciado', fmtBRL(r.preco as number));

  sectionTitle(doc, 'Dados do cliente');
  field(doc, 'Nome', String(r.cliente_nome || ''));
  field(doc, 'Telefone', String(r.cliente_tel || ''));
  field(doc, 'CPF/CNPJ', '');

  sectionTitle(doc, 'Condições da reserva');
  field(doc, 'Valor do sinal', fmtBRL(r.valor_sinal as number));
  field(doc, 'Prazo da reserva', `${r.dias_prazo || 7} dias`);
  field(doc, 'Data da reserva', fmtDate(r.data_inicio as string));
  field(doc, 'Válido até', fmtDate(r.data_expira as string));

  sectionTitle(doc, 'Condições');
  clausulas(doc, [
    'O valor do sinal será abatido do preço total em caso de efetivação da compra.',
    'Caso a compra não seja efetivada dentro do prazo, o valor do sinal será devolvido integralmente ao cliente.',
    'Durante o período de reserva, o veículo não será disponibilizado para outros compradores.',
    'Este recibo não constitui contrato de compra e venda, servindo apenas como comprovante do sinal recebido.',
  ]);

  signatures(doc, 'Busca Racing', String(r.cliente_nome || 'Cliente'));
  return collectPdf(doc);
}

// ---------------------------------------------------------------------------
// TERMO DE ENTREGA
// ---------------------------------------------------------------------------

export async function gerarTermoEntrega(vendaId: number): Promise<Buffer> {
  const db = getDb();
  const v = db.prepare(
    `SELECT v.*, m.nome AS moto_nome, m.marca, m.modelo, m.ano, m.placa, m.chassi, m.km
     FROM vendas v LEFT JOIN motos m ON v.moto_id = m.id WHERE v.id=?`
  ).get(vendaId) as Record<string, unknown>;
  if (!v) throw new Error('Venda não encontrada');

  const doc = new PDFDocument({ size: 'A4', margin: 50 });
  header(doc, 'TERMO DE ENTREGA DE VEÍCULO');

  sectionTitle(doc, 'Dados do veículo');
  fieldRow(doc, [['Marca', String(v.marca || '')], ['Modelo', String(v.modelo || v.moto_nome || '')]]);
  fieldRow(doc, [['Ano', String(v.ano || '')], ['Placa', String(v.placa || '')]]);
  field(doc, 'Chassi', String(v.chassi || ''));
  field(doc, 'KM na entrega', v.km ? `${Number(v.km).toLocaleString('pt-BR')} km` : '________________');

  sectionTitle(doc, 'Dados do comprador');
  field(doc, 'Nome', String(v.comprador_nome || ''));
  field(doc, 'Telefone', String(v.comprador_tel || ''));

  sectionTitle(doc, 'Checklist de entrega');
  const checks = [
    'Documentação (CRV/CRLV) conferida',
    'Chave(s) entregue(s)',
    'Manual do proprietário (se disponível)',
    'Vistoria do veículo realizada com o comprador',
    'Estado de conservação aceito pelo comprador',
    'Acessórios inclusos conferidos',
  ];
  doc.moveDown(0.3);
  for (const item of checks) {
    doc.fontSize(9).font('Helvetica').text(`☐  ${item}`);
    doc.moveDown(0.2);
  }

  doc.moveDown(0.5);
  doc.fontSize(9).font('Helvetica')
    .text('Declaro ter recebido o veículo acima descrito, em conformidade com as condições acordadas no contrato de venda, e estou ciente dos termos de garantia.');

  signatures(doc, 'Busca Racing (Entregador)', String(v.comprador_nome || 'Comprador'));
  return collectPdf(doc);
}
