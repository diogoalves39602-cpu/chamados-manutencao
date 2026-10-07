// Renderiza os gráficos do dashboard com dados fictícios (pega erros de runtime/JSX).
import { test } from "node:test";
import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import { Composicao, GraficoDiario, GraficoHoras, marcas } from "../src/app/(equipe)/dashboard/graficos";
import { agruparResto, type Grupo } from "../src/lib/indicadores-calculo";

const g = (chave: string, total: number, dentro: number, fora: number, abertos = 0): Grupo => ({
  dimensao: "dia", chave, total, abertos, em_andamento: 0, finalizados: dentro + fora, cancelados: 0,
  dentro, fora, atrasados: 0, tempo_medio_total: 80, tempo_medio_assumir: 9,
});

test("gráfico diário: colunas, tooltip, eixo e tabela", () => {
  const dias = [g("2026-10-01", 10, 8, 2), g("2026-10-02", 0, 0, 0), g("2026-10-03", 6, 3, 1, 2)];
  const html = renderToStaticMarkup(<GraficoDiario dias={dias} />);
  assert.match(html, /01\/10: 8 finalizados no prazo, 2 finalizados fora do prazo, 0 reprovados/); // aria-label por coluna
  assert.match(html, /Finalizados fora do prazo/); // legenda
  assert.match(html, /<table/); // visão em tabela
  assert.match(html, /80,0%/); // % no prazo do dia 1
});

test("gráfico diário: atrasados e reprovados viram partes próprias da coluna", () => {
  // 5 chamados: 1 no prazo, 1 reprovado, 3 em aberto (2 deles com prazo estourado).
  const dia: Grupo = { ...g("2026-10-06", 5, 1, 0, 3), cancelados: 1, atrasados: 2 };
  const html = renderToStaticMarkup(<GraficoDiario dias={[dia]} />);
  assert.match(html, /06\/10: 1 finalizados no prazo, 0 finalizados fora do prazo, 1 reprovados, 1 em aberto \(no prazo\), 2 atrasados \(em aberto\)/);
  assert.match(html, /background:#e34948;flex-grow:2/); // atrasados em vermelho
  assert.match(html, /background:#4a3aa7;flex-grow:1/); // reprovado em violeta
  assert.match(html, /height:83.33/); // a coluna soma os 5, num eixo arredondado até 6
});

test("composição: barras proporcionais ao total, com as partes por status, e vazio", () => {
  const html = renderToStaticMarkup(<Composicao grupos={[g("Elétrica", 20, 15, 5), g("Hidráulica", 10, 10, 0)]} />);
  assert.match(html, /width:100%/);
  assert.match(html, /width:50%/);
  assert.match(html, /75,0% no prazo/);
  assert.match(html, /background:#2a78d6;flex-grow:15/); // partes coloridas dentro da barra
  assert.match(renderToStaticMarkup(<Composicao grupos={[]} />), /Sem chamados/);
});

test("por hora: 24 colunas e destaque do horário de pico", () => {
  const horas = Array.from({ length: 24 }, (_, h) => ({ ...g(String(h).padStart(2, "0"), h === 10 ? 7 : 1, 0, 0, h === 10 ? 7 : 1), dimensao: "hora" as const }));
  const html = renderToStaticMarkup(<GraficoHoras horas={horas} />);
  assert.equal(html.match(/aria-label="\d+h: /g)?.length, 24);
  assert.match(html, /10h às 11h/);
});

test("agruparResto soma os menores em um grupo só", () => {
  const grupos = [g("A", 5, 5, 0), g("B", 3, 3, 0), g("C", 2, 1, 1), g("D", 1, 0, 0, 1)];
  const r = agruparResto(grupos, 3, "Outros");
  assert.deepEqual(r.map((x) => [x.chave, x.total, x.dentro, x.abertos]), [["A", 5, 5, 0], ["B", 3, 3, 0], ["Outros", 3, 1, 1]]);
  assert.equal(r[2].tempo_medio_total, null);
  assert.equal(agruparResto(grupos, 4, "Outros").length, 4);
});

test("marcas do eixo: inteiras, redondas e cobrindo o máximo", () => {
  assert.deepEqual(marcas(0), [0, 1]);
  assert.deepEqual(marcas(1), [0, 1]);
  assert.deepEqual(marcas(5), [0, 2, 4, 6]);
  assert.deepEqual(marcas(8), [0, 2, 4, 6, 8]);
  assert.deepEqual(marcas(37), [0, 10, 20, 30, 40]);
});
