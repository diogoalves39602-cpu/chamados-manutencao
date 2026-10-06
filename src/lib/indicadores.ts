import "server-only";
import { diasDoPeriodo, resolverPeriodo, type ChavePeriodo, type Periodo } from "@/lib/datas";
import { criarClienteServidor } from "@/lib/supabase/server";
import type { Grupo } from "./indicadores-calculo";

export * from "./indicadores-calculo";

export const PERIODOS_DASHBOARD = ["hoje", "7d", "mes", "personalizado"] as const satisfies readonly ChavePeriodo[];

export type FiltrosDashboard = {
  periodo: Periodo;
  categoria?: number;
  tecnico?: string;
  turno?: string;
};

type Params = Record<string, string | string[] | undefined>;
const texto = (p: Params, k: string) => (typeof p[k] === "string" ? (p[k] as string) : undefined);

export function lerFiltrosDashboard(p: Params, agora = new Date()): FiltrosDashboard {
  const chave = texto(p, "periodo");
  const periodo = (PERIODOS_DASHBOARD as readonly string[]).includes(chave ?? "") ? (chave as ChavePeriodo) : "7d";
  const categoria = Number(texto(p, "categoria"));
  const tecnico = texto(p, "tecnico");
  const turno = texto(p, "turno")?.trim();
  return {
    periodo: resolverPeriodo(periodo, texto(p, "de"), texto(p, "ate"), agora),
    categoria: Number.isInteger(categoria) && categoria > 0 ? categoria : undefined,
    tecnico: tecnico && /^[0-9a-f-]{36}$/i.test(tecnico) ? tecnico : undefined,
    turno: turno && turno.length <= 40 ? turno : undefined,
  };
}

/** Querystring com os mesmos filtros (para o link de exportação). */
export function filtrosParaQuery(f: FiltrosDashboard) {
  const q = new URLSearchParams({ periodo: f.periodo.chave });
  if (f.periodo.chave === "personalizado") {
    q.set("de", f.periodo.de);
    q.set("ate", f.periodo.ate);
  }
  if (f.categoria) q.set("categoria", String(f.categoria));
  if (f.tecnico) q.set("tecnico", f.tecnico);
  if (f.turno) q.set("turno", f.turno);
  return q.toString();
}

const VAZIO = (dimensao: Grupo["dimensao"], chave: string): Grupo => ({
  dimensao, chave, total: 0, abertos: 0, em_andamento: 0, finalizados: 0, cancelados: 0,
  dentro: 0, fora: 0, atrasados: 0, tempo_medio_total: null, tempo_medio_assumir: null,
});

export type Indicadores = {
  total: Grupo;
  porDia: Grupo[];
  porCategoria: Grupo[];
  porTecnico: Grupo[];
  porTurno: Grupo[];
  atrasadosAgora: number;
};

export async function obterIndicadores(f: FiltrosDashboard): Promise<Indicadores> {
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase.rpc("indicadores", {
    p_inicio: f.periodo.inicio.toISOString(),
    p_fim: f.periodo.fim.toISOString(),
    p_categoria_id: f.categoria,
    p_tecnico_id: f.tecnico,
    p_turno: f.turno,
  });
  if (error) throw new Error(`indicadores: ${error.message}`);

  const resultado = data as { grupos: Grupo[]; atrasados_agora: number };
  const grupos = resultado.grupos.map((g) => ({
    ...g,
    tempo_medio_total: g.tempo_medio_total == null ? null : Number(g.tempo_medio_total),
    tempo_medio_assumir: g.tempo_medio_assumir == null ? null : Number(g.tempo_medio_assumir),
  }));
  const de = (d: Grupo["dimensao"]) => grupos.filter((g) => g.dimensao === d);
  const porTotal = (a: Grupo, b: Grupo) => b.total - a.total || a.chave.localeCompare(b.chave, "pt-BR");

  // Preenche os dias sem chamados para o gráfico não "pular" datas.
  const mapaDias = new Map(de("dia").map((g) => [g.chave, g]));
  const porDia = diasDoPeriodo(f.periodo).map((d) => mapaDias.get(d) ?? VAZIO("dia", d));

  return {
    total: de("total")[0] ?? VAZIO("total", "total"),
    porDia,
    porCategoria: de("categoria").sort(porTotal),
    porTecnico: de("tecnico").sort(porTotal),
    porTurno: de("turno").sort((a, b) => a.chave.localeCompare(b.chave, "pt-BR")),
    atrasadosAgora: Number(resultado.atrasados_agora),
  };
}

export type ChamadoCancelado = {
  numero: string;
  aberto_em: string;
  cancelado_em: string | null;
  local: string;
  solicitante_nome: string;
  motivo_cancelamento: string | null;
  categoria: { nome: string } | null;
  cancelador: { nome: string } | null;
};

/** Chamados cancelados no período, com os mesmos filtros dos indicadores. */
export async function listarCancelados(f: FiltrosDashboard, limite = 50) {
  const supabase = await criarClienteServidor();
  let q = supabase
    .from("chamados")
    .select(
      "numero, aberto_em, cancelado_em, local, solicitante_nome, motivo_cancelamento, categoria:categorias(nome), cancelador:perfis!chamados_cancelado_por_fkey(nome)",
    )
    .eq("status", "cancelado")
    .gte("aberto_em", f.periodo.inicio.toISOString())
    .lt("aberto_em", f.periodo.fim.toISOString());
  if (f.categoria) q = q.eq("categoria_id", f.categoria);
  if (f.tecnico) q = q.eq("recebido_por", f.tecnico);
  if (f.turno) q = q.eq("turno", f.turno);
  const { data, error } = await q.order("cancelado_em", { ascending: false }).limit(limite);
  if (error) throw new Error(`cancelados: ${error.message}`);
  return (data ?? []) as unknown as ChamadoCancelado[];
}
