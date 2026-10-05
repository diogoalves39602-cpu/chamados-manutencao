// Cálculos puros dos indicadores (sem acesso a banco): usados no dashboard,
// no Excel e nos testes.

export type Grupo = {
  dimensao: "total" | "dia" | "categoria" | "tecnico" | "turno";
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
