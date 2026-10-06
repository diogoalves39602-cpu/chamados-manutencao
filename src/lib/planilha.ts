import * as XLSX from "xlsx";
import { FUSO } from "@/lib/datas";
import { ROTULO_ORIGEM, ROTULO_SITUACAO, ROTULO_STATUS } from "@/lib/chamados/rotulos";
import type { ChamadoCompleto } from "@/lib/chamados/tipos";

// Montagem do .xlsx (SheetJS). Módulo puro: recebe dados prontos, devolve o arquivo.

type Celula = XLSX.CellObject | string | number | null;

const partes = new Intl.DateTimeFormat("en-CA", {
  timeZone: FUSO,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

/**
 * Data/hora como número de série do Excel no horário de São Paulo, exibida
 * como dd/mm/aaaa hh:mm (filtrável e ordenável no Excel, sem deslocamento de fuso).
 */
export function celulaDataHora(iso: string | null | undefined): Celula {
  if (!iso) return null;
  const p = Object.fromEntries(partes.formatToParts(new Date(iso)).map((x) => [x.type, Number(x.value)]));
  const local = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return { t: "n", v: local / 86_400_000 + 25_569, z: "dd/mm/yyyy hh:mm" };
}

function celulaPct(parte: number, base: number): Celula {
  return base > 0 ? { t: "n", v: parte / base, z: "0.0%" } : "—";
}

function celulaMin(v: number | null | undefined): Celula {
  return v == null ? null : { t: "n", v: Math.round(v * 10) / 10, z: "0.0" };
}

export type LinhaResumo = {
  chave: string;
  total: number;
  abertos: number;
  em_andamento: number;
  finalizados: number;
  cancelados: number;
  dentro: number;
  fora: number;
  atrasados: number;
  tempo_medio_total: number | null;
  tempo_medio_assumir: number | null;
};

export type DadosPlanilha = {
  chamados: ChamadoCompleto[];
  total: LinhaResumo;
  porDia: LinhaResumo[];
  porCategoria: LinhaResumo[];
  porTecnico: LinhaResumo[];
  porTurno: LinhaResumo[];
  atrasadosAgora: number;
  cabecalho: string[]; // linhas descritivas (período, filtros, gerado em)
};

function abaChamados(chamados: ChamadoCompleto[]) {
  const cab = [
    "Número", "Status", "Situação do prazo", "Origem", "Turno", "Categoria", "Local",
    "Solicitante", "Setor", "Contato", "Identificado via", "Descrição", "Aberto em", "Prazo limite", "SLA (min)",
    "Recebido por", "Recebido em", "Tempo até assumir (min)", "Finalizado por", "Finalizado em",
    "Tempo total (min)", "Observação da finalização", "Cancelado por", "Cancelado em", "Motivo do cancelamento",
  ];
  const linhas: Celula[][] = chamados.map((c) => [
    c.numero,
    ROTULO_STATUS[c.status],
    c.situacao_prazo ? ROTULO_SITUACAO[c.situacao_prazo] : c.status === "cancelado" ? "—" : "Em aberto",
    ROTULO_ORIGEM[c.origem],
    c.turno,
    c.categoria?.nome ?? "",
    c.local,
    c.solicitante_nome,
    c.solicitante_setor,
    c.solicitante_contato,
    c.solicitante_plataforma === "lark" ? "Lark" : c.solicitante_plataforma === "feishu" ? "Feishu" : "—",
    c.descricao,
    celulaDataHora(c.aberto_em),
    celulaDataHora(c.prazo_limite),
    c.sla_minutos,
    c.recebido?.nome ?? "",
    celulaDataHora(c.recebido_em),
    c.tempo_ate_assumir_minutos,
    c.finalizador?.nome ?? "",
    celulaDataHora(c.finalizado_em),
    c.tempo_total_minutos,
    c.observacao_finalizacao ?? "",
    c.cancelador?.nome ?? "",
    celulaDataHora(c.cancelado_em),
    c.motivo_cancelamento ?? "",
  ]);
  const aba = XLSX.utils.aoa_to_sheet([cab, ...linhas]);
  aba["!cols"] = cab.map((h) => ({
    wch: h === "Descrição" || h.startsWith("Observação") || h.startsWith("Motivo") ? 50 : h.endsWith(" em") || h === "Prazo limite" ? 17 : Math.max(12, h.length + 2),
  }));
  aba["!autofilter"] = { ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: linhas.length, c: cab.length - 1 } }) };
  return aba;
}

