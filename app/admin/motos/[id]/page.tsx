'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useToast } from '@/components/Toast';
import { MOTO_ESTADO_LABELS, ESTADO_COR, type MotoEstado } from '@/lib/moto-estados';
import { MOTO_ORIGEM_LABELS, type MotoOrigem } from '@/lib/moto-estados';
import MotoModal from '../MotoModal';
import styles from './page.module.css';

type Detalhes = {
  moto: Record<string, unknown>;
  fotos: { id: number; url: string; ordem: number }[];
  ordens: (Record<string, unknown> & {
    id: number; status: string; servico_descricao: string;
    valor_estimado: number | null; valor_final: number | null;
    pecas_total: number; pecas_count: number;
    mecanico_nome: string | null;
    data_entrada: string; data_conclusao: string | null;
  })[];
  vendas: (Record<string, unknown> & {
    id: number; comprador_nome: string; valor_venda: number;
    forma_pagamento: string; vendedor_nome: string | null;
    data_venda: string; comissao_valor: number;
    comprovantes_count: number;
  })[];
  comprovantes: {
    id: number; venda_id: number; url: string;
    nome_arquivo: string; tipo_mime: string; descricao: string;
    created_at: string;
  }[];
  reservas: (Record<string, unknown> & {
    id: number; cliente_nome: string; valor_sinal: number;
    status: string; data_inicio: string; data_expira: string;
  })[];
  alugueis: (Record<string, unknown> & {
    id: number; cliente_nome: string; valor_total: number;
    status: string; data_inicio: string; data_fim: string; dias: number;
  })[];
  consignacao: Record<string, unknown> | null;
  lancamentos: (Record<string, unknown> & {
    id: number; tipo: string; categoria: string;
    valor: number; descricao: string; data: string;
  })[];
  totais: {
    oficina_gasto: number;
    oficina_estimado: number;
    qtd_ordens: number;
    qtd_vendas: number;
    qtd_reservas: number;
    qtd_alugueis: number;
    custo_compra: number;
    valor_venda_real: number;
    margem_bruta: number | null;
  };
};

const STATUS_OS_LABEL: Record<string, string> = {
  aberta: 'Aberta',
  diagnostico: 'Diagnóstico',
  em_servico: 'Em serviço',
  aguardando_peca: 'Aguardando peça',
  aguardando_aprovacao: 'Aguardando aprovação',
  aguardando_administrativo: 'Aguardando admin.',
  agendar_entrega: 'Agendar entrega',
  lavagem: 'Lavagem',
  finalizada: 'Finalizada',
  cancelada: 'Cancelada',
};

