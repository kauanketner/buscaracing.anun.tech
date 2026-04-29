'use client';

import { useEffect, useRef, useState, ChangeEvent, FormEvent } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useToast } from '@/components/Toast';
import CategoriasManager from './CategoriasManager';
import NotificacoesVenda from './NotificacoesVenda';
import PessoasCRUD from './PessoasCRUD';
import styles from './page.module.css';

type ConfigTab = 'geral' | 'vendedores' | 'compradores' | 'mecanicos';

const TABS: { key: ConfigTab; label: string }[] = [
  { key: 'geral', label: 'Geral' },
  { key: 'vendedores', label: 'Vendedores' },
  { key: 'compradores', label: 'Compradores' },
  { key: 'mecanicos', label: 'Mecânicos' },
];

type ConfigMap = Record<string, string>;

type Vendedor = {
  id: number;
  nome: string;
  telefone: string;
  email: string;
  ativo: number;
  tipo?: string;
  pin_ativo?: number;
  has_pin?: number;
};

const IMG_KEYS: { key: string; label: string }[] = [
  { key: 'hero_img', label: 'Banner Hero (página inicial)' },
  { key: 'cat_rua_img', label: 'Categoria: Motos de Rua' },
  { key: 'cat_offroad_img', label: 'Categoria: Offroad' },
  { key: 'cat_quad_img', label: 'Categoria: Quadriciclos' },
  { key: 'cat_infantil_img', label: 'Categoria: Infantil' },
];

const UploadIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
    <path
      d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
  </svg>
);

