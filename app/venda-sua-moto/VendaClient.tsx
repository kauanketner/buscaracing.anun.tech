'use client';

import { useState, FormEvent } from 'react';
import Link from 'next/link';
import styles from './venda.module.css';

export default function VendaClient() {
  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');
  const [marcaMoto, setMarcaMoto] = useState('');
  const [modelo, setModelo] = useState('');
  const [ano, setAno] = useState('');
  const [km, setKm] = useState('');
  const [descricao, setDescricao] = useState('');

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const lines = [
      `Olá! Quero vender minha moto.`,
      ``,
      `*Dados do vendedor:*`,
      `Nome: ${nome}`,
      telefone ? `Telefone: ${telefone}` : '',
      ``,
      `*Dados da moto:*`,
      marcaMoto ? `Marca: ${marcaMoto}` : '',
      modelo ? `Modelo: ${modelo}` : '',
      ano ? `Ano: ${ano}` : '',
      km ? `KM: ${km}` : '',
      descricao ? `\nDescrição: ${descricao}` : '',
    ]
      .filter(Boolean)
      .join('\n');
    const url = `https://wa.me/5511947807036?text=${encodeURIComponent(lines)}`;
    window.open(url, '_blank');
  }

  return (
    <>
      {/* Banner */}
      <section className={styles.pageBanner}>
        <div className={styles.bannerStripe} />
        <div className={styles.bannerStripe2} />
        <div className={styles.bannerInner}>
          <div className={styles.breadcrumb}>
            <Link href="/">Home</Link>
            <span className={styles.breadcrumbSep}>/</span>
            Venda sua Moto
          </div>
          <h1 className={styles.bannerTitle}>
            VENDA SUA <span className={styles.bannerTitleEm}>MOTO</span>
          </h1>
          <p className={styles.pageSub}>
            Quer vender ou trocar sua moto? Preencha o formulário e receba uma proposta.
          </p>
        </div>
      </section>

      {/* Steps */}
      <section className={styles.section}>
        <div className={styles.container}>
          <div className={styles.steps}>
            <div className={styles.step}>
              <span className={styles.stepNum}>01</span>
              <div className={styles.stepIcon}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.5">
                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" strokeLinejoin="round" />
                  <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <h3 className={styles.stepTitle}>Preencha o formulário</h3>
              <p className={styles.stepDesc}>Informe os dados da sua moto e seus contatos.</p>
            </div>
            <div className={styles.step}>
              <span className={styles.stepNum}>02</span>
              <div className={styles.stepIcon}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.5">
                  <circle cx="11" cy="11" r="7" />
                  <path d="M21 21l-4.35-4.35" strokeLinecap="round" />
                </svg>
              </div>
              <h3 className={styles.stepTitle}>Avaliação</h3>
              <p className={styles.stepDesc}>Nossa equipe avalia sua moto e entra em contato.</p>
            </div>
            <div className={styles.step}>
              <span className={styles.stepNum}>03</span>
              <div className={styles.stepIcon}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.5">
                  <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <h3 className={styles.stepTitle}>Negócio fechado</h3>
              <p className={styles.stepDesc}>Pagamento rápido e seguro, na hora.</p>
            </div>
          </div>

          {/* Form + Sidebar */}
          <div className={styles.vendaLayout}>
            <div className={styles.formCard}>
              <h2>Dados da sua moto</h2>
              <p>Preencha as informações abaixo para enviarmos uma proposta pelo WhatsApp.</p>

              <form onSubmit={handleSubmit}>
                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label>Seu nome *</label>
                    <input
                      type="text"
                      placeholder="Nome completo"
                      value={nome}
                      onChange={(e) => setNome(e.target.value)}
                      required
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label>Telefone</label>
                    <input
                      type="tel"
                      placeholder="(11) 99999-9999"
                      value={telefone}
                      onChange={(e) => setTelefone(e.target.value)}
                    />
                  </div>
                </div>
                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label>Marca da moto</label>
                    <input
                      type="text"
                      placeholder="Ex: Honda, Yamaha..."
                      value={marcaMoto}
                      onChange={(e) => setMarcaMoto(e.target.value)}
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label>Modelo</label>
                    <input
                      type="text"
                      placeholder="Ex: CG 160, XRE 300..."
                      value={modelo}
                      onChange={(e) => setModelo(e.target.value)}
                    />
                  </div>
                </div>
                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label>Ano</label>
                    <input
                      type="text"
                      placeholder="Ex: 2023"
                      value={ano}
                      onChange={(e) => setAno(e.target.value)}
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label>KM rodados</label>
                    <input
                      type="text"
                      placeholder="Ex: 15.000"
                      value={km}
                      onChange={(e) => setKm(e.target.value)}
                    />
                  </div>
                </div>
                <div className={styles.formGroup}>
                  <label>Descrição / Observações</label>
                  <textarea
                    placeholder="Descreva o estado da moto, acessórios, etc."
                    value={descricao}
                    onChange={(e) => setDescricao(e.target.value)}
                  />
                </div>
                <button type="submit" className={styles.btnSubmit}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                  </svg>
                  Enviar pelo WhatsApp
                </button>
              </form>
            </div>

            {/* Sidebar */}
            <div className={styles.contactInfo}>
              <div className={styles.contactCard}>
                <h3>Fale conosco</h3>
                <div className={styles.contactItem}>
                  <div className={styles.contactItemIcon}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style={{ color: '#25D366' }}>
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                    </svg>
                  </div>
                  <div>
                    <p className={styles.contactItemLabel}>WhatsApp</p>
                    <a href="https://wa.me/5511947807036" target="_blank" rel="noopener noreferrer">
                      (11) 94780-7036
                    </a>
                  </div>
                </div>
                <div className={styles.contactItem}>
                  <div className={styles.contactItemIcon}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.5">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
                      <circle cx="12" cy="10" r="3" />
                    </svg>
                  </div>
                  <div>
                    <p className={styles.contactItemLabel}>Endereço</p>
                    <span>Av. Villa Verde, 1212 - Vila Verde, Franco da Rocha - SP</span>
                  </div>
                </div>
              </div>

              <div className={styles.vantagens}>
                <h4>Por que vender conosco?</h4>
                <ul className={styles.vantList}>
                  <li>Avaliação justa e transparente</li>
                  <li>Pagamento na hora</li>
                  <li>Aceitamos motos de todas as marcas</li>
                  <li>Opção de troca com troco</li>
                  <li>Mais de 10 anos de experiência</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