function fmtBRL(v: number | null | undefined): string {
  if (v == null) return '—';
  return `R$ ${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = iso.slice(0, 10);
  return new Date(d + 'T12:00:00').toLocaleDateString('pt-BR');
}

export default function MotoDetalhePage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const { showToast } = useToast();
  const [data, setData] = useState<Detalhes | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  const reload = useCallback(async () => {
    try {
      const r = await fetch(`/api/admin/motos/${id}/detalhes`);
      if (r.status === 404) { setNotFound(true); return; }
      if (!r.ok) throw new Error('fail');
      setData(await r.json());
    } catch {
      showToast('Erro ao carregar', 'error');
    } finally {
      setLoading(false);
    }
  }, [id, showToast]);

  useEffect(() => { reload(); }, [reload]);

  if (loading) return <div className={styles.loading}>Carregando...</div>;
  if (notFound) {
    return (
      <div className={styles.notfound}>
        <p>Moto não encontrada.</p>
        <Link href="/admin/motos" className={styles.btn}>Voltar ao estoque</Link>
      </div>
    );
  }
  if (!data) return <div className={styles.loading}>Sem dados.</div>;

  const m = data.moto as Record<string, unknown>;
  const estado = (m.estado as MotoEstado) || 'avaliacao';
  const cor = ESTADO_COR[estado] || ESTADO_COR.disponivel;
  const origem = (m.origem as MotoOrigem) || 'compra_direta';
  const imagem = m.imagem as string | null;

  return (
    <div className={styles.wrap}>
      <Link href="/admin/motos" className={styles.backLink}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
          <path d="M19 12H5M12 19l-7-7 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Voltar ao estoque
      </Link>

      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerImg}>
          {imagem ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imagem} alt={String(m.nome || '')} />
          ) : (
            <div className={styles.headerImgPh}>
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
                <rect x="3" y="3" width="18" height="18" rx="2" stroke="#ccc" strokeWidth="2" />
              </svg>
            </div>
          )}
        </div>
        <div className={styles.headerInfo}>
          <h1 className={styles.headerTitle}>{String(m.nome || 'Sem nome')}</h1>
          <p className={styles.headerSub}>
            {String(m.marca || '')}
            {m.modelo && m.modelo !== m.nome ? ` · ${m.modelo}` : ''}
            {m.ano ? ` · ${m.ano}` : ''}
            {m.placa ? ` · ${String(m.placa).toUpperCase()}` : ''}
          </p>
          <div className={styles.badges}>
            <span className={styles.badge} style={{ background: cor.bg, color: cor.color }}>
              {MOTO_ESTADO_LABELS[estado] || estado}
            </span>
            <span className={styles.badge} style={{ background: '#e2e3e5', color: '#383d41' }}>
              {MOTO_ORIGEM_LABELS[origem] || origem}
            </span>
            {!!m.disponivel_aluguel && (
              <span className={styles.badge} style={{ background: '#d6d8ff', color: '#27367D' }}>
                Disponível aluguel
              </span>
            )}
            {!!m.destaque && (
              <span className={styles.badge} style={{ background: '#fff3cd', color: '#856404' }}>
                ★ Destaque
              </span>
            )}
          </div>
          <div className={styles.headerActions}>
            <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={() => setEditOpen(true)}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Editar moto
            </button>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className={styles.kpis}>
        <div className={styles.kpi}>
          <div className={styles.kpiLabel}>Ordens de serviço</div>
          <div className={styles.kpiValue}>{data.totais.qtd_ordens}</div>
          {data.totais.oficina_gasto > 0 && (
            <div className={styles.kpiSmall}>{fmtBRL(data.totais.oficina_gasto)} investido</div>
          )}
        </div>
        <div className={styles.kpi}>
          <div className={styles.kpiLabel}>Vendas</div>
          <div className={styles.kpiValue}>{data.totais.qtd_vendas}</div>
        </div>
        <div className={styles.kpi}>
          <div className={styles.kpiLabel}>Reservas (sinal)</div>
          <div className={styles.kpiValue}>{data.totais.qtd_reservas}</div>
        </div>
        <div className={styles.kpi}>
          <div className={styles.kpiLabel}>Aluguéis</div>
          <div className={styles.kpiValue}>{data.totais.qtd_alugueis}</div>
        </div>
        <div className={styles.kpi}>
          <div className={styles.kpiLabel}>Fotos</div>
          <div className={styles.kpiValue}>{data.fotos.length + (imagem ? 1 : 0)}</div>
        </div>
        {data.totais.margem_bruta != null && (
          <div className={styles.kpi}>
            <div className={styles.kpiLabel}>Margem bruta</div>
            <div className={styles.kpiValue} style={{ color: data.totais.margem_bruta >= 0 ? '#155724' : '#8b1820' }}>
              {fmtBRL(data.totais.margem_bruta)}
            </div>
            <div className={styles.kpiSmall}>venda − compra − oficina − comissão</div>
          </div>
        )}
      </div>

      <div className={styles.grid}>
        {/* Coluna esquerda */}
        <div>
          {/* Galeria */}
          {(data.fotos.length > 0 || imagem) && (
            <section className={styles.card}>
              <h2 className={styles.cardTitle}>Fotos ({data.fotos.length + (imagem ? 1 : 0)})</h2>
              <div className={styles.gallery}>
                {imagem && (
                  <div className={styles.galleryItem}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={imagem} alt="Capa" />
                  </div>
                )}
                {data.fotos.map((f) => (
                  <div key={f.id} className={styles.galleryItem}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={f.url} alt="" />
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Dados técnicos */}
          <section className={styles.card}>
            <h2 className={styles.cardTitle}>Dados técnicos</h2>
            <dl className={styles.info}>
              <div><dt>Marca</dt><dd className={styles.plain}>{String(m.marca || '—')}</dd></div>
              <div><dt>Modelo</dt><dd className={styles.plain}>{String(m.modelo || '—')}</dd></div>
              <div><dt>Ano</dt><dd className={styles.plain}>{String(m.ano || '—')}</dd></div>
              <div><dt>Ano fabricação</dt><dd className={styles.plain}>{String(m.ano_fabricacao || '—')}</dd></div>
              <div><dt>Cor</dt><dd className={styles.plain}>{String(m.cor || '—')}</dd></div>
              <div><dt>KM</dt><dd className={styles.plain}>{m.km ? `${Number(m.km).toLocaleString('pt-BR')} km` : '—'}</dd></div>
              <div><dt>Combustível</dt><dd className={styles.plain}>{String(m.combustivel || '—')}</dd></div>
              <div><dt>Transmissão</dt><dd className={styles.plain}>{String(m.transmissao || '—')}</dd></div>
              <div><dt>Placa</dt><dd>{String(m.placa || '—').toUpperCase()}</dd></div>
              <div><dt>Chassi</dt><dd>{String(m.chassi || '—').toUpperCase()}</dd></div>
              <div><dt>RENAVAM</dt><dd>{String(m.renavam || '—')}</dd></div>
              <div><dt>Nº Motor</dt><dd>{String(m.numero_motor || '—')}</dd></div>
            </dl>
          </section>

          {/* OSs */}
          <section className={styles.card}>
            <h2 className={styles.cardTitle}>Histórico de oficina ({data.ordens.length})</h2>
            {data.ordens.length === 0 ? (
              <p className={styles.empty}>Nenhuma OS registrada para esta moto.</p>
            ) : (
              <div className={styles.list}>
                {data.ordens.map((o) => (
                  <Link key={o.id} href={`/admin/oficina/${o.id}`} className={styles.listItem}>
                    <div className={styles.listItemMain}>
                      <div className={styles.listItemTitle}>
                        OS #{o.id} — {STATUS_OS_LABEL[o.status] || o.status}
                      </div>
                      <div className={styles.listItemSub}>
                        {o.servico_descricao || 'Sem descrição'}
                        {o.mecanico_nome && ` · Mecânico: ${o.mecanico_nome}`}
                        {' · '}{fmtDate(o.data_entrada)}
                        {o.data_conclusao && ` → ${fmtDate(o.data_conclusao)}`}
                        {o.pecas_count > 0 && ` · ${o.pecas_count} peça${o.pecas_count > 1 ? 's' : ''}`}
                      </div>
                    </div>
                    <div className={styles.listItemVal}>
                      {fmtBRL((Number(o.valor_final) || 0) + (Number(o.pecas_total) || 0))}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Coluna direita */}
        <div>
          {/* Financeiro */}
          <section className={styles.card}>
            <h2 className={styles.cardTitle}>Financeiro da moto</h2>
            <div>
              <div className={styles.finRow}>
                <span>Custo de compra</span>
                <span className={styles.finNegative}>
                  {data.totais.custo_compra > 0 ? `- ${fmtBRL(data.totais.custo_compra)}` : '—'}
                </span>
              </div>
              <div className={styles.finRow}>
                <span>Oficina (serviços + peças)</span>
                <span className={styles.finNegative}>
                  {data.totais.oficina_gasto > 0 ? `- ${fmtBRL(data.totais.oficina_gasto)}` : '—'}
                </span>
              </div>
              {data.totais.valor_venda_real > 0 && (
                <>
                  <div className={styles.finRow}>
                    <span>Comissão vendedor</span>
                    <span className={styles.finNegative}>
                      - {fmtBRL(Number(data.vendas[0]?.comissao_valor) || 0)}
                    </span>
                  </div>
                  <div className={styles.finRow}>
                    <span>Valor de venda</span>
                    <span style={{ color: '#155724', fontWeight: 600 }}>
                      + {fmtBRL(data.totais.valor_venda_real)}
                    </span>
                  </div>
                </>
              )}
              {data.totais.margem_bruta != null ? (
                <div className={`${styles.finRow} ${styles.finTotal}`}>
                  <span>Margem bruta</span>
                  <span style={{ color: data.totais.margem_bruta >= 0 ? '#155724' : '#8b1820' }}>
                    {fmtBRL(data.totais.margem_bruta)}
                  </span>
                </div>
              ) : (
                <div className={styles.finRow} style={{ marginTop: 6 }}>
                  <span className={styles.empty}>Margem será calculada após a venda.</span>
                </div>
              )}
              {Number(m.preco) > 0 && !data.totais.valor_venda_real && (
                <p className={styles.kpiSmall} style={{ marginTop: 8 }}>
                  Preço anunciado: {fmtBRL(Number(m.preco))}
                </p>
              )}
            </div>
          </section>

          {/* Consignação */}
          {data.consignacao && (
            <section className={styles.card}>
              <h2 className={styles.cardTitle}>Consignação</h2>
              <dl className={styles.info}>
                <div><dt>Dono</dt><dd className={styles.plain}>{String(data.consignacao.dono_nome || '')}</dd></div>
                <div><dt>Telefone</dt><dd className={styles.plain}>{String(data.consignacao.dono_telefone || '—')}</dd></div>
                <div><dt>Margem loja</dt><dd className={styles.plain}>{String(data.consignacao.margem_pct || 12)}%</dd></div>
                <div><dt>Repasse</dt><dd className={styles.plain}>{data.consignacao.valor_repasse ? fmtBRL(Number(data.consignacao.valor_repasse)) : '—'}</dd></div>
                <div><dt>Status</dt><dd className={styles.plain}>{String(data.consignacao.status || 'ativa')}</dd></div>
                <div><dt>Entrada</dt><dd className={styles.plain}>{fmtDate(String(data.consignacao.data_entrada || ''))}</dd></div>
              </dl>
            </section>
          )}

          {/* Vendas */}
          <section className={styles.card}>
            <h2 className={styles.cardTitle}>Vendas ({data.vendas.length})</h2>
            {data.vendas.length === 0 ? (
              <p className={styles.empty}>Não foi vendida ainda.</p>
            ) : (
              <div className={styles.list}>
                {data.vendas.map((v) => {
                  const comps = data.comprovantes.filter((c) => c.venda_id === v.id);
                  return (
                    <div key={v.id} style={{ borderBottom: '1px solid #f1f1ee', paddingBottom: 10, marginBottom: 10 }}>
                      <Link href={`/admin/vendas`} className={styles.listItem} style={{ borderBottom: 'none', marginBottom: 0, paddingBottom: 4 }}>
                        <div className={styles.listItemMain}>
                          <div className={styles.listItemTitle}>
                            Venda #{v.id} — {v.comprador_nome}
                          </div>
                          <div className={styles.listItemSub}>
                            {fmtDate(v.data_venda)} · {String(v.forma_pagamento || '').toUpperCase()}
                            {v.vendedor_nome && ` · ${v.vendedor_nome}`}
                          </div>
                        </div>
                        <div className={styles.listItemVal}>{fmtBRL(v.valor_venda)}</div>
                      </Link>
                      {comps.length > 0 && (
                        <div style={{ marginTop: 6, paddingLeft: 4 }}>
                          <div style={{
                            fontFamily: "'Barlow Condensed', sans-serif",
                            fontWeight: 700,
                            fontSize: '0.7rem',
                            letterSpacing: '0.1em',
                            textTransform: 'uppercase',
                            color: '#777',
                            marginBottom: 6,
                          }}>
                            Comprovantes ({comps.length})
                          </div>
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            {comps.map((c) => {
                              const isImg = c.tipo_mime && c.tipo_mime.startsWith('image/');
                              return (
                                <a
                                  key={c.id}
                                  href={c.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  title={c.nome_arquivo || 'comprovante'}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    width: 56,
                                    height: 56,
                                    background: '#f1f1ee',
                                    border: '1px solid #e4e4e0',
                                    textDecoration: 'none',
                                    color: '#27367D',
                                    overflow: 'hidden',
                                  }}
                                >
                                  {isImg ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                      src={c.url}
                                      alt=""
                                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                    />
                                  ) : (
                                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                                      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
                                      <polyline points="14 2 14 8 20 8" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
                                    </svg>
                                  )}
                                </a>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Reservas */}
          {data.reservas.length > 0 && (
            <section className={styles.card}>
              <h2 className={styles.cardTitle}>Reservas / Sinais ({data.reservas.length})</h2>
              <div className={styles.list}>
                {data.reservas.map((r) => (
                  <div key={r.id} className={styles.listItem} style={{ cursor: 'default' }}>
                    <div className={styles.listItemMain}>
                      <div className={styles.listItemTitle}>
                        {r.cliente_nome}
                      </div>
                      <div className={styles.listItemSub}>
                        {fmtDate(r.data_inicio)} → expira {fmtDate(r.data_expira)} · {r.status}
                      </div>
                    </div>
                    <div className={styles.listItemVal}>{fmtBRL(r.valor_sinal)}</div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Aluguéis */}
          {data.alugueis.length > 0 && (
            <section className={styles.card}>
              <h2 className={styles.cardTitle}>Aluguéis ({data.alugueis.length})</h2>
              <div className={styles.list}>
                {data.alugueis.map((a) => (
                  <Link key={a.id} href="/admin/alugueis" className={styles.listItem}>
                    <div className={styles.listItemMain}>
                      <div className={styles.listItemTitle}>
                        {a.cliente_nome} — {a.status}
                      </div>
                      <div className={styles.listItemSub}>
                        {fmtDate(a.data_inicio)} → {fmtDate(a.data_fim)} · {a.dias} dias
                      </div>
                    </div>
                    <div className={styles.listItemVal}>{fmtBRL(a.valor_total)}</div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Controle interno */}
          <section className={styles.card}>
            <h2 className={styles.cardTitle}>Controle interno</h2>
            <dl className={styles.info}>
              <div><dt>Valor de compra</dt><dd className={styles.plain}>{m.valor_compra ? fmtBRL(Number(m.valor_compra)) : '—'}</dd></div>
              <div><dt>Comprado de</dt><dd className={styles.plain}>{String(m.nome_cliente || '—')}</dd></div>
              <div><dt>Responsável</dt><dd className={styles.plain}>{String(m.responsavel_compra || '—')}</dd></div>
              <div><dt>Data entrada</dt><dd className={styles.plain}>{fmtDate(String(m.created_at || ''))}</dd></div>
              {!!m.disponivel_aluguel && (
                <div><dt>Valor diária</dt><dd className={styles.plain}>{m.valor_diaria ? fmtBRL(Number(m.valor_diaria)) : '—'}</dd></div>
              )}
            </dl>
          </section>

          {/* Lançamentos financeiros */}
          {data.lancamentos.length > 0 && (
            <section className={styles.card}>
              <h2 className={styles.cardTitle}>Lançamentos financeiros ({data.lancamentos.length})</h2>
              <div className={styles.list}>
                {data.lancamentos.slice(0, 10).map((l) => (
                  <div key={l.id} className={styles.listItem} style={{ cursor: 'default' }}>
                    <div className={styles.listItemMain}>
                      <div className={styles.listItemTitle}>{l.descricao || l.categoria}</div>
                      <div className={styles.listItemSub}>
                        {fmtDate(l.data)} · {l.categoria}
                      </div>
                    </div>
                    <div className={styles.listItemVal} style={{ color: l.tipo === 'entrada' ? '#155724' : '#8b1820' }}>
                      {l.tipo === 'entrada' ? '+' : '-'} {fmtBRL(l.valor)}
                    </div>
                  </div>
                ))}
                {data.lancamentos.length > 10 && (
                  <p className={styles.kpiSmall}>
                    {data.lancamentos.length - 10} lançamento{data.lancamentos.length - 10 === 1 ? '' : 's'} a mais em /admin/financeiro
                  </p>
                )}
              </div>
            </section>
          )}
        </div>
      </div>

      {/* Edit modal */}
      {editOpen && (
        <MotoModal
          editingId={Number(id)}
          onClose={() => setEditOpen(false)}
          onSaved={async () => {
            setEditOpen(false);
            await reload();
          }}
          onToast={showToast}
        />
      )}
    </div>
  );
}
