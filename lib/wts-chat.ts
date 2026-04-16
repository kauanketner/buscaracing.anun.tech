/**
 * Integração com WTS Chat API para envio de mensagens WhatsApp.
 *
 * Docs: https://api.wts.chat/chat/v1/message/send
 * Auth: Bearer token via env WTS_CHAT_TOKEN
 */

const WTS_BASE = 'https://api.wts.chat/chat';

function getToken(): string {
  return process.env.WTS_CHAT_TOKEN || '';
}

export type WtsSendResult = {
  ok: boolean;
  id?: string;
  status?: string;
  error?: string;
};

/**
 * Envia mensagem de texto via WTS Chat API.
 * Se templateId for fornecido, envia como template (necessário para iniciar conversa).
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

  // Normalize phone: remove non-digits, ensure country code
  const phone = to.replace(/\D/g, '');
  if (phone.length < 10) {
    return { ok: false, error: `Número inválido: ${to}` };
  }

  const body: Record<string, unknown> = {
    to: phone,
    body: options?.templateId
      ? { templateId: options.templateId, parameters: options.parameters || {} }
      : { text },
  };
  if (options?.from) body.from = options.from;

  try {
    const r = await fetch(`${WTS_BASE}/v1/message/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
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
 */
export async function enviarLembreteChecklist(
  numeros: string[],
  checklistTitulo: string,
  checklistLink: string,
  mensagemCustom?: string,
): Promise<{ enviados: number; falhas: number }> {
  const texto = mensagemCustom
    ? `${mensagemCustom}\n\n${checklistLink}`
    : `Lembrete: preencha o checklist "${checklistTitulo}"\n\n${checklistLink}`;

  let enviados = 0;
  let falhas = 0;

  for (const num of numeros) {
    const trimmed = num.trim();
    if (!trimmed) continue;
    const result = await enviarMensagem(trimmed, texto);
    if (result.ok) {
      enviados++;
    } else {
      falhas++;
    }
  }

  return { enviados, falhas };
}
