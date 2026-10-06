import { PLATAFORMAS, type ConfigPlataforma } from "./plataformas";

// OAuth 2.0 do Feishu/Lark (documentação oficial "获取授权码" e "获取 user_access_token").
// 1) redireciona para /authen/v1/authorize  2) troca o code em /authen/v2/oauth/token
// 3) lê o usuário em /authen/v1/user_info. O code vale 5 min e só pode ser usado uma vez.

export function urlAutorizacao(cfg: ConfigPlataforma, redirectUri: string, state: string) {
  const url = new URL(PLATAFORMAS[cfg.plataforma].autorizar);
  url.searchParams.set("client_id", cfg.appId);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("state", state);
  if (cfg.escopos) url.searchParams.set("scope", cfg.escopos);
  return url.toString();
}

export type UsuarioPlataforma = {
  openId: string;
  nome: string;
  email?: string;
  celular?: string;
  tenantKey?: string;
};

export class ErroOAuth extends Error {}

type RespostaToken = { code?: number; access_token?: string; error?: string; error_description?: string };
type RespostaUsuario = {
  code?: number;
  msg?: string;
  data?: {
    name?: string;
    en_name?: string;
    open_id?: string;
    email?: string;
    enterprise_email?: string;
    mobile?: string;
    tenant_key?: string;
  };
};

export async function trocarCodigoPorUsuario(
  cfg: ConfigPlataforma,
  code: string,
  redirectUri: string,
  fetcher: typeof fetch = fetch,
): Promise<UsuarioPlataforma> {
  const base = PLATAFORMAS[cfg.plataforma].api;

  const respToken = await fetcher(`${base}/authen/v2/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({
      grant_type: "authorization_code",
      client_id: cfg.appId,
      client_secret: cfg.appSecret,
      code,
      redirect_uri: redirectUri,
    }),
    signal: AbortSignal.timeout(10_000),
    cache: "no-store",
  });
  const token = (await respToken.json().catch(() => ({}))) as RespostaToken;
  if (token.code !== 0 || !token.access_token) {
    throw new ErroOAuth(`token: ${token.error ?? token.code ?? respToken.status} ${token.error_description ?? ""}`.trim());
  }

  const respUsuario = await fetcher(`${base}/authen/v1/user_info`, {
    headers: { Authorization: `Bearer ${token.access_token}` },
    signal: AbortSignal.timeout(10_000),
    cache: "no-store",
  });
  const usuario = (await respUsuario.json().catch(() => ({}))) as RespostaUsuario;
  const d = usuario.data;
  if (usuario.code !== 0 || !d?.open_id) {
    throw new ErroOAuth(`user_info: ${usuario.code ?? respUsuario.status} ${usuario.msg ?? ""}`.trim());
  }

  if (cfg.tenantKey && d.tenant_key !== cfg.tenantKey) {
    throw new ErroOAuth("empresa diferente da configurada (tenant_key)");
  }

  return {
    openId: d.open_id,
    nome: (d.name || d.en_name || "Colaborador").trim().slice(0, 120),
    email: d.enterprise_email || d.email || undefined,
    // O Feishu devolve o celular com DDI (+55...).
    celular: d.mobile || undefined,
    tenantKey: d.tenant_key,
  };
}
