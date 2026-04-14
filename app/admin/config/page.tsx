'use client';

import { useEffect, useRef, useState, ChangeEvent, FormEvent } from 'react';
import { useToast } from '@/components/Toast';
import styles from './page.module.css';

type ConfigMap = Record<string, string>;

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
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState<ConfigMap>({});

  const [logo, setLogo] = useState('');
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingImg, setUploadingImg] = useState<string | null>(null);

  const [telefone, setTelefone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [email, setEmail] = useState('');
  const [endereco, setEndereco] = useState('');
  const [savingContact, setSavingContact] = useState(false);

  const logoInputRef = useRef<HTMLInputElement>(null);

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

  return (
    <div className={styles.wrap}>
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
    </div>
  );
}
