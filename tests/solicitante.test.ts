// Login do solicitante com Feishu/Lark: sessão assinada e fluxo OAuth (API simulada).
import { test } from "node:test";
import assert from "node:assert/strict";
import { trocarCodigoPorUsuario, urlAutorizacao } from "../src/lib/solicitante/oauth";
import type { ConfigPlataforma } from "../src/lib/solicitante/plataformas";
import { assinar, criarSessao, lerSessao, verificar } from "../src/lib/solicitante/sessao";

const SEGREDO = "s".repeat(40);
const cfg: ConfigPlataforma = { plataforma: "feishu", appId: "cli_abc", appSecret: "segredo", escopos: "" };

test("sessão: assinada, válida por 30 dias e à prova de adulteração", () => {
  const agora = Date.parse("2026-10-06T12:00:00Z");
  const { valor } = criarSessao({ plataforma: "feishu", id: "ou_123", nome: "Maria Souza" }, agora, SEGREDO);

  const sessao = lerSessao(valor, agora, SEGREDO);
  assert.equal(sessao?.nome, "Maria Souza");
  assert.equal(sessao?.id, "ou_123");

  // Trocar o nome no cookie invalida a assinatura.
  const [, sig] = valor.split(".");
  const forjado = `${Buffer.from(JSON.stringify({ ...sessao, nome: "Outra Pessoa" })).toString("base64url")}.${sig}`;
  assert.equal(lerSessao(forjado, agora, SEGREDO), null);

  // Outra chave não valida.
  assert.equal(lerSessao(valor, agora, "x".repeat(40)), null);

  // Expira após 30 dias.
  assert.equal(lerSessao(valor, agora + 31 * 24 * 3600 * 1000, SEGREDO), null);

  assert.equal(verificar("lixo", SEGREDO), null);
  assert.deepEqual(verificar(assinar({ a: 1 }, SEGREDO), SEGREDO), { a: 1 });
});

test("OAuth: URL de autorização do Feishu e do Lark", () => {
  const u = new URL(urlAutorizacao(cfg, "https://app.exemplo/auth/feishu/retorno", "st"));
  assert.equal(u.origin + u.pathname, "https://accounts.feishu.cn/open-apis/authen/v1/authorize");
  assert.equal(u.searchParams.get("client_id"), "cli_abc");
  assert.equal(u.searchParams.get("response_type"), "code");
  assert.equal(u.searchParams.get("redirect_uri"), "https://app.exemplo/auth/feishu/retorno");
  assert.equal(u.searchParams.get("state"), "st");
  assert.equal(u.searchParams.has("scope"), false);

  const lark = new URL(urlAutorizacao({ ...cfg, plataforma: "lark", escopos: "contact:user.email:readonly" }, "r", "s"));
  assert.equal(lark.host, "accounts.larksuite.com");
  assert.equal(lark.searchParams.get("scope"), "contact:user.email:readonly");
});

function apiFalsa(respostas: Record<string, unknown>) {
  const chamadas: { url: string; corpo?: unknown; auth?: string }[] = [];
  const fetcher = (async (url: string, init?: RequestInit) => {
    chamadas.push({
      url,
      corpo: init?.body ? JSON.parse(String(init.body)) : undefined,
      auth: (init?.headers as Record<string, string> | undefined)?.Authorization,
    });
    const chave = Object.keys(respostas).find((k) => url.endsWith(k))!;
    return new Response(JSON.stringify(respostas[chave]), { status: 200 });
  }) as typeof fetch;
  return { fetcher, chamadas };
}

test("OAuth: troca o code e lê nome, open_id, e-mail e celular", async () => {
  const { fetcher, chamadas } = apiFalsa({
    "/authen/v2/oauth/token": { code: 0, access_token: "u-token", token_type: "Bearer", expires_in: 7200 },
    "/authen/v1/user_info": {
      code: 0,
      data: { name: "Maria Souza", open_id: "ou_123", enterprise_email: "maria@empresa.com", mobile: "+5511999990000", tenant_key: "t1" },
    },
  });
  const u = await trocarCodigoPorUsuario(cfg, "code-1", "https://app/retorno", fetcher);
  assert.deepEqual(u, { openId: "ou_123", nome: "Maria Souza", email: "maria@empresa.com", celular: "+5511999990000", tenantKey: "t1" });

  assert.equal(chamadas[0].url, "https://open.feishu.cn/open-apis/authen/v2/oauth/token");
  assert.deepEqual(chamadas[0].corpo, {
    grant_type: "authorization_code", client_id: "cli_abc", client_secret: "segredo", code: "code-1", redirect_uri: "https://app/retorno",
  });
  assert.equal(chamadas[1].url, "https://open.feishu.cn/open-apis/authen/v1/user_info");
  assert.equal(chamadas[1].auth, "Bearer u-token");
});

test("OAuth: erros do Feishu e empresa diferente são recusados", async () => {
  const codigoInvalido = apiFalsa({ "/authen/v2/oauth/token": { code: 20050, error: "invalid_grant", error_description: "code expirado" } });
  await assert.rejects(trocarCodigoPorUsuario(cfg, "x", "r", codigoInvalido.fetcher), /invalid_grant/);

  const outraEmpresa = apiFalsa({
    "/authen/v2/oauth/token": { code: 0, access_token: "t" },
    "/authen/v1/user_info": { code: 0, data: { name: "Fulano", open_id: "ou_9", tenant_key: "outra" } },
  });
  await assert.rejects(trocarCodigoPorUsuario({ ...cfg, tenantKey: "minha" }, "x", "r", outraEmpresa.fetcher), /tenant_key/);
});
