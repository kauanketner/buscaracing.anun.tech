'use client';

import { useState, useCallback, useEffect } from 'react';
import Image from 'next/image';
import styles from './page.module.css';

interface Foto {
  id: number;
  filename: string;
  ordem: number;
}

interface MotoGalleryProps {
  mainImage?: string;
  fotos: Foto[];
  nome: string;
}

export default function MotoGallery({ mainImage, fotos, nome }: MotoGalleryProps) {
  // Build images array: main image first, then fotos
  const images: string[] = [];
  if (mainImage) images.push(mainImage);
  for (const f of fotos) {
    const src = f.filename.startsWith('/') ? f.filename : `/uploads/${f.filename}`;
    if (src !== mainImage) images.push(src);
  }

  const [current, setCurrent] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const goTo = useCallback(
    (idx: number) => {
      setCurrent(((idx % images.length) + images.length) % images.length);
    },
    [images.length],
  );

  useEffect(() => {
    if (!lightboxOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setLightboxOpen(false);
      if (e.key === 'ArrowLeft') goTo(current - 1);
      if (e.key === 'ArrowRight') goTo(current + 1);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lightboxOpen, current, goTo]);

  if (images.length === 0) {
    return (
      <div className={styles.gallerySection}>
        <div className={styles.mainPhoto}>
          <div className={styles.noImg}>
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" opacity="0.3">
              <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.5" />
              <circle cx="8.5" cy="8.5" r="1.5" stroke="currentColor" strokeWidth="1.5" />
              <path d="M21 15l-5-5L5 21" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.gallerySection}>
      {/* Main photo */}
      <div className={styles.mainPhoto} onClick={() => setLightboxOpen(true)}>
        <Image
          src={images[current]}
          alt={`${nome} - foto ${current + 1}`}
          fill
          sizes="(max-width: 900px) 100vw, 60vw"
          style={{ objectFit: 'cover' }}
          priority={current === 0}
        />
        {images.length > 1 && (
          <span className={styles.photoCountBadge}>
            {current + 1} / {images.length}
          </span>
        )}
      </div>

      {/* Thumbnails */}
      {images.length > 1 && (
        <div className={styles.thumbs}>
          {images.slice(0, 5).map((src, i) => (
            <div
              key={i}
              className={`${styles.thumb} ${i === current ? styles.thumbActive : ''}`}
              onClick={() => setCurrent(i)}
            >
              <Image
                src={src}
                alt={`${nome} - miniatura ${i + 1}`}
                fill
                sizes="100px"
                style={{ objectFit: 'cover' }}
              />
            </div>
          ))}
        </div>
      )}

      {/* Lightbox */}
      {lightboxOpen && (
        <div className={styles.lightbox} onClick={() => setLightboxOpen(false)}>
          <div className={styles.lightboxInner} onClick={(e) => e.stopPropagation()}>
            <button className={styles.lightboxClose} onClick={() => setLightboxOpen(false)}>
              &times;
            </button>
            {images.length > 1 && (
              <button
                className={`${styles.lightboxNav} ${styles.lightboxPrev}`}
                onClick={() => goTo(current - 1)}
              >
                &#8249;
              </button>
            )}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={images[current]}
              alt={`${nome} - foto ${current + 1}`}
              className={styles.lightboxImg}
            />
            {images.length > 1 && (
              <button
                className={`${styles.lightboxNav} ${styles.lightboxNext}`}
                onClick={() => goTo(current + 1)}
              >
                &#8250;
              </button>
            )}
            <span className={styles.lightboxCounter}>
              {current + 1} / {images.length}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
