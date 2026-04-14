'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

type ToastType = 'success' | 'error';
type ToastState = { message: string; type: ToastType; visible: boolean };

type ToastContextValue = {
  showToast: (message: string, type?: ToastType) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<ToastState>({ message: '', type: 'success', visible: false });
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((message: string, type: ToastType = 'success') => {
    setToast({ message, type, visible: true });
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setToast((t) => ({ ...t, visible: false }));
    }, 3200);
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div
        className={`toast-root toast-${toast.type} ${toast.visible ? 'toast-show' : ''}`}
        role="status"
        aria-live="polite"
      >
        {toast.message}
      </div>
      <style jsx global>{`
        .toast-root {
          position: fixed;
          bottom: 1.5rem;
          right: 1.5rem;
          z-index: 9999;
          padding: 12px 20px;
          color: #fff;
          font-family: 'Barlow Condensed', sans-serif;
          font-weight: 700;
          font-size: 0.88rem;
          letter-spacing: 0.08em;
          border-radius: 2px;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
          transform: translateY(100px);
          opacity: 0;
          transition: transform 0.3s, opacity 0.3s;
          pointer-events: none;
        }
        .toast-root.toast-show {
          transform: translateY(0);
          opacity: 1;
        }
        .toast-root.toast-success {
          background: #27a745;
        }
        .toast-root.toast-error {
          background: #dc2627;
        }
      `}</style>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    // Fallback no-op if provider not mounted (avoids crashes)
    return {
      showToast: (msg: string) => {
        if (typeof window !== 'undefined') console.warn('[toast]', msg);
      },
    };
  }
  return ctx;
}
