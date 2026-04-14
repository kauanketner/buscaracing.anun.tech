'use client';

import { useEffect, useRef, useState, FormEvent, ChangeEvent } from 'react';
import styles from './page.module.css';

const BRANDS = [
  'Honda',
  'Yamaha',
  'Kawasaki',
  'Suzuki',
  'KTM',
  'BMW Motorrad',
  'MXF',
  'Ducati',
  'Triumph',
  'CF Moto',
  'Royal Enfield',
  'Dafra',
  'Haojue',
  'Shineray',
  'Husqvarna',
];

export type Moto = {
  id?: number;
  nome?: string;
  marca?: string;
  categoria?: string;
  condicao?: string;
  preco?: number | null;
  preco_original?: number | null;
  descricao?: string | null;
  imagem?: string | null;
  destaque?: number;
  ativo?: number;
  ano?: number | null;
  km?: number | null;
  // Fichamento técnico
  modelo?: string | null;
  ano_fabricacao?: number | null;
  versao?: string | null;
  cor?: string | null;
  combustivel?: string | null;
  transmissao?: string | null;
  // Controle interno
  tipo_entrada?: string | null;
  placa?: string | null;
  chassi?: string | null;
  renavam?: string | null;
  numero_motor?: string | null;
  valor_compra?: number | null;
  nome_cliente?: string | null;
  responsavel_compra?: string | null;
  valor_venda_final?: number | null;
  created_at?: string | null;
  // Agregados anexados pelo GET /api/motos/[id] (admin)
  oficina_total?: number;
  oficina_count?: number;
};

type Foto = { id: number; url: string };

type Props = {
  editingId: number | null;
  onClose: () => void;
  onSaved: () => void;
  onToast: (msg: string, type: 'success' | 'error') => void;
};

