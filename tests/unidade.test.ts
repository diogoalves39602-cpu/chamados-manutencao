// Testes da lógica pura (sem banco).  npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import * as XLSX from "xlsx";
import { diaSP, formatarDataHora, inicioDoDiaSP, resolverPeriodo, diasDoPeriodo } from "../src/lib/datas";
import { cronometro, estadoPrazo } from "../src/lib/chamados/prazo";
import { descreverSla, formatarDuracao } from "../src/lib/chamados/rotulos";
import { assinar, montarCorpo } from "../src/lib/notificacoes/bot";
import { celulaDataHora, gerarPlanilha, type LinhaResumo } from "../src/lib/planilha";
import type { ChamadoCompleto } from "../src/lib/chamados/tipos";

test("datas: exibição sempre no horário de São Paulo", () => {
  assert.equal(formatarDataHora("2026-10-05T15:30:00Z"), "05/10/2026 12:30");
  assert.equal(formatarDataHora("2026-10-06T02:10:00Z"), "05/10/2026 23:10"); // ainda dia 5 em SP
});

test("datas: meia-noite de São Paulo em UTC", () => {
  assert.equal(inicioDoDiaSP({ ano: 2026, mes: 10, dia: 5 }).toISOString(), "2026-10-05T03:00:00.000Z");
  assert.deepEqual(diaSP(new Date("2026-10-06T02:59:59Z")), { ano: 2026, mes: 10, dia: 5 });
});

test("datas: períodos do filtro", () => {
  const agora = new Date("2026-10-05T15:00:00Z"); // 12:00 em SP
  const hoje = resolverPeriodo("hoje", undefined, undefined, agora);
  assert.equal(hoje.inicio.toISOString(), "2026-10-05T03:00:00.000Z");
  assert.equal(hoje.fim.toISOString(), "2026-10-06T03:00:00.000Z");

  const sete = resolverPeriodo("7d", undefined, undefined, agora);
  assert.equal(sete.de, "2026-09-29");
  assert.equal(diasDoPeriodo(sete).length, 7);

  const mes = resolverPeriodo("mes", undefined, undefined, agora);
  assert.equal(mes.de, "2026-10-01");

  const pers = resolverPeriodo("personalizado", "2026-09-10", "2026-09-01", agora); // invertido
  assert.equal(pers.de, "2026-09-01");
  assert.equal(pers.ate, "2026-09-10");
  assert.equal(pers.fim.toISOString(), "2026-09-11T03:00:00.000Z");
});

test("prazo: cores verde / amarelo / vermelho", () => {
  const agora = Date.parse("2026-10-05T12:00:00Z");
  const base = { status: "aberto" as const, situacao_prazo: null };
  assert.equal(estadoPrazo({ ...base, prazo_limite: "2026-10-05T13:30:00Z" }, agora).cor, "verde");
  assert.equal(estadoPrazo({ ...base, prazo_limite: "2026-10-05T12:59:59Z" }, agora).cor, "amarelo");
  const atrasado = estadoPrazo({ ...base, prazo_limite: "2026-10-05T11:55:00Z" }, agora);
  assert.equal(atrasado.cor, "vermelho");
  assert.equal(atrasado.texto, "Atrasado 05:00");
  assert.equal(
    estadoPrazo({ status: "finalizado", situacao_prazo: "fora_do_prazo", prazo_limite: "2026-10-05T11:00:00Z" }, agora).cor,
    "neutro",
  );
  assert.equal(cronometro(3_723_000), "01:02:03");
});

test("rótulos: duração e SLA", () => {
  assert.equal(formatarDuracao(45), "45min");
  assert.equal(formatarDuracao(125), "2h 05min");
  assert.equal(descreverSla(120), "2 horas");
  assert.equal(descreverSla(60), "1 hora");
  assert.equal(descreverSla(90), "90 minutos");
});

test("bot Feishu/Lark: assinatura HMAC-SHA256 (chave = timestamp\\nsecret, mensagem vazia)", () => {
  const esperado = createHmac("sha256", "1700000000\nsegredo-teste").update(Buffer.alloc(0)).digest("base64");
  assert.equal(assinar(1700000000, "segredo-teste"), esperado);

  const corpo = montarCorpo({ x: 1 }, "segredo-teste", 1_700_000_000_500);
  assert.equal(corpo.timestamp, "1700000000");
  assert.equal(corpo.sign, esperado);
  assert.equal(corpo.msg_type, "interactive");
  assert.equal("sign" in montarCorpo({}, null), false); // sem secret, sem assinatura
});

test("planilha: abas, cabeçalhos e datas no fuso de São Paulo", () => {
  const cel = celulaDataHora("2026-10-05T15:30:00Z") as XLSX.CellObject;
  assert.equal(XLSX.SSF.format(cel.z as string, cel.v as number), "05/10/2026 12:30");

  const chamado = {
    id: "1", numero: "CH-000001", status: "finalizado", situacao_prazo: "dentro_do_prazo", origem: "lark",
    turno: "Tarde", local: "Sala 1", solicitante_nome: "Ana", solicitante_setor: "RH", solicitante_contato: "ramal 1",
    descricao: "Teste", aberto_em: "2026-10-05T15:30:00Z", prazo_limite: "2026-10-05T17:30:00Z", sla_minutos: 120,
    recebido_em: "2026-10-05T15:40:00Z", finalizado_em: "2026-10-05T16:30:00Z", tempo_total_minutos: 60,
    tempo_ate_assumir_minutos: 10, observacao_finalizacao: "ok", cancelado_em: null, motivo_cancelamento: null,
    categoria: { nome: "Elétrica" }, recebido: { nome: "Carlos" }, finalizador: { nome: "Carlos" }, cancelador: null,
  } as unknown as ChamadoCompleto;
  const linha: LinhaResumo = {
    chave: "total", total: 4, abertos: 1, em_andamento: 0, finalizados: 2, cancelados: 1, dentro: 1, fora: 1,
    atrasados: 1, tempo_medio_total: 75.5, tempo_medio_assumir: 8,
  };

  const arquivo = gerarPlanilha({
    chamados: [chamado], total: linha, porDia: [{ ...linha, chave: "2026-10-05" }], porCategoria: [{ ...linha, chave: "Elétrica" }],
    porTecnico: [], porTurno: [{ ...linha, chave: "Tarde" }], atrasadosAgora: 3, cabecalho: ["Período: teste"],
  });
  const livro = XLSX.read(arquivo, { type: "buffer" });
  assert.deepEqual(livro.SheetNames, ["Chamados", "Resumo"]);

  const linhas = XLSX.utils.sheet_to_json<string[]>(livro.Sheets.Chamados, { header: 1, raw: false });
  assert.equal(linhas[0][0], "Número");
  assert.equal(linhas[1][0], "CH-000001");
  assert.equal(linhas[1][2], "Dentro do prazo");
  assert.equal(linhas[1][11], "05/10/2026 12:30"); // Aberto em

  const resumo = XLSX.utils.sheet_to_json<string[]>(livro.Sheets.Resumo, { header: 1, raw: false });
  const texto = resumo.map((l) => l.join(" | ")).join("\n");
  assert.match(texto, /Finalizados dentro do prazo \| 1 \| 50\.0%/);
  assert.match(texto, /SLA projetado.*33\.3%/); // 1 / (2 finalizados + 1 atrasado)
  assert.match(texto, /Por dia/);
  assert.match(texto, /05\/10\/2026/);
  assert.match(texto, /Por turno/);
});
