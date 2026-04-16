'use client';

import { useState, useRef, type FormEvent } from 'react';
import { useToast } from '@/components/Toast';
import { MOTO_ORIGEM_LABELS, type MotoOrigem } from '@/lib/moto-estados';
import styles from './page.module.css';

type Props = {
  onClose: () => void;
  onSaved: () => void;
};

const MARCAS = [
  'Honda', 'Yamaha', 'Suzuki', 'Kawasaki', 'BMW', 'Ducati', 'Harley-Davidson',
  'Triumph', 'KTM', 'Royal Enfield', 'Shineray', 'Dafra', 'Haojue', 'Outra',
];

const CATEGORIAS = [
  { value: 'motos-rua', label: 'Motos de Rua' },
  { value: 'offroad', label: 'Offroad' },
  { value: 'quadriciclos', label: 'Quadriciclos' },
  { value: 'infantil', label: 'Infantil' },
  { value: 'outros', label: 'Outros' },
];

export default function EntradaModal({ onClose, onSaved }: Props) {
  const { showToast } = useToast();

  // Step 1: choose origem
  const [step, setStep] = useState<1 | 2>(1);
  const [origem, setOrigem] = useState<MotoOrigem | null>(null);

  // Step 2: moto data
  const [marca, setMarca] = useState('Honda');
  const [nome, setNome] = useState('');
  const [modelo, setModelo] = useState('');
  const [ano, setAno] = useState('');
  const [placa, setPlaca] = useState('');
  const [km, setKm] = useState('');
  const [categoria, setCategoria] = useState('motos-rua');
  const [condicao, setCondicao] = useState('usada');
  const [valorCompra, setValorCompra] = useState('');
  const [nomeCliente, setNomeCliente] = useState('');
  const [cor, setCor] = useState('');

  // Consignada-specific
  const [donoNome, setDonoNome] = useState('');
  const [donoTel, setDonoTel] = useState('');
  const [margemPct, setMargemPct] = useState('12');

  const [saving, setSaving] = useState(false);
  const [fotos, setFotos] = useState<File[]>([]);
  const fotoInputRef = useRef<HTMLInputElement>(null);

  const selectOrigem = (o: MotoOrigem) => {
    setOrigem(o);
    setStep(2);
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!origem) return;
    const nomeVal = nome.trim() || `${marca} ${modelo}`.trim();
    if (!nomeVal) {
      showToast('Informe marca e modelo', 'error');
      return;
    }
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('nome', nomeVal);
      fd.append('marca', marca);
      fd.append('modelo', modelo.trim());
      fd.append('categoria', categoria);
      fd.append('condicao', condicao);
      fd.append('ano', ano);
      fd.append('ano_fabricacao', ano);
      fd.append('km', km);
      fd.append('placa', placa.toUpperCase().trim());
      fd.append('cor', cor.trim());
      fd.append('tipo_entrada', origem === 'consignada' ? 'consignada' : 'compra');
      fd.append('valor_compra', valorCompra);
      fd.append('nome_cliente', origem === 'consignada' ? donoNome.trim() : nomeCliente.trim());
      fd.append('ativo', '0'); // starts as avaliacao, not published
      if (fotos.length > 0) {
        fd.append('file', fotos[0]);
      }

      const r = await fetch('/api/motos', { method: 'POST', body: fd });
      if (!r.ok) throw new Error('fail');
      const d = await r.json();
      const motoId = d?.id;

      // Set estado and origem via PATCH
      if (motoId) {
        await fetch(`/api/motos/${motoId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ estado: 'avaliacao' }),
        });
      }

      // Create consignacao record if consignada
      if (motoId && origem === 'consignada') {
        await fetch('/api/consignacoes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            moto_id: motoId,
            dono_nome: donoNome.trim(),
            dono_telefone: donoTel.trim(),
            margem_pct: Number(margemPct) || 12,
          }),
        });
      }

      // Upload additional photos
      if (motoId && fotos.length > 1) {
        for (let i = 1; i < fotos.length; i++) {
          const pfd = new FormData();
          pfd.append('file', fotos[i]);
          await fetch(`/api/fotos/${motoId}`, { method: 'POST', body: pfd }).catch(() => {});
        }
      }

      showToast('Moto registrada no estoque!', 'success');
      onSaved();
    } catch {
      showToast('Erro ao registrar moto', 'error');
    } finally {
      setSaving(false);
    }
  };

  const onFotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) setFotos(Array.from(files));
  };

  // Step 1: origem selection
  if (step === 1) {
    return (
      <div className={styles.modalOverlay} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
        <div className={`${styles.modal} ${styles.modalSm}`}>
          <div className={styles.modalHeader}>
            <h3>Chegou moto</h3>
            <button type="button" className={styles.modalClose} onClick={onClose}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          </div>
          <div className={styles.modalBody} style={{ padding: '2rem 1.5rem' }}>
            <p style={{ color: '#555', fontSize: '0.92rem', marginBottom: '1.5rem', textAlign: 'center' }}>
              Como essa moto chegou na loja?
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {(['compra_direta', 'consignada', 'troca'] as MotoOrigem[]).map((o) => (
                <button
                  key={o}
                  type="button"
                  className={`${styles.btn} ${styles.btnGhost}`}
                  style={{ justifyContent: 'center', padding: '14px 20px', fontSize: '0.9rem' }}
                  onClick={() => selectOrigem(o)}
                >
                  {MOTO_ORIGEM_LABELS[o]}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Step 2: form
  return (
    <div className={styles.modalOverlay} onClick={(e) => { if (e.target === e.currentTarget && !saving) onClose(); }}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <h3>
            Chegou moto
            <span style={{ fontSize: '0.7em', color: '#777', marginLeft: 12, fontFamily: 'Barlow, sans-serif', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              {MOTO_ORIGEM_LABELS[origem!]}
            </span>
          </h3>
          <button type="button" className={styles.modalClose} onClick={onClose} disabled={saving}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
          <div className={styles.modalBody}>
            {/* Moto data */}
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label>Marca *</label>
                <select value={marca} onChange={(e) => setMarca(e.target.value)}>
                  {MARCAS.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div className={styles.formGroup}>
                <label>Modelo *</label>
                <input type="text" value={modelo} onChange={(e) => setModelo(e.target.value)} placeholder="CG 160 Titan" required />
              </div>
            </div>
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label>Ano</label>
                <input type="number" value={ano} onChange={(e) => setAno(e.target.value)} placeholder="2022" />
              </div>
              <div className={styles.formGroup}>
                <label>Placa</label>
                <input type="text" value={placa} onChange={(e) => setPlaca(e.target.value)} placeholder="ABC1D23" style={{ textTransform: 'uppercase' }} />
              </div>
            </div>
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label>KM</label>
                <input type="number" value={km} onChange={(e) => setKm(e.target.value)} placeholder="15000" />
              </div>
              <div className={styles.formGroup}>
                <label>Cor</label>
                <input type="text" value={cor} onChange={(e) => setCor(e.target.value)} placeholder="Vermelha" />
              </div>
            </div>
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label>Categoria</label>
                <select value={categoria} onChange={(e) => setCategoria(e.target.value)}>
                  {CATEGORIAS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
              <div className={styles.formGroup}>
                <label>Condição</label>
                <select value={condicao} onChange={(e) => setCondicao(e.target.value)}>
                  <option value="usada">Usada</option>
                  <option value="nova">Nova</option>
                </select>
              </div>
            </div>

            {/* Origem-specific fields */}
            {origem === 'compra_direta' && (
              <>
                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label>Valor de compra (R$)</label>
                    <input type="number" step="0.01" value={valorCompra} onChange={(e) => setValorCompra(e.target.value)} placeholder="8000" />
                  </div>
                  <div className={styles.formGroup}>
                    <label>Comprado de quem</label>
                    <input type="text" value={nomeCliente} onChange={(e) => setNomeCliente(e.target.value)} placeholder="Nome do vendedor" />
                  </div>
                </div>
              </>
            )}
            {origem === 'consignada' && (
              <>
                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label>Nome do dono *</label>
                    <input type="text" value={donoNome} onChange={(e) => setDonoNome(e.target.value)} placeholder="João Silva" required />
                  </div>
                  <div className={styles.formGroup}>
                    <label>Telefone do dono</label>
                    <input type="text" value={donoTel} onChange={(e) => setDonoTel(e.target.value)} placeholder="(11) 99999-9999" />
                  </div>
                </div>
                <div className={styles.formGroup} style={{ maxWidth: 200 }}>
                  <label>Margem da loja (%)</label>
                  <input type="number" value={margemPct} onChange={(e) => setMargemPct(e.target.value)} />
                </div>
              </>
            )}
            {origem === 'troca' && (
              <>
                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label>Valor de avaliação (R$) *</label>
                    <input type="number" step="0.01" value={valorCompra} onChange={(e) => setValorCompra(e.target.value)} placeholder="4000" required />
                  </div>
                  <div className={styles.formGroup}>
                    <label>Cliente que trocou</label>
                    <input type="text" value={nomeCliente} onChange={(e) => setNomeCliente(e.target.value)} placeholder="Nome do cliente" />
                  </div>
                </div>
                <p style={{ fontSize: '0.78rem', color: '#777', marginBottom: '1rem' }}>
                  A moto de troca será registrada como entrada no estoque. Vincule à venda depois em Vendas.
                </p>
              </>
            )}

            {/* Fotos */}
            <div className={styles.formGroup}>
              <label>Fotos</label>
              <div
                className={styles.imgUploadArea}
                onClick={() => fotoInputRef.current?.click()}
              >
                {fotos.length > 0 ? (
                  <span style={{ fontSize: '0.88rem', color: '#27367D' }}>
                    {fotos.length} foto{fotos.length > 1 ? 's' : ''} selecionada{fotos.length > 1 ? 's' : ''}
                  </span>
                ) : (
                  <>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" stroke="#aaa" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                    <span style={{ fontSize: '0.82rem', color: '#999' }}>Clique para selecionar fotos</span>
                  </>
                )}
                <input
                  ref={fotoInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={onFotoChange}
                  style={{ display: 'none' }}
                />
              </div>
            </div>

            <div className={styles.formGroup}>
              <label>Nome do anúncio</label>
              <input
                type="text"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder={`${marca} ${modelo}`.trim() || 'Gerado automaticamente'}
              />
              <span style={{ fontSize: '0.72rem', color: '#999' }}>
                Deixe em branco para usar Marca + Modelo
              </span>
            </div>
          </div>

          <div className={styles.modalFooter}>
            <button type="button" className={`${styles.btn} ${styles.btnGhost}`} onClick={() => setStep(1)} disabled={saving}>
              Voltar
            </button>
            <button type="submit" className={`${styles.btn} ${styles.btnPrimary}`} disabled={saving}>
              {saving ? 'Registrando...' : 'Registrar entrada'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
