import { PLATAFORMAS, type ConfigPlataforma } from "@/lib/solicitante/plataformas";

// Mensagem direta do bot do app da empresa para uma pessoa (open_id) no Feishu/Lark.
// Requisitos no app: capacidade "Bot" (机器人) + permissão im:message:send_as_bot,
// versão publicada e a pessoa dentro da disponibilidade do app.
//   1) POST /auth/v3/tenant_access_token/internal  {app_id, app_secret}
//   2) POST /im/v1/messages?receive_id_type=open_id {receive_id, msg_type:"text", content}

const cacheToken = new Map<string, { token: string; expira: number }>();

export class ErroFeishu extends Error {
  constructor(
    message: string,
    readonly codigo?: number,
  ) {
    super(message);
  }
}

async function tokenDoApp(cfg: ConfigPlataforma, fetcher: typeof fetch): Promise<string> {
  const chave = `${cfg.plataforma}:${cfg.appId}`;
  const emCache = cacheToken.get(chave);
  if (emCache && emCache.expira > Date.now() + 60_000) return emCache.token;

  const resp = await fetcher(`${PLATAFORMAS[cfg.plataforma].api}/auth/v3/tenant_access_token/internal`, {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({ app_id: cfg.appId, app_secret: cfg.appSecret }),
    signal: AbortSignal.timeout(10_000),
    cache: "no-store",
  });
  const json = (await resp.json().catch(() => ({}))) as { code?: number; msg?: string; tenant_access_token?: string; expire?: number };
  if (json.code !== 0 || !json.tenant_access_token) {
    throw new ErroFeishu(`credenciais do app: ${json.msg ?? resp.status}`, json.code);
  }
  cacheToken.set(chave, { token: json.tenant_access_token, expira: Date.now() + (json.expire ?? 7200) * 1000 });
  return json.tenant_access_token;
}

export async function enviarMensagemUsuario(
  cfg: ConfigPlataforma,
  openId: string,
  texto: string,
  fetcher: typeof fetch = fetch,
): Promise<void> {
  const token = await tokenDoApp(cfg, fetcher);
  const resp = await fetcher(`${PLATAFORMAS[cfg.plataforma].api}/im/v1/messages?receive_id_type=open_id`, {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ receive_id: openId, msg_type: "text", content: JSON.stringify({ text: texto }) }),
    signal: AbortSignal.timeout(10_000),
    cache: "no-store",
  });
  const json = (await resp.json().catch(() => ({}))) as { code?: number; msg?: string };
  if (json.code !== 0) throw new ErroFeishu(json.msg ?? `HTTP ${resp.status}`, json.code);
}

/** Explica em português os erros mais comuns do envio. */
export function explicarErroFeishu(e: unknown): string {
  if (!(e instanceof ErroFeishu)) return "Não foi possível falar com o Feishu agora. Tente de novo.";
  // Códigos da documentação oficial de im/v1/messages.
  switch (e.codigo) {
    case 230006:
      return "O app do Feishu ainda não tem o recurso Bot ativado e publicado.";
    case 230013:
      return "O bot não tem acesso a essa pessoa: o app precisa estar publicado e disponível para ela no Feishu.";
    case 230027:
    case 99991672:
      return "O app do Feishu ainda não tem a permissão de enviar mensagens (im:message:send_as_bot). Peça ao administrador.";
    case 230034:
      return "A identificação do Feishu deste solicitante não é válida para este app.";
  }
  return `O Feishu recusou o envio: ${e.message}`;
}
