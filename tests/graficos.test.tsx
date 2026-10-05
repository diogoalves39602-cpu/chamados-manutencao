// Renderiza os gráficos do dashboard com dados fictícios (pega erros de runtime/JSX).
import { test } from "node:test";
import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import { GraficoDiario, Ranking } from "../src/app/(equipe)/dashboard/graficos";
import type { Grupo } from "../src/lib/indicadores-calculo";

const g = (chave: string, total: number, dentro: number, fora: number, abertos = 0): Grupo => ({
  dimensao: "dia", chave, total, abertos, em_andamento: 0, finalizados: dentro + fora, cancelados: 0,
  dentro, fora, atrasados: 0, tempo_medio_total: 80, tempo_medio_assumir: 9,
});

test("gráfico diário: colunas, tooltip, eixo e tabela", () => {
  const dias = [g("2026-10-01", 10, 8, 2), g("2026-10-02", 0, 0, 0), g("2026-10-03", 6, 3, 1, 2)];
  const html = renderToStaticMarkup(<GraficoDiario dias={dias} />);
  assert.match(html, /01\/10: 8 no prazo, 2 fora, 0 em aberto/); // aria-label por coluna
  assert.match(html, /Finalizados fora do prazo/); // legenda
  assert.match(html, /<table/); // visão em tabela
  assert.match(html, /80,0%/); // % no prazo do dia 1
});

test("ranking: barras proporcionais e vazio", () => {
  const html = renderToStaticMarkup(<Ranking grupos={[g("Elétrica", 20, 15, 5), g("TI", 10, 10, 0)]} />);
  assert.match(html, /width:100%/);
  assert.match(html, /width:50%/);
  assert.match(html, /75,0% no prazo/);
  assert.match(renderToStaticMarkup(<Ranking grupos={[]} />), /Sem dados/);
});