export default function ConfigPage() {
  const { showToast } = useToast();
  const searchParams = useSearchParams();
  const tabParam = searchParams?.get('tab') as ConfigTab | null;
  const [tab, setTab] = useState<ConfigTab>(
    tabParam && (['geral', 'vendedores', 'compradores', 'mecanicos'] as ConfigTab[]).includes(tabParam)
      ? tabParam
      : 'geral',
  );
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState<ConfigMap>({});

  const [logo, setLogo] = useState('');
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingImg, setUploadingImg] = useState<string | null>(null);

  const [telefone, setTelefone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [email, setEmail] = useState('');
  const [endereco, setEndereco] = useState('');
  const [caucao, setCaucao] = useState('');
  const [savingContact, setSavingContact] = useState(false);

  // Vendedores
  const [vendedores, setVendedores] = useState<Vendedor[]>([]);
  const [novoVendedorNome, setNovoVendedorNome] = useState('');
  const [novoVendedorTelefone, setNovoVendedorTelefone] = useState('');
  const [novoVendedorEmail, setNovoVendedorEmail] = useState('');
  const [savingVendedor, setSavingVendedor] = useState(false);
  const [vendedorSlug, setVendedorSlug] = useState('');

  const logoInputRef = useRef<HTMLInputElement>(null);

  const loadVendedores = async () => {
    try {
      const r = await fetch('/api/config/vendedores');
      if (!r.ok) throw new Error('fail');
      const d: Vendedor[] = await r.json();
      setVendedores(Array.isArray(d) ? d : []);
    } catch {
      // silent — vendedores podem não existir ainda na primeira vez
    }
  };

useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [cfgR, logoR] = await Promise.all([
          fetch('/api/config'),
          fetch('/api/config/logo'),
        ]);
        const cfg: ConfigMap = cfgR.ok ? await cfgR.json() : {};
        const logoData: { logo?: string } = logoR.ok ? await logoR.json() : {};
        if (cancelled) return;
        setConfig(cfg);
        setLogo(logoData.logo || cfg.logo || '');
        setTelefone(cfg.telefone || '');
        setWhatsapp(cfg.whatsapp || '');
        setEmail(cfg.email || '');
        setEndereco(cfg.endereco || '');
        setCaucao(cfg.aluguel_caucao_padrao || '500');
        await loadVendedores();
        // Load vendedor slug
        fetch('/api/admin/vendedores/slug').then(r => r.json()).then(d => {
          if (!cancelled && d?.slug) setVendedorSlug(d.slug);
        }).catch(() => {});
      } catch {
        if (!cancelled) showToast('Erro ao carregar configurações', 'error');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [showToast]);

  const addVendedor = async (e: FormEvent) => {
    e.preventDefault();
    const nome = novoVendedorNome.trim();
    if (!nome) {
      showToast('Informe o nome do vendedor', 'error');
      return;
    }
    setSavingVendedor(true);
    try {
      const r = await fetch('/api/config/vendedores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome,
          telefone: novoVendedorTelefone.trim(),
          email: novoVendedorEmail.trim(),
        }),
      });
      if (!r.ok) throw new Error('fail');
      setNovoVendedorNome('');
      setNovoVendedorTelefone('');
      setNovoVendedorEmail('');
      showToast('Vendedor cadastrado!', 'success');
      await loadVendedores();
    } catch {
      showToast('Erro ao cadastrar vendedor', 'error');
    } finally {
      setSavingVendedor(false);
    }
  };

  const toggleVendedorAtivo = async (v: Vendedor) => {
    try {
      const r = await fetch(`/api/config/vendedores/${v.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: v.nome,
          telefone: v.telefone,
          email: v.email,
          ativo: !v.ativo,
        }),
      });
      if (!r.ok) throw new Error('fail');
      await loadVendedores();
    } catch {
      showToast('Erro ao atualizar vendedor', 'error');
    }
  };

  const removeVendedor = async (v: Vendedor) => {
    if (!confirm(`Remover vendedor "${v.nome}"? Esta ação não pode ser desfeita.`)) return;
    try {
      const r = await fetch(`/api/config/vendedores/${v.id}`, { method: 'DELETE' });
      if (!r.ok) throw new Error('fail');
      showToast('Vendedor removido', 'success');
      await loadVendedores();
    } catch {
      showToast('Erro ao remover vendedor', 'error');
    }
  };

const onLogoUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingLogo(true);
    try {
      const fd = new FormData();
      fd.append('logo', file);
      const r = await fetch('/api/config/logo', { method: 'POST', body: fd });
      if (!r.ok) throw new Error('fail');
      const d: { logo?: string } = await r.json();
      if (d.logo) {
        setLogo(d.logo);
        showToast('Logo atualizado!', 'success');
        // Reload to update sidebar logo
        setTimeout(() => window.location.reload(), 600);
      }
    } catch {
      showToast('Erro ao enviar logo', 'error');
    } finally {
      setUploadingLogo(false);
      if (logoInputRef.current) logoInputRef.current.value = '';
    }
  };

  const onConfigImgUpload = async (chave: string, e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      return;
    }
    setUploadingImg(chave);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('chave', chave);
      const r = await fetch('/api/config/image', { method: 'POST', body: fd });
      if (!r.ok) throw new Error('fail');
      const d: { chave?: string; url?: string } = await r.json();
      if (d.url) {
        setConfig((prev) => ({ ...prev, [chave]: d.url as string }));
        showToast('Imagem atualizada!', 'success');
      }
    } catch {
      showToast('Erro ao enviar imagem', 'error');
    } finally {
      setUploadingImg(null);
      // Reset the input so re-selecting the same file fires change
      e.target.value = '';
    }
  };

  const saveContact = async (e: FormEvent) => {
    e.preventDefault();
    setSavingContact(true);
    try {
      const r = await fetch('/api/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          telefone: telefone.trim(),
          whatsapp: whatsapp.trim(),
          email: email.trim(),
          endereco: endereco.trim(),
          aluguel_caucao_padrao: caucao.trim(),
        }),
      });
      if (!r.ok) throw new Error('fail');
      showToast('Configurações salvas!', 'success');
    } catch {
      showToast('Erro ao salvar configurações', 'error');
    } finally {
      setSavingContact(false);
    }
  };

  if (loading) {
    return <div className={styles.loading}>Carregando configurações...</div>;
  }

  const tabBtnStyle = (active: boolean): React.CSSProperties => ({
    background: active ? '#27367D' : 'transparent',
    color: active ? '#fff' : '#555',
    border: '1.5px solid',
    borderColor: active ? '#27367D' : '#e4e4e0',
    padding: '8px 18px',
    fontFamily: "'Barlow Condensed', sans-serif",
    fontWeight: 700,
    fontSize: '0.82rem',
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    cursor: 'pointer',
    transition: 'all 0.15s',
  });

  return (
    <div className={styles.wrap}>
      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, padding: '0 0 1.25rem', flexWrap: 'wrap' }}>
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            style={tabBtnStyle(tab === t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* TAB: GERAL */}
      {tab === 'geral' && (
      <>
      {/* Logo */}
      <section className={styles.configSection}>
        <h2 className={styles.configSectionTitle}>Logo do Site</h2>
        <div className={styles.logoPreviewArea}>
          {logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logo} alt="Logo" />
          ) : (
            <span className={styles.noLogo}>Nenhum logo</span>
          )}
        </div>
        <div className={styles.logoActions}>
          <label className={`${styles.btn} ${styles.btnPrimary}`} style={{ cursor: 'pointer' }}>
            <UploadIcon />
            {uploadingLogo ? 'Enviando...' : 'Fazer Upload do Logo'}
            <input
              ref={logoInputRef}
              type="file"
              accept="image/*"
              onChange={onLogoUpload}
              disabled={uploadingLogo}
            />
          </label>
          <span className={styles.logoHint}>PNG, SVG, JPG — recomendado fundo transparente</span>
        </div>
      </section>

      {/* Imagens do Site */}
      <section className={styles.configSection}>
        <h2 className={styles.configSectionTitle}>Imagens do Site</h2>
        <div className={styles.imgUploadGrid}>
          {IMG_KEYS.map(({ key, label }) => {
            const url = config[key] || '';
            const uploading = uploadingImg === key;
            return (
              <div key={key} className={styles.imgUploadItem}>
                <label className={styles.itemLabel}>{label}</label>
                <div className={`${styles.imgPreviewBox} ${url ? styles.hasImg : ''}`}>
                  {url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={url} alt={label} />
                  ) : (
                    <span className={styles.noImg}>
                      Sem imagem
                      <br />
                      usa padrão
                    </span>
                  )}
                  <div className={styles.imgOverlay}>
                    {uploading ? 'Enviando...' : 'Clique para trocar'}
                  </div>
                </div>
                <label className={styles.imgUploadBtn}>
                  <UploadIcon />
                  {uploading ? 'Enviando...' : 'Enviar imagem'}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => onConfigImgUpload(key, e)}
                    disabled={uploading}
                  />
                </label>
              </div>
            );
          })}
        </div>
        <p className={styles.imgsHint}>
          As imagens substituem os SVGs/gradientes padrão. Recomendado: mínimo 800×500px, formato JPG ou PNG.
        </p>
      </section>

      {/* Informações de Contato */}
      <section className={styles.configSection}>
        <h2 className={styles.configSectionTitle}>Informações de Contato</h2>
        <form onSubmit={saveContact}>
          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label>Telefone</label>
              <input
                type="text"
                value={telefone}
                onChange={(e) => setTelefone(e.target.value)}
                placeholder="(11) 94780-7036"
              />
            </div>
            <div className={styles.formGroup}>
              <label>WhatsApp (só números)</label>
              <input
                type="text"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                placeholder="5511947807036"
              />
            </div>
          </div>
          <div className={styles.formGroup}>
            <label>E-mail</label>
            <input
              type="text"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="contato@buscaracing.com"
            />
          </div>
          <div className={styles.formGroup}>
            <label>Endereço</label>
            <input
              type="text"
              value={endereco}
              onChange={(e) => setEndereco(e.target.value)}
              placeholder="Av. Villa Verde, 1212 - Vila Verde, Franco da Rocha - SP, 07813-000"
            />
          </div>
          <div className={styles.formGroup}>
            <label>Valor da caução para aluguel (R$)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={caucao}
              onChange={(e) => setCaucao(e.target.value)}
              placeholder="500.00"
            />
            <span style={{ fontSize: '0.75rem', color: '#777', marginTop: 4, display: 'block' }}>
              Valor único aplicado a todas as reservas de aluguel. O cliente vê na página e paga na retirada.
            </span>
          </div>
          <button type="submit" className={`${styles.btn} ${styles.btnPrimary}`} disabled={savingContact}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" stroke="currentColor" strokeWidth="2" />
              <polyline points="17 21 17 13 7 13 7 21" stroke="currentColor" strokeWidth="2" />
              <polyline points="7 3 7 8 15 8" stroke="currentColor" strokeWidth="2" />
            </svg>
            {savingContact ? 'Salvando...' : 'Salvar Configurações'}
          </button>
        </form>
      </section>

      <NotificacoesVenda />

      <CategoriasManager tipo="moto" titulo="Categorias de Motos" />
      <CategoriasManager tipo="peca" titulo="Categorias de Peças" />
      </>
      )}

      {/* TAB: VENDEDORES */}
      {tab === 'vendedores' && (
      <section className={styles.configSection}>
        <h2 className={styles.configSectionTitle}>Vendedores</h2>
        <p style={{ fontSize: '0.85rem', color: '#777', margin: '0 0 1rem' }}>
          Cadastre os vendedores da loja. Vendedores internos com PIN ativo podem acessar o app do vendedor.
        </p>
        {vendedorSlug && (
          <div style={{ background: '#fafaf7', border: '1px solid #e4e4e0', padding: '0.75rem 1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.72rem', color: '#777', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700 }}>
              Link do app vendedor:
            </span>
            <code style={{ fontSize: '0.82rem', color: '#27367D', flex: 1, minWidth: 200 }}>
              {typeof window !== 'undefined' ? `${window.location.origin}/v/${vendedorSlug}` : ''}
            </code>
            <button
              type="button"
              className={`${styles.btn} ${styles.btnGhost}`}
              style={{ padding: '4px 10px', fontSize: '0.72rem' }}
              onClick={() => {
                navigator.clipboard.writeText(`${window.location.origin}/v/${vendedorSlug}`);
                showToast('Link copiado', 'success');
              }}
            >
              Copiar
            </button>
          </div>
        )}

        <form onSubmit={addVendedor} style={{ marginBottom: '1.25rem' }}>
          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label>Nome *</label>
              <input
                type="text"
                value={novoVendedorNome}
                onChange={(e) => setNovoVendedorNome(e.target.value)}
                placeholder="Ex: Carlos Pereira"
                required
              />
            </div>
            <div className={styles.formGroup}>
              <label>Telefone</label>
              <input
                type="text"
                value={novoVendedorTelefone}
                onChange={(e) => setNovoVendedorTelefone(e.target.value)}
                placeholder="(11) 99999-9999"
              />
            </div>
            <div className={styles.formGroup}>
              <label>E-mail</label>
              <input
                type="text"
                value={novoVendedorEmail}
                onChange={(e) => setNovoVendedorEmail(e.target.value)}
                placeholder="vendedor@buscaracing.com"
              />
            </div>
          </div>
          <button
            type="submit"
            className={`${styles.btn} ${styles.btnPrimary}`}
            disabled={savingVendedor}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <line x1="12" y1="5" x2="12" y2="19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <line x1="5" y1="12" x2="19" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            {savingVendedor ? 'Salvando...' : 'Cadastrar Vendedor'}
          </button>
        </form>

        {vendedores.length === 0 ? (
          <div
            style={{
              padding: '1rem',
              background: '#f7f7f4',
              color: '#777',
              fontSize: '0.85rem',
              border: '1px solid #e4e4e0',
            }}
          >
            Nenhum vendedor cadastrado ainda.
          </div>
        ) : (
          <div style={{ border: '1px solid #e4e4e0', background: '#fff' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ background: '#f7f7f4', textAlign: 'left' }}>
                  <th style={{ padding: '0.6rem 0.75rem' }}>Nome</th>
                  <th style={{ padding: '0.6rem 0.75rem' }}>Telefone</th>
                  <th style={{ padding: '0.6rem 0.75rem' }}>E-mail</th>
                  <th style={{ padding: '0.6rem 0.75rem' }}>Status</th>
                  <th style={{ padding: '0.6rem 0.75rem', textAlign: 'right' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {vendedores.map((v) => (
                  <tr key={v.id} style={{ borderTop: '1px solid #e4e4e0' }}>
                    <td style={{ padding: '0.6rem 0.75rem', fontWeight: 600 }}>{v.nome}</td>
                    <td style={{ padding: '0.6rem 0.75rem', color: '#555' }}>
                      {v.telefone || '—'}
                    </td>
                    <td style={{ padding: '0.6rem 0.75rem', color: '#555' }}>{v.email || '—'}</td>
                    <td style={{ padding: '0.6rem 0.75rem' }}>
                      <span
                        style={{
                          fontSize: '0.75rem',
                          padding: '2px 8px',
                          background: v.ativo ? '#dcfce7' : '#f2f2ef',
                          color: v.ativo ? '#166534' : '#777',
                          fontWeight: 600,
                          letterSpacing: '0.05em',
                          textTransform: 'uppercase',
                        }}
                      >
                        {v.ativo ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td style={{ padding: '0.6rem 0.75rem', textAlign: 'right' }}>
                      {v.ativo && v.tipo !== 'externo' && (
                        <button
                          className={`${styles.btn} ${styles.btnPrimary}`}
                          style={{ padding: '4px 10px', fontSize: '0.75rem', marginRight: 4 }}
                          onClick={async () => {
                            try {
                              const r = await fetch(`/api/admin/vendedores/${v.id}/pin`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ gerar: true }),
                              });
                              if (!r.ok) throw new Error('fail');
                              const d = await r.json();
                              showToast(`PIN gerado: ${d.pin} — compartilhe com ${v.nome}`, 'success');
                              await loadVendedores();
                            } catch { showToast('Erro ao gerar PIN', 'error'); }
                          }}
                        >
                          {v.pin_ativo ? 'Trocar PIN' : 'Gerar PIN'}
                        </button>
                      )}
                      <button
                        className={`${styles.btn} ${styles.btnGhost}`}
                        style={{ padding: '4px 10px', fontSize: '0.75rem', marginRight: 4 }}
                        onClick={() => toggleVendedorAtivo(v)}
                      >
                        {v.ativo ? 'Desativar' : 'Ativar'}
                      </button>
                      <button
                        className={`${styles.btn} ${styles.btnGhost}`}
                        style={{ padding: '4px 10px', fontSize: '0.75rem', color: '#dc3545', borderColor: '#f0b4b9' }}
                        onClick={() => removeVendedor(v)}
                      >
                        Remover
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      )}

      {/* TAB: COMPRADORES */}
      {tab === 'compradores' && (
        <section className={styles.configSection}>
          <PessoasCRUD
            endpoint="/api/config/compradores"
            singular="comprador"
            plural="Compradores"
            descricao="Equipe interna que vai a leilões, lojistas e particulares para comprar motos pro estoque. Aparece como responsável da compra quando a moto chega."
          />
        </section>
      )}

      {/* TAB: MECÂNICOS */}
      {tab === 'mecanicos' && (
        <section className={styles.configSection}>
          <PessoasCRUD
            endpoint="/api/config/mecanicos"
            singular="mecânico"
            plural="Mecânicos"
            descricao="Cadastro rápido de mecânicos. Para configurar PIN de acesso ao app do mecânico, link compartilhado e gestão avançada, use o botão abaixo."
            comEspecialidade
            footer={
              <Link
                href="/admin/mecanicos"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '9px 16px',
                  background: 'transparent',
                  border: '1.5px solid #e4e4e0',
                  color: '#27367D',
                  fontFamily: "'Barlow Condensed', sans-serif",
                  fontWeight: 700,
                  fontSize: '0.82rem',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  textDecoration: 'none',
                }}
              >
                Gestão completa (PIN + link do app) →
              </Link>
            }
          />
        </section>
      )}

    </div>
  );
}
