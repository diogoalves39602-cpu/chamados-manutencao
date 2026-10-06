import type { SituacaoPrazo, Status } from "./rotulos";

export type CorPrazo = "verde" | "amarelo" | "vermelho" | "neutro";

// O vermelho também é a cor da marca: por isso "atrasado" leva fundo, selo sólido,
// ícone de alerta e a palavra "Atrasado" (nunca depende só da cor).
export const CLASSES_PRAZO: Record<CorPrazo, { borda: string; selo: string; fundo: string }> = {
  verde: { borda: "border-l-emerald-500", selo: "bg-emerald-100 text-emerald-800", fundo: "bg-white" },
  amarelo: { borda: "border-l-amber-400", selo: "bg-amber-100 text-amber-900", fundo: "bg-white" },
  vermelho: { borda: "border-l-red-600", selo: "bg-red-600 text-white shadow-sm shadow-red-600/30", fundo: "bg-red-50/70" },
  neutro: { borda: "border-l-stone-300", selo: "bg-stone-100 text-stone-700", fundo: "bg-white" },
};

/** "01:05:09" ou "05:09" */
export function cronometro(ms: number) {
  const total = Math.floor(Math.abs(ms) / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mmss = `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return h > 0 ? `${String(h).padStart(2, "0")}:${mmss}` : mmss;
}

type ChamadoPrazo = { status: Status; prazo_limite: string; situacao_prazo: SituacaoPrazo | null };

/**
 * Regras de cor do painel:
 *   verde    → mais de 1h para o prazo
 *   amarelo  → menos de 1h
 *   vermelho → prazo estourado e ainda não finalizado
 */
export function estadoPrazo(c: ChamadoPrazo, agoraMs: number): { cor: CorPrazo; texto: string; restanteMs: number } {
  const restanteMs = new Date(c.prazo_limite).getTime() - agoraMs;

  if (c.status === "finalizado") {
    return c.situacao_prazo === "fora_do_prazo"
      ? { cor: "neutro", texto: "Finalizado fora do prazo", restanteMs }
      : { cor: "neutro", texto: "Finalizado no prazo", restanteMs };
  }
  if (c.status === "cancelado") return { cor: "neutro", texto: "Reprovado", restanteMs };

  if (restanteMs < 0) return { cor: "vermelho", texto: `Atrasado ${cronometro(restanteMs)}`, restanteMs };
  if (restanteMs < 60 * 60 * 1000) return { cor: "amarelo", texto: `Faltam ${cronometro(restanteMs)}`, restanteMs };
  return { cor: "verde", texto: `Faltam ${cronometro(restanteMs)}`, restanteMs };
}