const CAB_TABELA = [
  "Total", "Abertos", "Em andamento", "Finalizados", "Cancelados",
  "Dentro do prazo", "Fora do prazo", "% dentro do prazo", "% fora do prazo",
  "Atrasados em aberto", "Tempo médio (min)", "Tempo médio até assumir (min)",
];

function linhaTabela(g: LinhaResumo, rotulo: Celula): Celula[] {
  return [
    rotulo, g.total, g.abertos, g.em_andamento, g.finalizados, g.cancelados,
    g.dentro, g.fora, celulaPct(g.dentro, g.finalizados), celulaPct(g.fora, g.finalizados),
    g.atrasados, celulaMin(g.tempo_medio_total), celulaMin(g.tempo_medio_assumir),
  ];
}

function abaResumo(d: DadosPlanilha) {
  const t = d.total;
  const linhas: Celula[][] = [
    ["Resumo de chamados de manutenção"],
    ...d.cabecalho.map((l) => [l]),
    [],
    ["Indicador", "Quantidade", "Percentual"],
    ["Total de chamados abertos no período", t.total, null],
    ["Abertos (aguardando)", t.abertos, celulaPct(t.abertos, t.total)],
    ["Em andamento", t.em_andamento, celulaPct(t.em_andamento, t.total)],
    ["Finalizados", t.finalizados, celulaPct(t.finalizados, t.total)],
    ["Cancelados (fora do SLA)", t.cancelados, celulaPct(t.cancelados, t.total)],
    ["Finalizados dentro do prazo", t.dentro, celulaPct(t.dentro, t.finalizados)],
    ["Finalizados fora do prazo", t.fora, celulaPct(t.fora, t.finalizados)],
    ["SLA projetado (atrasados em aberto contam como fora)", null, celulaPct(t.dentro, t.finalizados + t.atrasados)],
    ["Atrasados agora (fila atual, independe do período)", d.atrasadosAgora, null],
    ["Tempo médio de atendimento (min)", celulaMin(t.tempo_medio_total), null],
    ["Tempo médio até assumir (min)", celulaMin(t.tempo_medio_assumir), null],
    [],
    ["Percentuais de prazo calculados sobre os finalizados; percentuais de status sobre o total."],
  ];

  const secoes: [string, LinhaResumo[], (g: LinhaResumo) => Celula][] = [
    ["Por dia", d.porDia, (g) => {
      const [a, m, dia] = g.chave.split("-");
      return `${dia}/${m}/${a}`;
    }],
    ["Por categoria", d.porCategoria, (g) => g.chave],
    ["Por técnico (responsável)", d.porTecnico, (g) => g.chave],
    ["Por turno", d.porTurno, (g) => g.chave],
  ];
  for (const [titulo, grupos, rotulo] of secoes) {
    linhas.push([], [titulo, ...CAB_TABELA]);
    for (const g of grupos) linhas.push(linhaTabela(g, rotulo(g)));
  }

  const aba = XLSX.utils.aoa_to_sheet(linhas);
  aba["!cols"] = [{ wch: 52 }, ...CAB_TABELA.map((h) => ({ wch: Math.max(11, h.length + 1) }))];
  return aba;
}

export function gerarPlanilha(d: DadosPlanilha): Buffer {
  const livro = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(livro, abaChamados(d.chamados), "Chamados");
  XLSX.utils.book_append_sheet(livro, abaResumo(d), "Resumo");
  return XLSX.write(livro, { type: "buffer", bookType: "xlsx", compression: true }) as Buffer;
}
