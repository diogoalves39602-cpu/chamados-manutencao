import type { Metadata } from "next";
import Link from "next/link";
import { BadgeCheck, ChevronLeft, ChevronRight, FileSpreadsheet, ListChecks, Search } from "lucide-react";
import { IconeCategoria } from "@/components/icone-categoria";
import { CabecalhoPagina, Cartao, Selo, Vazio } from "@/components/ui";
import { SELECT_CHAMADO } from "@/lib/chamados/consultas";
import { COR_STATUS, formatarDuracao, ROTULO_ORIGEM, ROTULO_SITUACAO, ROTULO_STATUS } from "@/lib/chamados/rotulos";
import type { ChamadoCompleto } from "@/lib/chamados/tipos";
import { formatarDataHora, resolverPeriodo, ROTULO_PERIODO, type ChavePeriodo } from "@/lib/datas";
import { criarClienteServidor } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Todos os chamados" };

const POR_PAGINA = 50;
const PERIODOS = ["todos", "hoje", "7d", "30d", "mes"] as const satisfies readonly ChavePeriodo[];
const STATUS = { todos: "Todos", aberto: "Abertos", em_andamento: "Em andamento", finalizado: "Finalizados", cancelado: "Cancelados" } as const;
const IDENTIFICACAO = { todos: "Todos", feishu: "Verificados pelo Feishu/Lark", nao: "Sem identificação" } as const;

type Params = Record<string, string | string[] | undefined>;
const ler = (p: Params, k: string) => (typeof p[k] === "string" ? (p[k] as string) : "");

function escolha<T extends string>(valor: string, opcoes: readonly T[], padrao: T): T {
  return (opcoes as readonly string[]).includes(valor) ? (valor as T) : padrao;
}

