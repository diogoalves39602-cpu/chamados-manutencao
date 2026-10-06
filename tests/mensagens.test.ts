// Mensagens ao solicitante: links do WhatsApp e envio pelo bot do Feishu (API simulada).
import { test } from "node:test";
import assert from "node:assert/strict";
import { emailDe, linkWhatsapp, numeroWhatsapp, telefoneDe } from "../src/lib/contato";
import { enviarMensagemUsuario, ErroFeishu, explicarErroFeishu } from "../src/lib/notificacoes/feishu-usuario";
import { dadosModelo, MODELOS_MENSAGEM, textoReprovado } from "../src/lib/chamados/modelos-mensagem";
import type { ConfigPlataforma } from "../src/lib/solicitante/plataformas";

test("contato: telefone, e-mail e link do WhatsApp", () => {
  assert.equal(numeroWhatsapp("11 98888-7777"), "5511988887777");
  assert.equal(numeroWhatsapp("+55 (11) 98888-7777"), "5511988887777");
  assert.equal(telefoneDe("maria@empresa.com"), null);
  assert.equal(emailDe("Maria <maria@empresa.com>"), "maria@empresa.com");
  assert.equal(linkWhatsapp("ramal 20"), null);
  assert.equal(linkWhatsapp("11988887777", "Olá, tudo bem?"), "https://wa.me/5511988887777?text=Ol%C3%A1%2C%20tudo%20bem%3F");
});

test("modelos de mensagem usam primeiro nome, número, local e prazo em horário de Brasília", () => {
  const d = dadosModelo(
    { numero: "CH-000002", solicitante_nome: "Maria Souza", local: "Sala 3", prazo_limite: "2026-10-06T17:00:00Z" },
    "https://app",
  );
  const texto = MODELOS_MENSAGEM[0].texto(d);
  assert.match(texto, /^Olá, Maria! Recebemos seu chamado CH-000002 \(Sala 3\)/);
  assert.match(texto, /06\/10\/2026 14:00/);
  assert.match(texto, /https:\/\/app$/);
});

const cfg: ConfigPlataforma = { plataforma: "feishu", appId: "cli_x", appSecret: "s", escopos: "" };

test("Feishu: pega o token do app e envia texto para o open_id", async () => {
  const chamadas: { url: string; corpo: Record<string, unknown>; auth?: string }[] = [];
  const fetcher = (async (url: string, init?: RequestInit) => {
    chamadas.push({ url, corpo: JSON.parse(String(init?.body)), auth: (init?.headers as Record<string, string>).Authorization });
    const resp = url.includes("tenant_access_token") ? { code: 0, tenant_access_token: "t-123", expire: 7200 } : { code: 0, msg: "success" };
    return new Response(JSON.stringify(resp));
  }) as typeof fetch;

  await enviarMensagemUsuario(cfg, "ou_123", "Olá!", fetcher);
  assert.equal(chamadas[0].url, "https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal");
  assert.deepEqual(chamadas[0].corpo, { app_id: "cli_x", app_secret: "s" });
  assert.equal(chamadas[1].url, "https://open.feishu.cn/open-apis/im/v1/messages?receive_id_type=open_id");
  assert.equal(chamadas[1].auth, "Bearer t-123");
  assert.deepEqual(chamadas[1].corpo, { receive_id: "ou_123", msg_type: "text", content: JSON.stringify({ text: "Olá!" }) });
});

test("Feishu: erros oficiais viram mensagens claras", async () => {
  const fetcher = (async (url: string) =>
    new Response(
      JSON.stringify(url.includes("tenant_access_token") ? { code: 0, tenant_access_token: "t", expire: 7200 } : { code: 230013, msg: "Bot has NO availability to this user." }),
    )) as typeof fetch;
  await assert.rejects(
    enviarMensagemUsuario({ ...cfg, appId: "cli_y" }, "ou_1", "x", fetcher),
    (e) => e instanceof ErroFeishu && e.codigo === 230013,
  );
  assert.match(explicarErroFeishu(new ErroFeishu("x", 230013)), /disponível para ela/);
  assert.match(explicarErroFeishu(new ErroFeishu("x", 230027)), /im:message:send_as_bot/);
  assert.match(explicarErroFeishu(new ErroFeishu("x", 230006)), /Bot/);
});

test("mensagem de reprovação leva o motivo (com ponto final) e o link para abrir outro", () => {
  const d = dadosModelo(
    { numero: "CH-000005", solicitante_nome: "Rinaldo Silva", local: "Esteira", prazo_limite: "2026-10-06T20:21:00Z", motivo_cancelamento: " Não é serviço da manutenção " },
    "https://app",
  );
  assert.equal(
    textoReprovado(d),
    "Olá, Rinaldo! Seu chamado CH-000005 (Esteira) foi reprovado pela equipe de manutenção. Motivo: Não é serviço da manutenção. Se precisar, abra um novo chamado em https://app",
  );
  assert.equal(dadosModelo({ ...d, solicitante_nome: "A", prazo_limite: "2026-10-06T20:21:00Z", motivo_cancelamento: null }, "x").motivo, undefined);
});

test("contato do formulário: telefone com DDD ou e-mail válido", async () => {
  const { contatoSchema } = await import("../src/lib/chamados/validacao");
  for (const ok of ["11 98888-7777", "(16) 98171-7992", "+55 16 98171-7992", "1633334444", "nome@empresa.com"]) {
    assert.ok(contatoSchema.safeParse(ok).success, ok);
  }
  for (const ruim of ["", "   ", "ramal 20", "98888-7777", "nome@", "nome@empresa", "11 9888a-7777"]) {
    assert.ok(!contatoSchema.safeParse(ruim).success, ruim);
  }
});

test("todo cartão do grupo leva a palavra-chave \"chamado\" no título (bots com palavra-chave)", async () => {
  const { cartaoAlertaPrazo, cartaoNovoChamado, cartaoTeste } = await import("../src/lib/notificacoes/cartoes");
  const c = {
    numero: "CH-000009", categoria: "Elétrica", responsavel: null, local: "Sala 1", descricao: "Sem luz",
    solicitante_nome: "Ana", solicitante_setor: "RH", solicitante_contato: "11988887777",
    aberto_em: "2026-10-06T18:00:00Z", prazo_limite: "2026-10-06T20:00:00Z", status: "aberto", turno: "Tarde", origem: "formulario",
  } as unknown as Parameters<typeof cartaoNovoChamado>[0];
  const prazo = new Date(c.prazo_limite).getTime();
  for (const cartao of [
    cartaoNovoChamado(c),
    cartaoAlertaPrazo(c, undefined, prazo - 20 * 60000),
    cartaoAlertaPrazo(c, undefined, prazo + 5 * 60000),
    cartaoTeste("Grupo"),
  ]) {
    assert.match((cartao as { header: { title: { content: string } } }).header.title.content, /chamado/);
  }
});
