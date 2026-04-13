'use client';

import { useState, FormEvent } from 'react';
import Link from 'next/link';
import styles from './contato.module.css';

export default function ContatoClient() {
  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');
  const [mensagem, setMensagem] = useState('');

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const text = `Olá! Meu nome é ${nome}.${telefone ? ` Telefone: ${telefone}.` : ''}\n\n${mensagem}`;
    const url = `https://wa.me/5511947807036?text=${encodeURIComponent(text)}`;
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
            Contato
          </div>
          <h1 className={styles.bannerTitle}>
            FALE <span className={styles.bannerTitleEm}>CONOSCO</span>
          </h1>
          <p className={styles.pageSub}>
            Estamos prontos para atender você. Entre em contato por WhatsApp, telefone ou visite nossa loja.
          </p>
        </div>
      </section>

      {/* Content */}
      <section className={styles.section}>
        <div className={styles.container}>
          <div className={styles.contactLayout}>
            {/* Form */}
            <div className={styles.formCard}>
              <h2>Envie sua mensagem</h2>
              <p>Preencha o formulário abaixo e entraremos em contato pelo WhatsApp.</p>

              <form onSubmit={handleSubmit}>
                <div className={styles.formGroup}>
                  <label>Nome</label>
                  <input
                    type="text"
                    placeholder="Seu nome completo"
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
                <div className={styles.formGroup}>
                  <label>Mensagem</label>
                  <textarea
                    placeholder="Como podemos te ajudar?"
                    value={mensagem}
                    onChange={(e) => setMensagem(e.target.value)}
                    required
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
            <div className={styles.sidebar}>
              {/* WhatsApp */}
              <a
                href="https://wa.me/5511947807036"
                target="_blank"
                rel="noopener noreferrer"
                className={styles.channelCard}
              >
                <div className={`${styles.channelIcon} ${styles.channelIconWa}`}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="#fff">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                  </svg>
                </div>
                <div>
                  <div className={styles.channelLabel}>WhatsApp</div>
                  <div className={styles.channelValue}>(11) 94780-7036</div>
                  <div className={styles.channelHint}>Resposta rápida</div>
                </div>
              </a>

              {/* Phone */}
              <a href="tel:+5511947807036" className={styles.channelCard}>
                <div className={`${styles.channelIcon} ${styles.channelIconTel}`}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
                    <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6A19.79 19.79 0 012.12 4.18 2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" />
                  </svg>
                </div>
                <div>
                  <div className={styles.channelLabel}>Telefone</div>
                  <div className={styles.channelValue}>(11) 94780-7036</div>
                  <div className={styles.channelHint}>Seg a Sex, 8h-18h</div>
                </div>
              </a>

              {/* Hours */}
              <div className={styles.hoursCard}>
                <h4>Horário de Funcionamento</h4>
                <div className={styles.hoursRow}>
                  <span>Segunda a Sexta</span>
                  <span>08:00 - 18:00</span>
                </div>
                <div className={styles.hoursRow}>
                  <span>Sábado</span>
                  <span>08:00 - 13:00</span>
                </div>
                <div className={styles.hoursRow}>
                  <span>Domingo</span>
                  <span>Fechado</span>
                </div>
              </div>
            </div>
          </div>

          {/* Map */}
          <div className={styles.mapSection}>
            <h3>Nossa localização</h3>
            <iframe
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3657.5!2d-46.7286!3d-23.3217!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMjPCsDE5JzE4LjEiUyA0NsKwNDMnNDMuMCJX!5e0!3m2!1spt-BR!2sbr!4v1234567890"
              width="100%"
              height="320"
              style={{ border: 0 }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title="Busca Racing - Localização"
            />
            <div className={styles.mapAddress}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              <p>
                <strong>Busca Racing</strong>
                Av. Villa Verde, 1212 - Vila Verde, Franco da Rocha - SP, 07813-000
              </p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