export default function MotoModal({ editingId, onClose, onSaved, onToast }: Props) {
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Identificação
  const [nome, setNome] = useState('');
  const [marca, setMarca] = useState('');
  const [modelo, setModelo] = useState('');
  const [versao, setVersao] = useState('');

  // Categorização
  const [categoria, setCategoria] = useState('');
  const [condicao, setCondicao] = useState('nova');

  // Especificações técnicas
  const [anoFabricacao, setAnoFabricacao] = useState('');
  const [ano, setAno] = useState('');
  const [cor, setCor] = useState('');
  const [combustivel, setCombustivel] = useState('');
  const [transmissao, setTransmissao] = useState('');
  const [km, setKm] = useState('');

  // Preços (valor_venda = preco)
  const [preco, setPreco] = useState('');
  const [precoOriginal, setPrecoOriginal] = useState('');

  // Descrição & flags
  const [descricao, setDescricao] = useState('');
  const [destaque, setDestaque] = useState(false);
  const [ativo, setAtivo] = useState(true);

  // Controle interno
  const [tipoEntrada, setTipoEntrada] = useState('');
  const [placa, setPlaca] = useState('');
  const [chassi, setChassi] = useState('');
  const [renavam, setRenavam] = useState('');
  const [numeroMotor, setNumeroMotor] = useState('');
  const [valorCompra, setValorCompra] = useState('');
  const [nomeCliente, setNomeCliente] = useState('');
  const [responsavelCompra, setResponsavelCompra] = useState('');
  const [dataCadastro, setDataCadastro] = useState('');

  // Agregados de oficina (somente modo edição)
  const [oficinaTotal, setOficinaTotal] = useState(0);
  const [oficinaCount, setOficinaCount] = useState(0);
  const [valorVendaFinal, setValorVendaFinal] = useState<number | null>(null);

  // Imagem capa (URL pública da capa atual salva no banco)
  const [imagemAtual, setImagemAtual] = useState('');

  // Galeria
  const [fotos, setFotos] = useState<Foto[]>([]);
  const [fotosLoading, setFotosLoading] = useState(false);
  const [uploadingCount, setUploadingCount] = useState(0);
  // Fotos "pendentes" — selecionadas no formulário antes do envio
  const [pendingFotos, setPendingFotos] = useState<Array<{ file: File; preview: string }>>([]);

  const fotosInputRef = useRef<HTMLInputElement>(null);

  const isEditing = editingId !== null;

  useEffect(() => {
    if (editingId === null) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const r = await fetch(`/api/motos/${editingId}`);
        const m: Moto = await r.json();
        if (cancelled) return;
        setNome(m.nome || '');
        setMarca(m.marca || '');
        setModelo(m.modelo || '');
        setVersao(m.versao || '');
        setCategoria(m.categoria || '');
        setCondicao(m.condicao || 'nova');
        setAnoFabricacao(m.ano_fabricacao != null ? String(m.ano_fabricacao) : '');
        setAno(m.ano != null ? String(m.ano) : '');
        setCor(m.cor || '');
        setCombustivel(m.combustivel || '');
        setTransmissao(m.transmissao || '');
        setKm(m.km != null ? String(m.km) : '');
        setPreco(m.preco != null ? String(m.preco) : '');
        setPrecoOriginal(m.preco_original != null ? String(m.preco_original) : '');
        setDescricao(m.descricao || '');
        setDestaque(!!m.destaque);
        setAtivo(!!m.ativo);
        setTipoEntrada(m.tipo_entrada || '');
        setPlaca(m.placa || '');
        setChassi(m.chassi || '');
        setRenavam(m.renavam || '');
        setNumeroMotor(m.numero_motor || '');
        setValorCompra(m.valor_compra != null ? String(m.valor_compra) : '');
        setNomeCliente(m.nome_cliente || '');
        setResponsavelCompra(m.responsavel_compra || '');
        setDataCadastro(m.created_at || '');
        setOficinaTotal(typeof m.oficina_total === 'number' ? m.oficina_total : 0);
        setOficinaCount(typeof m.oficina_count === 'number' ? m.oficina_count : 0);
        setValorVendaFinal(
          typeof m.valor_venda_final === 'number' ? m.valor_venda_final : null,
        );
        if (m.imagem) {
          setImagemAtual(m.imagem);
        }
      } catch {
        onToast('Erro ao carregar moto', 'error');
      } finally {
        if (!cancelled) setLoading(false);
      }
      // Load fotos
      try {
        setFotosLoading(true);
        const fr = await fetch(`/api/motos/${editingId}/fotos`);
        const fl: Foto[] = await fr.json();
        if (!cancelled) setFotos(Array.isArray(fl) ? fl : []);
      } catch {
        // ignore
      } finally {
        if (!cancelled) setFotosLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [editingId, onToast]);

  const refreshFotos = async () => {
    if (editingId === null) return;
    try {
      const fr = await fetch(`/api/motos/${editingId}/fotos`);
      const fl: Foto[] = await fr.json();
      setFotos(Array.isArray(fl) ? fl : []);
    } catch {
      // ignore
    }
  };

  const onFotosUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    // Modo criação (sem ID ainda): acumula em pendingFotos
    if (editingId === null) {
      const novos = Array.from(files).map((f) => ({
        file: f,
        preview: URL.createObjectURL(f),
      }));
      setPendingFotos((prev) => [...prev, ...novos]);
      if (fotosInputRef.current) fotosInputRef.current.value = '';
      return;
    }

    // Modo edição: envia direto ao servidor
    const count = files.length;
    setUploadingCount(count);
    const fd = new FormData();
    Array.from(files).forEach((f) => fd.append('fotos', f));
    try {
      const r = await fetch(`/api/motos/${editingId}/fotos`, { method: 'POST', body: fd });
      if (!r.ok) throw new Error('fail');
      onToast(`${count} foto(s) adicionada(s)!`, 'success');
    } catch {
      onToast('Erro ao enviar fotos', 'error');
    } finally {
      setUploadingCount(0);
      if (fotosInputRef.current) fotosInputRef.current.value = '';
      await refreshFotos();
    }
  };

  const onFotoDelete = async (id: number) => {
    try {
      const r = await fetch(`/api/fotos/${id}`, { method: 'DELETE' });
      if (!r.ok) throw new Error('fail');
      onToast('Foto removida', 'success');
      await refreshFotos();
    } catch {
      onToast('Erro ao remover foto', 'error');
    }
  };

  const onPendingFotoRemove = (index: number) => {
    setPendingFotos((prev) => {
      const copy = [...prev];
      const removed = copy.splice(index, 1)[0];
      if (removed) URL.revokeObjectURL(removed.preview);
      return copy;
    });
  };

  // Libera URLs dos previews ao desmontar
  useEffect(() => {
    return () => {
      pendingFotos.forEach((p) => URL.revokeObjectURL(p.preview));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const n = nome.trim();
    const b = marca.trim();
    if (!n || !b || !categoria) {
      onToast('Preencha nome, marca e categoria', 'error');
      return;
    }
    setSubmitting(true);
    const fd = new FormData();
    // Identificação
    fd.append('nome', n);
    fd.append('marca', b);
    fd.append('modelo', modelo.trim());
    fd.append('versao', versao.trim());
    // Categorização
    fd.append('categoria', categoria);
    fd.append('condicao', condicao);
    // Técnicas
    fd.append('ano_fabricacao', anoFabricacao);
    fd.append('ano', ano);
    fd.append('cor', cor.trim());
    fd.append('combustivel', combustivel);
    fd.append('transmissao', transmissao);
    fd.append('km', km);
    // Preços
    fd.append('preco', preco);
    fd.append('preco_original', precoOriginal);
    // Descrição & flags
    fd.append('descricao', descricao);
    fd.append('destaque', destaque ? '1' : '0');
    fd.append('ativo', ativo ? '1' : '0');
    // Controle interno
    fd.append('tipo_entrada', tipoEntrada);
    fd.append('placa', placa.trim().toUpperCase());
    fd.append('chassi', chassi.trim().toUpperCase());
    fd.append('renavam', renavam.trim());
    fd.append('numero_motor', numeroMotor.trim());
    fd.append('valor_compra', valorCompra);
    fd.append('nome_cliente', nomeCliente.trim());
    fd.append('responsavel_compra', responsavelCompra.trim());
    // Imagem capa
    // - Edição: mantém capa atual (imagemAtual) a menos que usuário tenha escolhido outra via "Definir como capa"
    // - Criação: se há fotos pendentes, a PRIMEIRA vira a capa (imagem) e o restante vai pra galeria
    fd.append('imagem_atual', imagemAtual);
    const fotosParaGaleria = [...pendingFotos];
    if (!isEditing && fotosParaGaleria.length > 0) {
      const capa = fotosParaGaleria.shift()!;
      fd.append('imagem', capa.file);
    }

    try {
      const url = isEditing ? `/api/motos/${editingId}` : '/api/motos';
      const method = isEditing ? 'PUT' : 'POST';
      const r = await fetch(url, { method, body: fd });
      if (!r.ok) throw new Error('fail');

      // Fotos adicionais pra galeria
      if (fotosParaGaleria.length > 0) {
        const motoId = isEditing
          ? (editingId as number)
          : ((await r.json()) as { id: number }).id;
        try {
          const ffd = new FormData();
          fotosParaGaleria.forEach((p) => ffd.append('fotos', p.file));
          const fr = await fetch(`/api/motos/${motoId}/fotos`, {
            method: 'POST',
            body: ffd,
          });
          if (!fr.ok) {
            onToast('Moto salva, mas houve erro ao enviar fotos', 'error');
          }
        } catch {
          onToast('Moto salva, mas houve erro ao enviar fotos', 'error');
        }
      }

      onToast(isEditing ? 'Moto atualizada!' : 'Moto cadastrada!', 'success');
      onSaved();
    } catch {
      onToast('Erro ao salvar moto', 'error');
      setSubmitting(false);
    }
  };

  return (
    <div
      className={styles.modalOverlay}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <form className={styles.modal} onSubmit={onSubmit}>
        <div className={styles.modalHeader}>
          <h3>{isEditing ? 'Editar Moto' : 'Nova Moto'}</h3>
          <button type="button" className={styles.modalClose} onClick={onClose} aria-label="Fechar">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className={styles.modalBody}>
          {loading && <div style={{ color: '#777', fontSize: '0.85rem', marginBottom: '1rem' }}>Carregando...</div>}

          {/* ============== IDENTIFICAÇÃO ============== */}
          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label>Nome / Título Público *</label>
              <input
                type="text"
                placeholder="Ex: CB 650R Neo Sports"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
              />
            </div>
            <div className={styles.formGroup}>
              <label>Marca *</label>
              <input
                type="text"
                placeholder="Ex: Honda"
                list="marcas-list"
                value={marca}
                onChange={(e) => setMarca(e.target.value)}
              />
              <datalist id="marcas-list">
                {BRANDS.map((b) => (
                  <option key={b} value={b} />
                ))}
              </datalist>
            </div>
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label>Modelo</label>
              <input
                type="text"
                placeholder="Ex: CB 650R"
                value={modelo}
                onChange={(e) => setModelo(e.target.value)}
              />
            </div>
            <div className={styles.formGroup}>
              <label>Versão</label>
              <input
                type="text"
                placeholder="Ex: Neo Sports Café"
                value={versao}
                onChange={(e) => setVersao(e.target.value)}
              />
            </div>
          </div>

          {/* ============== CATEGORIZAÇÃO ============== */}
          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label>Categoria *</label>
              <select value={categoria} onChange={(e) => setCategoria(e.target.value)}>
                <option value="">Selecione...</option>
                <option value="motos-rua">Motos de Rua</option>
                <option value="offroad">Offroad</option>
                <option value="quadriciclos">Quadriciclos</option>
                <option value="infantil">Infantil</option>
                <option value="outros">Outros</option>
              </select>
            </div>
            <div className={styles.formGroup}>
              <label>Condição *</label>
              <select value={condicao} onChange={(e) => setCondicao(e.target.value)}>
                <option value="nova">Nova</option>
                <option value="usada">Usada</option>
              </select>
            </div>
          </div>

          {/* ============== ESPECIFICAÇÕES TÉCNICAS ============== */}
          <div className={styles.formSection}>
            <p className={styles.formSectionTitle}>Ficha Técnica</p>
            <p className={styles.formSectionSubtitle}>Informações exibidas publicamente no site</p>

            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label>Ano de Fabricação</label>
                <input
                  type="number"
                  placeholder="Ex: 2024"
                  min="1990"
                  max="2030"
                  value={anoFabricacao}
                  onChange={(e) => setAnoFabricacao(e.target.value)}
                />
              </div>
              <div className={styles.formGroup}>
                <label>Ano Modelo</label>
                <input
                  type="number"
                  placeholder="Ex: 2025"
                  min="1990"
                  max="2030"
                  value={ano}
                  onChange={(e) => setAno(e.target.value)}
                />
              </div>
            </div>

            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label>Cor</label>
                <input
                  type="text"
                  placeholder="Ex: Vermelha"
                  value={cor}
                  onChange={(e) => setCor(e.target.value)}
                />
              </div>
              <div className={styles.formGroup}>
                <label>Quilometragem (KM)</label>
                <input
                  type="number"
                  placeholder="0 para nova"
                  min="0"
                  value={km}
                  onChange={(e) => setKm(e.target.value)}
                />
              </div>
            </div>

            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label>Combustível</label>
                <select value={combustivel} onChange={(e) => setCombustivel(e.target.value)}>
                  <option value="">Selecione...</option>
                  <option value="Gasolina">Gasolina</option>
                  <option value="Flex">Flex</option>
                  <option value="Elétrica">Elétrica</option>
                  <option value="Diesel">Diesel</option>
                  <option value="Etanol">Etanol</option>
                </select>
              </div>
              <div className={styles.formGroup}>
                <label>Transmissão</label>
                <select value={transmissao} onChange={(e) => setTransmissao(e.target.value)}>
                  <option value="">Selecione...</option>
                  <option value="Manual">Manual</option>
                  <option value="Automática">Automática</option>
                  <option value="Semi-automática">Semi-automática</option>
                  <option value="CVT">CVT</option>
                </select>
              </div>
            </div>
          </div>

          {/* ============== PREÇOS (público) ============== */}
          <div className={styles.formSection}>
            <p className={styles.formSectionTitle}>Preços</p>

            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label>Valor de Venda (R$)</label>
                <input
                  type="number"
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                  value={preco}
                  onChange={(e) => setPreco(e.target.value)}
                />
              </div>
              <div className={styles.formGroup}>
                <label>
                  Preço Original (R$){' '}
                  <small style={{ fontWeight: 400, textTransform: 'none' }}>(opcional)</small>
                </label>
                <input
                  type="number"
                  placeholder="Para mostrar desconto"
                  min="0"
                  step="0.01"
                  value={precoOriginal}
                  onChange={(e) => setPrecoOriginal(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className={styles.formGroup}>
            <label>Descrição</label>
            <textarea
              placeholder="Descreva os principais atributos desta moto..."
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
            />
          </div>

          <div className={styles.checkRow}>
            <label className={styles.checkItem}>
              <input type="checkbox" checked={destaque} onChange={(e) => setDestaque(e.target.checked)} />
              <span>⭐ Destaque</span>
            </label>
            <label className={styles.checkItem}>
              <input type="checkbox" checked={ativo} onChange={(e) => setAtivo(e.target.checked)} />
              <span>✓ Anunciada (visível no site)</span>
            </label>
          </div>

          {/* ============== CONTROLE INTERNO (admin-only) ============== */}
          <div className={`${styles.formSection} ${styles.formSectionInternal}`}>
            <p className={styles.formSectionTitle}>Controle Interno</p>
            <p className={styles.formSectionSubtitle}>
              Uso administrativo — não aparece no site público
            </p>

            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label>Tipo de Entrada</label>
                <select value={tipoEntrada} onChange={(e) => setTipoEntrada(e.target.value)}>
                  <option value="">Selecione...</option>
                  <option value="compra">Compra</option>
                  <option value="consignada">Consignada</option>
                </select>
              </div>
              <div className={styles.formGroup}>
                <label>Responsável pela Compra</label>
                <input
                  type="text"
                  placeholder="Nome do comprador interno"
                  value={responsavelCompra}
                  onChange={(e) => setResponsavelCompra(e.target.value)}
                />
              </div>
            </div>

            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label>Placa</label>
                <input
                  type="text"
                  placeholder="ABC-1D23"
                  maxLength={8}
                  value={placa}
                  onChange={(e) => setPlaca(e.target.value.toUpperCase())}
                />
              </div>
              <div className={styles.formGroup}>
                <label>Renavam</label>
                <input
                  type="text"
                  placeholder="00000000000"
                  value={renavam}
                  onChange={(e) => setRenavam(e.target.value.replace(/\D/g, ''))}
                />
              </div>
            </div>

            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label>Chassi</label>
                <input
                  type="text"
                  placeholder="17 caracteres"
                  maxLength={17}
                  value={chassi}
                  onChange={(e) => setChassi(e.target.value.toUpperCase())}
                />
              </div>
              <div className={styles.formGroup}>
                <label>Número do Motor</label>
                <input
                  type="text"
                  placeholder="Ex: ABC1234567"
                  value={numeroMotor}
                  onChange={(e) => setNumeroMotor(e.target.value)}
                />
              </div>
            </div>

            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label>Valor de Compra (R$)</label>
                <input
                  type="number"
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                  value={valorCompra}
                  onChange={(e) => setValorCompra(e.target.value)}
                />
              </div>
              <div className={styles.formGroup}>
                <label>
                  Nome do Cliente{' '}
                  <small style={{ fontWeight: 400, textTransform: 'none' }}>
                    (proprietário em consignação)
                  </small>
                </label>
                <input
                  type="text"
                  placeholder="Nome completo do cliente"
                  value={nomeCliente}
                  onChange={(e) => setNomeCliente(e.target.value)}
                />
              </div>
            </div>

            {isEditing && dataCadastro && (
              <div className={styles.formGroup}>
                <label>Data de Cadastro</label>
                <input type="text" value={dataCadastro} disabled readOnly />
              </div>
            )}

            {isEditing && (() => {
              const compraNum = Number(valorCompra) || 0;
              const precoNum = Number(preco) || 0;
              const venda = valorVendaFinal != null ? valorVendaFinal : precoNum;
              const hasVenda = venda > 0;
              const hasCompra = compraNum > 0;
              const lucro = hasVenda && hasCompra ? venda - compraNum - oficinaTotal : null;
              const fmt = (n: number) =>
                n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
              return (
                <div
                  style={{
                    marginTop: '0.75rem',
                    padding: '0.85rem 1rem',
                    background: '#fafaf8',
                    border: '1px solid #e4e4e0',
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '0.75rem',
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontSize: '0.7rem',
                        letterSpacing: '0.1em',
                        textTransform: 'uppercase',
                        color: '#777',
                        fontWeight: 700,
                        marginBottom: 2,
                      }}
                    >
                      Custo de oficina
                    </div>
                    <div style={{ fontSize: '1rem', fontWeight: 700, color: '#8b4a00' }}>
                      {fmt(oficinaTotal)}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#777', marginTop: 2 }}>
                      {oficinaCount === 0
                        ? 'nenhuma ordem vinculada'
                        : `${oficinaCount} ordem${oficinaCount !== 1 ? 's' : ''} vinculada${oficinaCount !== 1 ? 's' : ''}`}
                    </div>
                  </div>
                  <div>
                    <div
                      style={{
                        fontSize: '0.7rem',
                        letterSpacing: '0.1em',
                        textTransform: 'uppercase',
                        color: '#777',
                        fontWeight: 700,
                        marginBottom: 2,
                      }}
                    >
                      Lucro líquido estimado
                    </div>
                    <div
                      style={{
                        fontSize: '1rem',
                        fontWeight: 700,
                        color:
                          lucro == null
                            ? '#777'
                            : lucro >= 0
                            ? '#1a7430'
                            : '#8b1820',
                      }}
                    >
                      {lucro == null ? '—' : fmt(lucro)}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#777', marginTop: 2 }}>
                      {lucro == null
                        ? 'informe valor de compra e venda'
                        : `venda ${fmt(venda)} − compra ${fmt(compraNum)} − oficina ${fmt(oficinaTotal)}`}
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>

          <div className={styles.fotosSection}>
            <div className={styles.fotosHead}>
              <label className={styles.fotosHeadLabel}>Fotos da Moto</label>
              <label
                className={`${styles.btn} ${styles.btnGhost} ${styles.btnSm}`}
                style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
                Adicionar fotos
                <input
                  ref={fotosInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className={styles.hiddenInput}
                  onChange={onFotosUpload}
                />
              </label>
            </div>
            <div className={styles.fotosGrid}>
              {/* Capa atual (modo edição, se houver) */}
              {isEditing && imagemAtual && (
                <div className={styles.fotoThumb}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={imagemAtual} alt="Capa" loading="lazy" />
                  <span className={styles.fotoThumbCover}>★ Capa</span>
                  <button
                    type="button"
                    className={styles.fotoThumbDel}
                    onClick={() => setImagemAtual('')}
                    title="Remover capa"
                  >
                    ✕
                  </button>
                </div>
              )}

              {/* Demais fotos da galeria (modo edição) */}
              {fotos.map((f) => (
                <div key={f.id} className={styles.fotoThumb}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={f.url} alt={`Foto ${f.id}`} loading="lazy" />
                  {isEditing && imagemAtual !== f.url && (
                    <button
                      type="button"
                      className={styles.fotoThumbSetCover}
                      onClick={() => setImagemAtual(f.url)}
                      title="Definir como capa"
                    >
                      ★ Definir como capa
                    </button>
                  )}
                  <button
                    type="button"
                    className={styles.fotoThumbDel}
                    onClick={() => onFotoDelete(f.id)}
                    title="Remover foto"
                  >
                    ✕
                  </button>
                </div>
              ))}

              {/* Fotos pendentes (ainda não enviadas) */}
              {pendingFotos.map((p, i) => {
                const isCapaPendente = !isEditing && !imagemAtual && i === 0;
                return (
                  <div key={`pending-${i}`} className={styles.fotoThumb}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.preview} alt={`Nova foto ${i + 1}`} loading="lazy" />
                    {isCapaPendente && (
                      <span className={styles.fotoThumbCover}>★ Capa</span>
                    )}
                    <button
                      type="button"
                      className={styles.fotoThumbDel}
                      onClick={() => onPendingFotoRemove(i)}
                      title="Remover foto"
                    >
                      ✕
                    </button>
                  </div>
                );
              })}

              {Array.from({ length: uploadingCount }).map((_, i) => (
                <div key={`up-${i}`} className={styles.fotoUploading}>
                  <div className={styles.fotoSpin} />
                  Enviando...
                </div>
              ))}

              {!fotosLoading &&
                !imagemAtual &&
                fotos.length === 0 &&
                pendingFotos.length === 0 &&
                uploadingCount === 0 && (
                  <div className={styles.fotosEmpty}>Nenhuma foto adicionada</div>
                )}
            </div>
            <p className={styles.fotosNote}>
              {isEditing
                ? 'A foto marcada como ★ Capa aparece na vitrine. Passe o mouse em qualquer foto para defini-la como capa.'
                : 'Selecione várias fotos — a primeira será a capa e o restante vai para a galeria.'}
            </p>
          </div>
        </div>

        <div className={styles.modalFooter}>
          <button
            type="button"
            className={`${styles.btn} ${styles.btnGhost}`}
            onClick={onClose}
            disabled={submitting}
          >
            Cancelar
          </button>
          <button type="submit" className={`${styles.btn} ${styles.btnPrimary}`} disabled={submitting}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path
                d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"
                stroke="currentColor"
                strokeWidth="2"
              />
              <polyline points="17 21 17 13 7 13 7 21" stroke="currentColor" strokeWidth="2" />
              <polyline points="7 3 7 8 15 8" stroke="currentColor" strokeWidth="2" />
            </svg>
            {submitting ? 'Salvando...' : 'Salvar Moto'}
          </button>
        </div>
      </form>
    </div>
  );
}
