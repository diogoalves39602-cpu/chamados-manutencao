// Toda exibição e todo cálculo de data usam o fuso de São Paulo,
// independentemente do fuso do servidor (Vercel/Netlify rodam em UTC) ou do celular.
export const FUSO = "America/Sao_Paulo";

const formatoDataHora = new Intl.DateTimeFormat("pt-BR", {
  timeZone: FUSO,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const formatoData = new Intl.DateTimeFormat("pt-BR", { timeZone: FUSO, day: "2-digit", month: "2-digit", year: "numeric" });
const formatoHora = new Intl.DateTimeFormat("pt-BR", { timeZone: FUSO, hour: "2-digit", minute: "2-digit" });

function comoData(valor: string | Date) {
  return typeof valor === "string" ? new Date(valor) : valor;
}

/** dd/mm/aaaa hh:mm */
export function formatarDataHora(valor: string | Date | null | undefined) {
  if (!valor) return "—";
  return formatoDataHora.format(comoData(valor)).replace(",", "");
}

/** dd/mm/aaaa */
export function formatarData(valor: string | Date | null | undefined) {
  if (!valor) return "—";
  return formatoData.format(comoData(valor));
}

/** hh:mm */
export function formatarHora(valor: string | Date | null | undefined) {
  if (!valor) return "—";
  return formatoHora.format(comoData(valor));
}

// ---------------------------------------------------------------------------
// Dias "de calendário" em São Paulo
// ---------------------------------------------------------------------------

export type DiaSP = { ano: number; mes: number; dia: number };

const partes = new Intl.DateTimeFormat("en-CA", {
  timeZone: FUSO,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  timeZoneName: "longOffset",
});

/** Dia de calendário em São Paulo de um instante. */
export function diaSP(instante: Date): DiaSP {
  const p = Object.fromEntries(partes.formatToParts(instante).map((x) => [x.type, x.value]));
  return { ano: Number(p.year), mes: Number(p.month), dia: Number(p.day) };
}

/** Diferença de São Paulo para UTC em minutos naquele instante (ex.: -180). */
function offsetMinutos(instante: Date) {
  const nome = partes.formatToParts(instante).find((x) => x.type === "timeZoneName")?.value ?? "GMT";
  const m = nome.match(/GMT([+-])(\d{2}):?(\d{2})?/);
  if (!m) return 0;
  return (m[1] === "-" ? -1 : 1) * (Number(m[2]) * 60 + Number(m[3] ?? 0));
}

/** Instante UTC da meia-noite (00:00) de um dia em São Paulo. */
export function inicioDoDiaSP({ ano, mes, dia }: DiaSP): Date {
  const palpite = Date.UTC(ano, mes - 1, dia);
  return new Date(palpite - offsetMinutos(new Date(palpite)) * 60000);
}

export function somarDias({ ano, mes, dia }: DiaSP, n: number): DiaSP {
  const d = new Date(Date.UTC(ano, mes - 1, dia + n));
  return { ano: d.getUTCFullYear(), mes: d.getUTCMonth() + 1, dia: d.getUTCDate() };
}

/** "aaaa-mm-dd" */
export function diaParaIso({ ano, mes, dia }: DiaSP) {
  return `${ano}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
}

export function isoParaDia(iso: string): DiaSP | null {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const d = { ano: Number(m[1]), mes: Number(m[2]), dia: Number(m[3]) };
  return d.mes >= 1 && d.mes <= 12 && d.dia >= 1 && d.dia <= 31 ? d : null;
}

// ---------------------------------------------------------------------------
// Períodos de filtro (painel e dashboard). Intervalo [inicio, fim).
// ---------------------------------------------------------------------------

export type ChavePeriodo = "hoje" | "7d" | "30d" | "mes" | "personalizado" | "todos";

export const ROTULO_PERIODO: Record<ChavePeriodo, string> = {
  hoje: "Hoje",
  "7d": "Últimos 7 dias",
  "30d": "Últimos 30 dias",
  mes: "Este mês",
  personalizado: "Personalizado",
  todos: "Todo o período",
};

export type Periodo = { chave: ChavePeriodo; inicio: Date; fim: Date; de: string; ate: string };

/** Resolve o período. "de"/"ate" (aaaa-mm-dd, inclusivos) valem para "personalizado". */
export function resolverPeriodo(chave: ChavePeriodo, de?: string, ate?: string, agora = new Date()): Periodo {
  const hoje = diaSP(agora);
  let primeiro: DiaSP;
  let ultimo: DiaSP = hoje;

  switch (chave) {
    case "hoje":
      primeiro = hoje;
      break;
    case "7d":
      primeiro = somarDias(hoje, -6);
      break;
    case "30d":
      primeiro = somarDias(hoje, -29);
      break;
    case "mes":
      primeiro = { ...hoje, dia: 1 };
      break;
    case "personalizado": {
      const d1 = de ? isoParaDia(de) : null;
      const d2 = ate ? isoParaDia(ate) : null;
      primeiro = d1 ?? somarDias(hoje, -6);
      ultimo = d2 ?? hoje;
      if (diaParaIso(primeiro) > diaParaIso(ultimo)) [primeiro, ultimo] = [ultimo, primeiro];
      break;
    }
    case "todos":
      primeiro = { ano: 2000, mes: 1, dia: 1 };
      break;
  }
  return {
    chave,
    inicio: inicioDoDiaSP(primeiro),
    fim: inicioDoDiaSP(somarDias(ultimo, 1)),
    de: diaParaIso(primeiro),
    ate: diaParaIso(ultimo),
  };
}

/** Lista de dias (aaaa-mm-dd) do período, para preencher dias sem chamados nos gráficos. */
export function diasDoPeriodo(p: Periodo, maximo = 366): string[] {
  const dias: string[] = [];
  let d = isoParaDia(p.de)!;
  const ultimo = p.ate;
  while (diaParaIso(d) <= ultimo && dias.length < maximo) {
    dias.push(diaParaIso(d));
    d = somarDias(d, 1);
  }
  return dias;
}
