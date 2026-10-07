// Cálculos puros dos indicadores (sem acesso a banco): usados no dashboard,
// no Excel e nos testes.

export type Grupo = {
  dimensao: "total" | "dia" | "categoria" | "tecnico" | "turno" | "origem" | "hora" | "setor";
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
  tempo_mediano_total?: number | null;
  tempo_mediano_assumir?: number | null;
  /** Setor: grafia mais usada (a chave vem em minúsculas). */
  rotulo?: string | null;
};

const CONTAGENS = ["total", "abertos", "em_andamento", "finalizados", "cancelados", "dentro", "fora", "atrasados"] as const;

/**
 * Mantém os `limite` maiores grupos e soma o resto em um só ("Outros…"), para listas
 * longas (ex.: setores digitados livremente). Tempos do grupo somado ficam sem valor.
 */
export function agruparResto(grupos: Grupo[], limite: number, rotulo: string): Grupo[] {
  if (grupos.length <= limite) return grupos;
  const resto = grupos.slice(limite - 1);
  const soma: Grupo = {
    ...resto[0], chave: rotulo, rotulo, tempo_medio_total: null, tempo_medio_assumir: null,
    tempo_mediano_total: null, tempo_mediano_assumir: null,
  };
  for (const k of CONTAGENS) soma[k] = resto.reduce((t, g) => t + g[k], 0);
  return [...grupos.slice(0, limite - 1), soma];
}

/** Percentual 0–100 (null quando não há base). */
export function pct(parte: number, base: number) {
  return base > 0 ? (parte / base) * 100 : null;
}

/** % dentro do prazo sobre os finalizados (indicador principal). */
export const pctDentro = (g: Grupo) => pct(g.dentro, g.finalizados);
export const pctFora = (g: Grupo) => pct(g.fora, g.finalizados);

/**
 * SLA projetado: considera também os chamados ainda abertos que já estouraram
 * (inevitavelmente fora do prazo). dentro / (finalizados + atrasados em aberto).
 */
export const slaProjetado = (g: Grupo) => pct(g.dentro, g.finalizados + g.atrasados);

export function formatarPct(v: number | null) {
  return v == null ? "—" : `${v.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
}
