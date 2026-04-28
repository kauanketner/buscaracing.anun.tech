/**
 * Integração com WTS Chat API para envio de mensagens WhatsApp.
 *
 * Docs: https://api.wts.chat/chat/v1/message/send
 * Auth: Bearer token via env WTS_CHAT_TOKEN
 *
 * Config (em configuracoes DB):
 * - wts_from: número do canal (ex: 551151073435)
 * - wts_template_id: ID do template padrão (ex: 58f53_checklistlembrete)
 */

import { getDb } from './db';

const WTS_BASE = 'https://api.wts.chat/chat';

function getToken(): string {
  return process.env.WTS_CHAT_TOKEN || '';
}

function getWtsConfig(): { from: string; templateId: string } {
  const db = getDb();
  const get = (k: string) => {
    const r = db.prepare('SELECT valor FROM configuracoes WHERE chave=?').get(k) as { valor: string } | undefined;
    return r?.valor || '';
  };
  return {
    from: get('wts_from'),
    templateId: get('wts_template_id'),
  };
}

export type WtsSendResult = {
  ok: boolean;
  id?: string;
  status?: string;
  error?: string;
};

/**
 * Envia mensagem via WTS Chat API.
 * Usa template se configurado (obrigatório para iniciar conversa no WhatsApp).
 */
