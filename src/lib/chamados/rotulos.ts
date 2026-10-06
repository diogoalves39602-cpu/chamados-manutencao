import type { Enums } from "@/lib/supabase/database.types";

export type Status = Enums<"status_chamado">;
export type SituacaoPrazo = Enums<"situacao_prazo">;
export type Origem = Enums<"origem_chamado">;

export const ROTULO_STATUS: Record<Status, string> = {
  aberto: "Aberto",
  em_andamento: "Em andamento",
  finalizado: "Finalizado",
  cancelado: "Reprovado",
};

export const COR_STATUS: Record<Status, string> = {
  aberto: "bg-sky-100 text-sky-800",
  em_andamento: "bg-indigo-100 text-indigo-800",
  finalizado: "bg-stone-100 text-stone-700",
  cancelado: "bg-stone-100 text-stone-500",
};

export const ROTULO_SITUACAO: Record<SituacaoPrazo, string> = {
  dentro_do_prazo: "Dentro do prazo",
  fora_do_prazo: "Fora do prazo",
};

export const ROTULO_ORIGEM: Record<Origem, string> = {
  formulario: "Formulário",
  feishu: "Feishu",
  lark: "Lark",
  api: "API",
};

/** SLA por extenso: 120 → "2 horas", 90 → "90 minutos". */
export function descreverSla(minutos: number) {
  if (minutos % 60 !== 0) return `${minutos} minutos`;
  return minutos === 60 ? "1 hora" : `${minutos / 60} horas`;
}

/** "1h 05min", "45min", "2d 3h" */
export function formatarDuracao(minutos: number | null | undefined) {
  if (minutos == null || Number.isNaN(minutos)) return "—";
  const m = Math.round(Math.abs(minutos));
  if (m < 60) return `${m}min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ${String(m % 60).padStart(2, "0")}min`;
  return `${Math.floor(h / 24)}d ${h % 24}h`;
}