export default async function PaginaChamadosAdmin({ searchParams }: PageProps<"/admin/chamados">) {
  const p = await searchParams;
  const busca = ler(p, "q").replace(/[,()%*\\]/g, " ").trim().slice(0, 80);
  const status = escolha(ler(p, "status"), Object.keys(STATUS) as (keyof typeof STATUS)[], "todos");
  const periodo = escolha(ler(p, "periodo"), PERIODOS, "todos");
  const identificacao = escolha(ler(p, "id"), Object.keys(IDENTIFICACAO) as (keyof typeof IDENTIFICACAO)[], "todos");
  const pagina = Math.max(1, Number(ler(p, "pagina")) || 1);
  const intervalo = resolverPeriodo(periodo);

  const supabase = await criarClienteServidor();
  let q = supabase.from("chamados").select(SELECT_CHAMADO, { count: "exact" });
  if (status !== "todos") q = q.eq("status", status);
  if (periodo !== "todos") q = q.gte("aberto_em", intervalo.inicio.toISOString()).lt("aberto_em", intervalo.fim.toISOString());
  if (identificacao === "feishu") q = q.not("solicitante_externo_id", "is", null);
  if (identificacao === "nao") q = q.is("solicitante_externo_id", null);
  if (busca) {
    const termo = `%${busca}%`;
    q = q.or(
      ["numero", "solicitante_nome", "solicitante_setor", "solicitante_contato", "local", "descricao"]
        .map((campo) => `${campo}.ilike.${termo}`)
        .join(","),
    );
  }
  const { data, count, error } = await q
    .order("aberto_em", { ascending: false })
    .range((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA - 1);
  const chamados = (data ?? []) as unknown as ChamadoCompleto[];
  const total = count ?? 0;
  const paginas = Math.max(1, Math.ceil(total / POR_PAGINA));

  const params = (mudancas: Record<string, string | number>) => {
    const u = new URLSearchParams();
    const atual = { q: busca, status, periodo, id: identificacao, pagina: String(pagina), ...mudancas };
    for (const [k, v] of Object.entries(atual)) if (v && v !== "todos" && !(k === "pagina" && v === "1")) u.set(k, String(v));
    const s = u.toString();
    return s ? `?${s}` : "?";
  };
  const exportar = `/api/exportar?periodo=personalizado&de=${intervalo.de}&ate=${intervalo.ate}`;

  return (
    <div className="flex flex-col gap-5">
      <CabecalhoPagina
        icone={ListChecks}
        titulo="Todos os chamados"
        subtitulo="Histórico completo, com quem abriu, contato e identificação do Feishu. Toque em um chamado para ver tudo e enviar mensagem."
        acoes={
          <a
            href={exportar}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-emerald-700 px-4 text-sm font-semibold text-white shadow-sm hover:bg-emerald-800"
          >
            <FileSpreadsheet className="h-4 w-4" aria-hidden />
            Exportar Excel
          </a>
        }
      />

      <form method="get" className="grid gap-3 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr_auto] lg:items-end">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="q" className="text-sm font-medium text-stone-800">
            Buscar
          </label>
          <input
            id="q"
            name="q"
            defaultValue={busca}
            placeholder="Número, nome, setor, telefone, local…"
            className="min-h-11 rounded-xl border border-stone-300 px-3 text-base outline-none focus:border-marca-600 focus:ring-4 focus:ring-marca-100"
          />
        </div>
        {(
          [
            ["status", "Status", status, STATUS],
            ["periodo", "Período (abertura)", periodo, Object.fromEntries(PERIODOS.map((k) => [k, ROTULO_PERIODO[k]]))],
            ["id", "Identificação", identificacao, IDENTIFICACAO],
          ] as const
        ).map(([nome, rotulo, valor, opcoes]) => (
          <div key={nome} className="flex flex-col gap-1.5">
            <label htmlFor={`f-${nome}`} className="text-sm font-medium text-stone-800">
              {rotulo}
            </label>
            <select
              id={`f-${nome}`}
              name={nome}
              defaultValue={valor}
              className="min-h-11 rounded-xl border border-stone-300 bg-white px-3 text-base outline-none focus:border-marca-600 focus:ring-4 focus:ring-marca-100"
            >
              {Object.entries(opcoes).map(([k, r]) => (
                <option key={k} value={k}>
                  {r}
                </option>
              ))}
            </select>
          </div>
        ))}
        <button
          type="submit"
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-marca-700 px-4 text-sm font-semibold text-white hover:bg-marca-800"
        >
          <Search className="h-4 w-4" aria-hidden />
          Filtrar
        </button>
      </form>

      <p className="text-sm text-stone-600">
        {error ? `Erro ao carregar: ${error.message}` : `${total.toLocaleString("pt-BR")} chamado${total === 1 ? "" : "s"} encontrado${total === 1 ? "" : "s"}`}
      </p>

      {chamados.length === 0 ? (
        <Vazio icone={Search} titulo="Nenhum chamado encontrado">
          Ajuste a busca ou os filtros.
        </Vazio>
      ) : (
        <Cartao className="overflow-hidden p-0 sm:p-0">
          <ul className="divide-y divide-stone-100">
            {chamados.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/painel/${c.numero}`}
                  className="grid gap-3 px-4 py-4 transition-colors hover:bg-marca-50/40 sm:px-5 lg:grid-cols-[9rem_1.4fr_1.2fr_1fr_1fr] lg:items-center"
                >
                  <div className="flex items-center gap-3 lg:block">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-stone-100 text-stone-600 lg:hidden">
                      <IconeCategoria nome={c.categoria?.nome} className="h-5 w-5" />
                    </span>
                    <div>
                      <p className="font-mono text-sm font-bold text-marca-800">{c.numero}</p>
                      <p className="text-xs text-stone-500">{formatarDataHora(c.aberto_em)}</p>
                      <p className="text-xs text-stone-400">{ROTULO_ORIGEM[c.origem]}</p>
                    </div>
                  </div>

                  <div className="min-w-0">
                    <p className="flex items-center gap-1.5 font-semibold text-stone-900">
                      <span className="truncate">{c.solicitante_nome}</span>
                      {c.solicitante_externo_id ? (
                        <BadgeCheck className="h-4 w-4 shrink-0 text-emerald-600" aria-label="Verificado pelo Feishu" />
                      ) : null}
                    </p>
                    <p className="truncate text-sm text-stone-600">
                      {c.solicitante_setor} · {c.solicitante_contato}
                    </p>
                    {c.solicitante_externo_id ? (
                      <p className="truncate font-mono text-[11px] text-emerald-700" title={c.solicitante_externo_id}>
                        {c.solicitante_plataforma === "lark" ? "Lark" : "Feishu"} · {c.solicitante_externo_id}
                      </p>
                    ) : (
                      <p className="text-[11px] text-stone-400">Sem identificação do Feishu</p>
                    )}
                  </div>

                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-stone-900">{c.local}</p>
                    <p className="truncate text-sm text-stone-500">{c.categoria?.nome}</p>
                    <p className="line-clamp-1 text-xs text-stone-400">{c.descricao}</p>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 lg:flex-col lg:items-start">
                    <Selo className={COR_STATUS[c.status]}>{ROTULO_STATUS[c.status]}</Selo>
                    {c.situacao_prazo ? (
                      <Selo className={c.situacao_prazo === "dentro_do_prazo" ? "bg-emerald-100 text-emerald-800" : "bg-orange-100 text-orange-800"}>
                        {ROTULO_SITUACAO[c.situacao_prazo]}
                      </Selo>
                    ) : null}
                    {c.tempo_total_minutos != null ? (
                      <span className="text-xs text-stone-500">em {formatarDuracao(c.tempo_total_minutos)}</span>
                    ) : null}
                  </div>

                  <div className="text-sm text-stone-600">
                    <p className="text-xs text-stone-400">Responsável</p>
                    <p className="truncate">{c.recebido?.nome ?? "—"}</p>
                    {c.finalizado_em ? <p className="text-xs text-stone-500">Concluído {formatarDataHora(c.finalizado_em)}</p> : null}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </Cartao>
      )}

      {paginas > 1 ? (
        <nav className="flex items-center justify-between gap-2" aria-label="Paginação">
          {pagina > 1 ? (
            <Link href={params({ pagina: pagina - 1 })} className="inline-flex min-h-11 items-center gap-1 rounded-xl px-3 text-sm font-semibold text-marca-700 hover:bg-marca-50">
              <ChevronLeft className="h-4 w-4" aria-hidden />
              Anteriores
            </Link>
          ) : (
            <span />
          )}
          <span className="text-sm text-stone-500">
            Página {pagina} de {paginas}
          </span>
          {pagina < paginas ? (
            <Link href={params({ pagina: pagina + 1 })} className="inline-flex min-h-11 items-center gap-1 rounded-xl px-3 text-sm font-semibold text-marca-700 hover:bg-marca-50">
              Próximos
              <ChevronRight className="h-4 w-4" aria-hidden />
            </Link>
          ) : (
            <span />
          )}
        </nav>
      ) : null}
    </div>
  );
}
