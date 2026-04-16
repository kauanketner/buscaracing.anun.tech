'use client';

/**
 * Lista de OSs ativas atribuídas ao técnico logado.
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
      return 'tec-badge-blue';
    case 'em_servico':
      return 'tec-badge-green';
    case 'aguardando_peca':
    case 'aguardando_aprovacao':
    case 'aguardando_administrativo':
    case 'agendar_entrega':
    case 'lavagem':
      return 'tec-badge-amber';
    default:
      return 'tec-badge-gray';
  }
}

function statusLabel(s: string): string {
  return OFICINA_STATUS_LABELS[s as keyof typeof OFICINA_STATUS_LABELS] || s;
}

export default function TecnicoOrdensPage() {
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
        fetch('/api/tecnico/me'),
        fetch('/api/tecnico/ordens'),
      ]);
      if (mr.status === 401 || or.status === 401) {
        router.replace(`/t/${slug}/login`);
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
      await fetch('/api/tecnico/logout', { method: 'POST' });
    } catch {}
    router.replace(`/t/${slug}/login`);
  };

  return (
    <>
      <header className="tec-topbar">
        <div style={{ flex: 1 }}>
          <h1 className="tec-topbar-title">{me?.nome || 'Técnico'}</h1>
          <div className="tec-topbar-sub">Minhas OSs</div>
        </div>
        <button type="button" className="tec-topbar-btn" onClick={doLogout}>
          Sair
        </button>
      </header>

      <div className="tec-container">
        {loading ? (
          <div className="tec-loading">Carregando…</div>
        ) : list.length === 0 ? (
          <div className="tec-empty">
            Nenhuma OS ativa atribuída a você no momento.
          </div>
        ) : (
          <div className="tec-os-list">
            {list.map((o) => {
              const moto =
                o.moto_nome ||
                [o.moto_marca, o.moto_modelo].filter(Boolean).join(' ') ||
                (o.moto_placa || '—');
              return (
                <Link
                  key={o.id}
                  href={`/t/${slug}/os/${o.id}`}
                  className="tec-os-card"
                >
                  <div className="tec-os-head">
                    <span className="tec-os-id">OS #{o.id}</span>
                    <span className={`tec-badge ${statusClass(o.status)}`}>
                      {statusLabel(o.status)}
                    </span>
                  </div>
                  <div className="tec-os-cliente">{o.cliente_nome || '—'}</div>
                  <div className="tec-os-moto">
                    {moto}
                    {o.moto_placa ? ` • ${o.moto_placa}` : ''}
                  </div>
                  {o.servico_descricao && (
                    <div className="tec-os-desc">{o.servico_descricao}</div>
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
