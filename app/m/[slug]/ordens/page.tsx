'use client';

/**
 * Lista de OSs ativas atribuídas ao mecânico logado.
 */
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useToast } from '@/components/Toast';
import { OFICINA_STATUS_LABELS } from '@/lib/oficina-status';

type Ordem = {
  id: number;
  status: string;
  cliente_nome: string;
  moto_marca: string | null;
  moto_modelo: string | null;
  moto_placa: string | null;
  moto_nome: string | null;
  servico_descricao: string | null;
  data_entrada: string | null;
};

type Me = { id: number; nome: string };

function statusClass(status: string): string {
  switch (status) {
    case 'aberta':
    case 'diagnostico':
      return 'mec-badge-blue';
    case 'em_servico':
      return 'mec-badge-green';
    case 'aguardando_peca':
    case 'aguardando_aprovacao':
    case 'aguardando_administrativo':
    case 'agendar_entrega':
    case 'lavagem':
      return 'mec-badge-amber';
    default:
      return 'mec-badge-gray';
  }
}

function statusLabel(s: string): string {
  return OFICINA_STATUS_LABELS[s as keyof typeof OFICINA_STATUS_LABELS] || s;
}

export default function MecanicoOrdensPage() {
  const params = useParams();
  const router = useRouter();
  const slug = (params?.slug as string) || '';
  const { showToast } = useToast();

  const [me, setMe] = useState<Me | null>(null);
  const [list, setList] = useState<Ordem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [mr, or] = await Promise.all([
        fetch('/api/mecanico/me'),
        fetch('/api/mecanico/ordens'),
      ]);
      if (mr.status === 401 || or.status === 401) {
        router.replace(`/m/${slug}/login`);
        return;
      }
      if (mr.ok) setMe(await mr.json());
      if (or.ok) {
        const d = await or.json();
        setList(Array.isArray(d) ? d : []);
      }
    } catch {
      showToast('Erro ao carregar', 'error');
    } finally {
      setLoading(false);
    }
  }, [router, slug, showToast]);

  useEffect(() => {
    load();
  }, [load]);

  const doLogout = async () => {
    try {
      await fetch('/api/mecanico/logout', { method: 'POST' });
    } catch {}
    router.replace(`/m/${slug}/login`);
  };

  return (
    <>
      <header className="mec-topbar">
        <div style={{ flex: 1 }}>
          <h1 className="mec-topbar-title">{me?.nome || 'Mecânico'}</h1>
          <div className="mec-topbar-sub">Minhas OSs</div>
        </div>
        <button type="button" className="mec-topbar-btn" onClick={doLogout}>
          Sair
        </button>
      </header>

      <div className="mec-container">
        {loading ? (
          <div className="mec-loading">Carregando…</div>
        ) : list.length === 0 ? (
          <div className="mec-empty">
            Nenhuma OS ativa atribuída a você no momento.
          </div>
        ) : (
          <div className="mec-os-list">
            {list.map((o) => {
              const moto =
                o.moto_nome ||
                [o.moto_marca, o.moto_modelo].filter(Boolean).join(' ') ||
                (o.moto_placa || '—');
              return (
                <Link
                  key={o.id}
                  href={`/m/${slug}/os/${o.id}`}
                  className="mec-os-card"
                >
                  <div className="mec-os-head">
                    <span className="mec-os-id">OS #{o.id}</span>
                    <span className={`mec-badge ${statusClass(o.status)}`}>
                      {statusLabel(o.status)}
                    </span>
                  </div>
                  <div className="mec-os-cliente">{o.cliente_nome || '—'}</div>
                  <div className="mec-os-moto">
                    {moto}
                    {o.moto_placa ? ` • ${o.moto_placa}` : ''}
                  </div>
                  {o.servico_descricao && (
                    <div className="mec-os-desc">{o.servico_descricao}</div>
                  )}
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
