// Login do solicitante com a conta do Feishu (open.feishu.cn) ou do Lark
// (open.larksuite.com). As duas plataformas têm a mesma API OAuth 2.0; muda o domínio.
// Cada uma exige um "app próprio" (custom app) criado pelo admin da empresa.

export type Plataforma = "feishu" | "lark";

export const PLATAFORMAS: Record<
  Plataforma,
  { nome: string; autorizar: string; api: string; prefixoEnv: "FEISHU" | "LARK" }
> = {
  feishu: {
    nome: "Feishu",
    autorizar: "https://accounts.feishu.cn/open-apis/authen/v1/authorize",
    api: "https://open.feishu.cn/open-apis",
    prefixoEnv: "FEISHU",
  },
  lark: {
    nome: "Lark",
    autorizar: "https://accounts.larksuite.com/open-apis/authen/v1/authorize",
    api: "https://open.larksuite.com/open-apis",
    prefixoEnv: "LARK",
  },
};

export type ConfigPlataforma = {
  plataforma: Plataforma;
  appId: string;
  appSecret: string;
  /** Permissões extras (ex.: "contact:user.email:readonly contact:user.phone:readonly"). */
  escopos: string;
  /** Se definido, só aceita usuários desta empresa (tenant_key). */
  tenantKey?: string;
};

export function configPlataforma(p: Plataforma): ConfigPlataforma | null {
  const prefixo = PLATAFORMAS[p].prefixoEnv;
  const appId = process.env[`${prefixo}_APP_ID`]?.trim();
  const appSecret = process.env[`${prefixo}_APP_SECRET`]?.trim();
  if (!appId || !appSecret) return null;
  return {
    plataforma: p,
    appId,
    appSecret,
    escopos: process.env[`${prefixo}_SCOPES`]?.trim() ?? "",
    tenantKey: process.env[`${prefixo}_TENANT_KEY`]?.trim() || undefined,
  };
}

/** Plataformas com App ID e App Secret configurados. */
export function plataformasAtivas(): Plataforma[] {
  return (Object.keys(PLATAFORMAS) as Plataforma[]).filter((p) => configPlataforma(p) !== null);
}

/**
 * O formulário exige login quando há ao menos uma plataforma configurada.
 * FORMULARIO_EXIGE_LOGIN=false desliga a exigência (login fica opcional).
 */
export function formularioExigeLogin() {
  return plataformasAtivas().length > 0 && process.env.FORMULARIO_EXIGE_LOGIN?.trim() !== "false";
}

export function ehPlataforma(v: unknown): v is Plataforma {
  return v === "feishu" || v === "lark";
}
