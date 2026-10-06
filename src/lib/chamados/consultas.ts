import "server-only";
import { resolverPeriodo, type ChavePeriodo } from "@/lib/datas";
import { criarClienteServidor } from "@/lib/supabase/server";
import type { ChamadoCompleto } from "./tipos";

export const SELECT_CHAMADO = `*,
  categoria:categorias(nome),
  recebido:perfis!chamados_recebido_por_fkey(nome),
  finalizador:perfis!chamados_finalizado_por_fkey(nome),
  cancelador:perfis!chamados_cancelado_por_fkey(nome)` as const;

export const FILTROS_STATUS = {
  ativos: "Na fila (abertos + em andamento)",
  aberto: "Abertos",
  em_andamento: "Em andamento",
  finalizado: "Finalizados",
  cancelado: "Reprovados",
  todos: "Todos",
} as const;

export const FILTROS_PRAZO = {
  todos: "Qualquer situação",
  atrasados: "Atrasados (prazo estourado)",
  no_prazo: "Na fila e dentro do prazo",
  dentro_do_prazo: "Finalizados dentro do prazo",
  fora_do_prazo: "Finalizados fora do prazo",
} as const;

export const PERIODOS_PAINEL = ["todos", "hoje", "7d", "30d"] as const satisfies readonly ChavePeriodo[];

export type FiltrosPainel = {
  status: keyof typeof FILTROS_STATUS;
  prazo: keyof typeof FILTROS_PRAZO;
  categoria?: number;
  tecnico?: string;
  periodo: (typeof PERIODOS_PAINEL)[number];
};

type Params = Record<string, string | string[] | undefined>;

function valor(p: Params, chave: string) {
  const v = p[chave];
  return typeof v === "string" ? v : undefined;
}

export function lerFiltros(p: Params): FiltrosPainel {
  const status = valor(p, "status");
  const prazo = valor(p, "prazo");
  const periodo = valor(p, "periodo");
  const categoria = Number(valor(p, "categoria"));
  const tecnico = valor(p, "tecnico");
  return {
    status: status && status in FILTROS_STATUS ? (status as FiltrosPainel["status"]) : "ativos",
    prazo: prazo && prazo in FILTROS_PRAZO ? (prazo as FiltrosPainel["prazo"]) : "todos",
    periodo: (PERIODOS_PAINEL as readonly string[]).includes(periodo ?? "") ? (periodo as FiltrosPainel["periodo"]) : "todos",
    categoria: Number.isInteger(categoria) && categoria > 0 ? categoria : undefined,
    tecnico: tecnico && /^[0-9a-f-]{36}$/i.test(tecnico) ? tecnico : undefined,
  };
}

const LIMITE = 300;

export async function listarChamados(f: FiltrosPainel, agora = new Date()) {
  const supabase = await criarClienteServidor();
  let q = supabase.from("chamados").select(SELECT_CHAMADO);

  if (f.status === "ativos") q = q.in("status", ["aberto", "em_andamento"]);
  else if (f.status !== "todos") q = q.eq("status", f.status);

  const agoraIso = agora.toISOString();
  if (f.prazo === "atrasados") q = q.in("status", ["aberto", "em_andamento"]).lt("prazo_limite", agoraIso);
  if (f.prazo === "no_prazo") q = q.in("status", ["aberto", "em_andamento"]).gte("prazo_limite", agoraIso);
  if (f.prazo === "dentro_do_prazo" || f.prazo === "fora_do_prazo") q = q.eq("situacao_prazo", f.prazo);

  if (f.categoria) q = q.eq("categoria_id", f.categoria);
  if (f.tecnico) q = q.eq("recebido_por", f.tecnico);
  if (f.periodo !== "todos") {
    const p = resolverPeriodo(f.periodo, undefined, undefined, agora);
    q = q.gte("aberto_em", p.inicio.toISOString()).lt("aberto_em", p.fim.toISOString());
  }

  // Fila: prazo mais próximo primeiro. Histórico: mais recentes primeiro.
  const somenteFila = f.status === "ativos" || f.status === "aberto" || f.status === "em_andamento";
  q = somenteFila ? q.order("prazo_limite", { ascending: true }) : q.order("aberto_em", { ascending: false });

  const { data, error } = await q.limit(LIMITE);
  if (error) throw new Error(error.message);
  return { chamados: data as unknown as ChamadoCompleto[], limitado: data.length === LIMITE };
}

export async function listarTecnicos() {
  const supabase = await criarClienteServidor();
  const { data } = await supabase.from("perfis").select("id, nome, ativo").order("nome");
  return data ?? [];
}

export async function listarCategorias() {
  const supabase = await criarClienteServidor();
  const { data } = await supabase.from("categorias").select("id, nome, ativo").order("ordem").order("nome");
  return data ?? [];
}