export async function enviarMensagem(
  to: string,
  text: string,
  options?: {
    from?: string;
    templateId?: string;
    parameters?: Record<string, string>;
  },
): Promise<WtsSendResult> {
  const token = getToken();
  if (!token) {
    console.error('[WTS] WTS_CHAT_TOKEN não configurado');
    return { ok: false, error: 'WTS_CHAT_TOKEN não configurado' };
  }

  const phone = to.replace(/\D/g, '');
  if (phone.length < 10) {
    return { ok: false, error: `Número inválido: ${to}` };
  }

  const config = getWtsConfig();
  const from = options?.from || config.from;
  const templateId = options?.templateId || config.templateId;

  const bodyPayload: Record<string, unknown> = templateId
    ? { templateId, parameters: options?.parameters || {} }
    : { text };

  const requestBody: Record<string, unknown> = {
    to: phone,
    body: bodyPayload,
    // Oculta o atendimento criado pelo disparo — só aparece se o contato responder.
    // Evita poluir a tela de atendimentos com mensagens de lembrete automáticas.
    options: { hiddenSession: true },
  };
  if (from) requestBody.from = from;

  try {
    const r = await fetch(`${WTS_BASE}/v1/message/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(requestBody),
    });

    if (!r.ok) {
      const errData = await r.json().catch(() => ({}));
      const errMsg = (errData as { text?: string }).text || `HTTP ${r.status}`;
      console.error(`[WTS] Erro ao enviar para ${phone}: ${errMsg}`);
      return { ok: false, error: errMsg };
    }

    const data = (await r.json()) as { id?: string; status?: string };
    return { ok: true, id: data.id, status: data.status };
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro desconhecido';
    console.error(`[WTS] Falha de conexão: ${msg}`);
    return { ok: false, error: msg };
  }
}

/**
 * Envia lembrete de checklist para múltiplos números.
 * Usa template com parâmetros se disponível, senão texto puro.
 *
 * @param checklistId — id estável do checklist (vai como {{1}} no botão CTA dinâmico)
 */
export async function enviarLembreteChecklist(
  numeros: string[],
  checklistTitulo: string,
  checklistLink: string,
  mensagemCustom?: string,
  checklistId?: number,
): Promise<{ enviados: number; falhas: number }> {
  const config = getWtsConfig();

  // Data e hora atuais em BRT (formato brasileiro)
  const TZ = 'America/Sao_Paulo';
  const now = new Date();
  const dataBR = new Intl.DateTimeFormat('pt-BR', { timeZone: TZ, day: '2-digit', month: '2-digit', year: 'numeric' }).format(now);
  const horaBR = new Intl.DateTimeFormat('pt-BR', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hour12: false }).format(now);

  let enviados = 0;
  let falhas = 0;

  for (const num of numeros) {
    const trimmed = num.trim();
    if (!trimmed) continue;

    let result: WtsSendResult;
    if (config.templateId) {
      // Parâmetros do template:
      //   data    = ex: "17/04/2026"        — body
      //   horario = ex: "12h30"             — body
      //   link    = URL completa do checklist (caso body referencie {{link}})
      //   1       = id do checklist          — botão CTA com URL dinâmica
      //             https://buscaracing.com/cl/{{1}} resolve token atual via redirect
      const params: Record<string, string> = {
        data: dataBR,
        horario: horaBR,
        link: checklistLink,
      };
      if (checklistId != null) {
        params['1'] = String(checklistId);
      }
      result = await enviarMensagem(trimmed, '', {
        templateId: config.templateId,
        parameters: params,
      });
    } else {
      // Fallback: texto puro (só funciona se conversa já está aberta)
      const texto = mensagemCustom
        ? `${mensagemCustom}\n\n${checklistLink}`
        : `Lembrete: preencha o checklist "${checklistTitulo}"\n\n${checklistLink}`;
      result = await enviarMensagem(trimmed, texto);
    }

    if (result.ok) {
      enviados++;
    } else {
      falhas++;
    }
  }

  return { enviados, falhas };
}

/**
 * Configuração de notificação de venda (template + destinatários).
 * Lida no DB em configuracoes.
 */
function getVendaNotifConfig(): { templateId: string; numeros: string[] } {
  const db = getDb();
  const get = (k: string) => {
    const r = db.prepare('SELECT valor FROM configuracoes WHERE chave=?').get(k) as { valor: string } | undefined;
    return r?.valor || '';
  };
  const templateId = get('venda_notif_template_id');
  const numerosRaw = get('venda_notif_numeros');
  const numeros = numerosRaw
    .split(/[,\n;]+/)
    .map((n) => n.trim())
    .filter(Boolean);
  return { templateId, numeros };
}

export type VendaNotifData = {
  vendedor: string;
  moto: string;
  chassi: string;
  motor: string;
  cliente: string;
  endereco: string;
  valor: string;   // já formatado ex: "12.000,00"
  pagamento: string;
  cpf: string;          // {{9}}
  comprovantes: string; // {{10}} — ex: "3 anexados" ou "Nenhum"
};

/**
 * Envia notificação de venda realizada para os números configurados.
 * Template usa parâmetros numerados {{1}}..{{10}}:
 *   1=vendedor, 2=moto, 3=chassi, 4=motor, 5=cliente,
 *   6=endereço, 7=valor, 8=forma de pagamento,
 *   9=CPF, 10=comprovantes
 */
export async function enviarNotificacaoVenda(
  data: VendaNotifData,
): Promise<{ enviados: number; falhas: number; total: number }> {
  const { templateId, numeros } = getVendaNotifConfig();
  if (!templateId || numeros.length === 0) {
    return { enviados: 0, falhas: 0, total: 0 };
  }

  // Template `venda_realizada` da WTS usa chaves p1..p10
  const params: Record<string, string> = {
    p1: data.vendedor || '—',
    p2: data.moto || '—',
    p3: data.chassi || '—',
    p4: data.motor || '—',
    p5: data.cliente || '—',
    p6: data.endereco || '—',
    p7: data.valor || '—',
    p8: data.pagamento || '—',
    p9: data.cpf || '—',
    p10: data.comprovantes || '—',
  };

  let enviados = 0;
  let falhas = 0;
  for (const num of numeros) {
    const r = await enviarMensagem(num, '', {
      templateId,
      parameters: params,
    });
    if (r.ok) enviados++;
    else falhas++;
  }
  return { enviados, falhas, total: numeros.length };
}
