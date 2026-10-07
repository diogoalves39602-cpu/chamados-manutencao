import type { Metadata } from "next";
import { Suspense, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import {
  Ban,
  Building2,
  Clock,
  FileSpreadsheet,
  Hand,
  Inbox,
  LayoutDashboard,
  ListChecks,
  Sun,
  Tag,
  Timer,
  TriangleAlert,
  Users,
} from "lucide-react";
import { CabecalhoPagina, Cartao } from "@/components/ui";
import { exigirAdmin } from "@/lib/auth/sessao";
import { listarCategorias, listarTecnicos } from "@/lib/chamados/consultas";
import { formatarDuracao, ROTULO_ORIGEM } from "@/lib/chamados/rotulos";
import { formatarData, formatarDataHora, ROTULO_PERIODO } from "@/lib/datas";
import {
  filtrosParaQuery,
  formatarPct,
  agruparResto,
  lerFiltrosDashboard,
  listarAtrasadosAgora,
  listarCancelados,
  obterIndicadores,
  pct,
  pctDentro,
  pctFora,
  PERIODOS_DASHBOARD,
  slaProjetado,
} from "@/lib/indicadores";
import { criarClienteServidor } from "@/lib/supabase/server";
import { FiltrosDashboard } from "./filtros-dashboard";
import { Composicao, COR, GraficoDiario, GraficoHoras, Legenda, SERIES } from "./graficos";

export const metadata: Metadata = { title: "Indicadores" };

function Bloco({
  icone: Icone,
  rotulo,
  valor,
  detalhe,
  alerta,
}: {
  icone: LucideIcon;
  rotulo: string;
  valor: ReactNode;
  detalhe?: ReactNode;
  alerta?: boolean;
}) {
  return (
    <div
      className={`flex flex-col gap-2 rounded-2xl border p-4 shadow-sm ${
        alerta ? "border-red-600 bg-red-600 text-white shadow-red-600/25" : "border-stone-200/80 bg-white"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <p className={`text-xs font-semibold ${alerta ? "text-red-50" : "text-stone-500"}`}>{rotulo}</p>
        <span className={`grid h-8 w-8 place-items-center rounded-lg ${alerta ? "bg-white/20" : "bg-stone-100 text-stone-500"}`}>
          <Icone className="h-4 w-4" aria-hidden />
        </span>
      </div>
      <p className={`text-3xl font-bold tracking-tight ${alerta ? "text-white" : "text-stone-900"}`}>{valor}</p>
      {detalhe ? <p className={`text-xs ${alerta ? "text-red-50" : "text-stone-500"}`}>{detalhe}</p> : null}
    </div>
  );
}

const num = (n: number) => n.toLocaleString("pt-BR");

function TituloSecao({ children }: { children: ReactNode }) {
  return <h2 className="-mb-1 mt-2 text-xs font-bold uppercase tracking-wider text-stone-500">{children}</h2>;
}

function TituloCartao({ icone: Icone, titulo, subtitulo }: { icone: LucideIcon; titulo: string; subtitulo?: string }) {
  return (
    <div className="mb-4 flex items-start gap-2.5">
      <Icone className="mt-0.5 h-5 w-5 text-marca-700" aria-hidden />
      <div>
        <h2 className="font-semibold text-stone-900">{titulo}</h2>
        {subtitulo ? <p className="text-xs text-stone-500">{subtitulo}</p> : null}
      </div>
    </div>
  );
}

export default async function Dashboard({ searchParams }: PageProps<"/dashboard">) {
  await exigirAdmin(); // Indicadores: só administradores (técnico volta para o Painel)
  const filtros = lerFiltrosDashboard(await searchParams);
  const supabase = await criarClienteServidor();
  const [ind, cancelados, atrasados, categorias, tecnicos, { data: turnos }] = await Promise.all([
    obterIndicadores(filtros),
    listarCancelados(filtros),
    listarAtrasadosAgora(filtros),
    listarCategorias(),
    listarTecnicos(),
    supabase.from("turnos").select("nome").order("ordem"),
  ]);
  const t = ind.total;
  const ativos = t.abertos + t.em_andamento;
  const pctPrincipal = pctDentro(t);
  const agora = new Date().getTime(); // Server Component: renderiza uma vez por requisição

  return (
    <div className="flex flex-col gap-5">
      <CabecalhoPagina
        icone={LayoutDashboard}
        titulo="Indicadores de SLA"
        subtitulo={`${ROTULO_PERIODO[filtros.periodo.chave]} · ${formatarData(filtros.periodo.inicio)} a ${formatarData(
          new Date(filtros.periodo.fim.getTime() - 1),
        )} (data de abertura)`}
        acoes={
          <a
            href={`/api/exportar?${filtrosParaQuery(filtros)}`}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-emerald-700 px-4 text-sm font-semibold text-white shadow-sm hover:bg-emerald-800"
          >
            <FileSpreadsheet className="h-4 w-4" aria-hidden />
            Exportar Excel
          </a>
        }
      />

      <Suspense>
        <FiltrosDashboard
          periodos={PERIODOS_DASHBOARD.map((p) => ({ valor: p, rotulo: ROTULO_PERIODO[p] }))}
          categorias={categorias.map((c) => ({ valor: String(c.id), rotulo: c.nome }))}
          tecnicos={tecnicos.map((p) => ({ valor: p.id, rotulo: p.ativo ? p.nome : `${p.nome} (inativo)` }))}
          turnos={(turnos ?? []).map((x) => ({ valor: x.nome, rotulo: x.nome }))}
          de={filtros.periodo.de}
          ate={filtros.periodo.ate}
        />
      </Suspense>

      {/* ── Visão geral ─────────────────────────────────────────── */}
      <TituloSecao>Visão geral do período</TituloSecao>

      {/* Indicador principal */}
      <section className="fundo-marca grid gap-5 overflow-hidden rounded-2xl p-5 text-white shadow-lg shadow-marca-900/20 sm:grid-cols-[auto_1fr] sm:items-center sm:p-6">
        <div>
          <p className="text-sm font-medium text-marca-100">Finalizados dentro do prazo</p>
          <p className="text-6xl font-bold tracking-tight">{formatarPct(pctPrincipal)}</p>
          <p className="mt-1 text-sm text-marca-100">
            {num(t.dentro)} de {num(t.finalizados)} finalizados
          </p>
        </div>
        <div className="flex flex-col gap-2.5 rounded-xl bg-white p-4 text-stone-800">
          <div
            className="flex h-4 w-full gap-[2px] overflow-hidden rounded-full"
            role="img"
            aria-label={`${formatarPct(pctPrincipal)} no prazo, ${formatarPct(pctFora(t))} fora do prazo`}
          >
            {t.dentro > 0 ? <div style={{ flexGrow: t.dentro, background: COR.dentro }} /> : null}
            {t.fora > 0 ? <div style={{ flexGrow: t.fora, background: COR.fora }} /> : null}
            {t.finalizados === 0 ? <div className="flex-1 bg-stone-200" /> : null}
          </div>
          <div className="flex flex-wrap justify-between gap-2 text-sm">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm" style={{ background: COR.dentro }} aria-hidden />
              No prazo <strong>{formatarPct(pctPrincipal)}</strong>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm" style={{ background: COR.fora }} aria-hidden />
              Fora do prazo <strong>{formatarPct(pctFora(t))}</strong> ({num(t.fora)})
            </span>
          </div>
          <p className="border-t border-stone-100 pt-2 text-xs text-stone-500">
            SLA projetado (atrasados ainda em aberto contam como fora):{" "}
            <strong className="text-stone-800">{formatarPct(slaProjetado(t))}</strong>
          </p>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <a href="#atrasados" className="rounded-2xl focus-visible:outline-2 focus-visible:outline-marca-600 [&>div]:h-full">
          <Bloco
            icone={TriangleAlert}
            rotulo="Atrasados agora"
            valor={num(ind.atrasadosAgora)}
            detalhe={ind.atrasadosAgora ? "Fila atual com prazo estourado · ver lista" : "Nenhum chamado atrasado"}
            alerta={ind.atrasadosAgora > 0}
          />
        </a>
        <Bloco icone={ListChecks} rotulo="Abertos no período" valor={num(t.total)} detalhe={`${num(ativos)} ainda na fila`} />
        <Bloco
          icone={Timer}
          rotulo="Tempo de atendimento"
          valor={formatarDuracao(t.tempo_medio_total)}
          detalhe={`Média · mediana ${formatarDuracao(t.tempo_mediano_total)} (abertura até finalizar)`}
        />
        <Bloco
          icone={Hand}
          rotulo="Tempo até assumir"
          valor={formatarDuracao(t.tempo_medio_assumir)}
          detalhe={`Média · mediana ${formatarDuracao(t.tempo_mediano_assumir)}`}
        />
      </div>

      {/* Situação de todos os chamados do período, nas mesmas cores dos gráficos */}
      <Cartao className="flex flex-col gap-4">
        <TituloCartao icone={Inbox} titulo="Situação dos chamados" subtitulo={`${num(t.total)} chamados abertos no período, pelo status atual`} />
        <div
          className="flex h-5 w-full gap-[2px] overflow-hidden rounded-full bg-stone-100"
          role="img"
          aria-label={SERIES.map((s) => `${s.valor(t)} ${s.rotulo.toLowerCase()}`).join(", ")}
        >
          {SERIES.map((s) => (s.valor(t) > 0 ? <div key={s.chave} style={{ flexGrow: s.valor(t), background: s.cor }} /> : null))}
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {SERIES.map((s) => {
            const conteudo = (
              <>
                <p className="flex items-center gap-1.5 text-xs font-semibold text-stone-600">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: s.cor }} aria-hidden />
                  {s.rotulo}
                </p>
                <p className="mt-1 text-2xl font-bold tabular-nums text-stone-900">{num(s.valor(t))}</p>
                <p className="text-xs text-stone-500">{formatarPct(pct(s.valor(t), t.total))} do total</p>
              </>
            );
            const destino = s.chave === "reprovados" ? "#reprovados" : s.chave === "atrasados" ? "#atrasados" : null;
            return destino ? (
              <a key={s.chave} href={destino} className="rounded-xl border border-stone-200 p-3 hover:border-stone-300 hover:bg-stone-50">
                {conteudo}
              </a>
            ) : (
              <div key={s.chave} className="rounded-xl border border-stone-200 p-3">
                {conteudo}
              </div>
            );
          })}
        </div>
      </Cartao>

      {/* Atrasados agora: o que precisa de ação já */}
      <Cartao id="atrasados" className="scroll-mt-20">
        <TituloCartao
          icone={TriangleAlert}
          titulo="Atrasados agora"
          subtitulo="Fila atual com prazo estourado (independe do período), do mais atrasado para o menos"
        />
        {atrasados.length === 0 ? (
          <p className="text-sm text-stone-500">Nenhum chamado atrasado.</p>
        ) : (
          <ul className="-mx-2 divide-y divide-stone-100">
            {atrasados.map((c) => (
              <li key={c.numero}>
                <Link
                  href={`/painel/${c.numero}`}
                  className="grid gap-1 rounded-xl px-2 py-3 hover:bg-stone-50 sm:grid-cols-[8rem_1fr_11rem] sm:items-center sm:gap-4"
                >
                  <p className="font-mono text-sm font-bold text-marca-800">{c.numero}</p>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-stone-900">{c.local}</p>
                    <p className="truncate text-xs text-stone-500">
                      {c.categoria?.nome ?? "—"} · {c.recebido?.nome ? `com ${c.recebido.nome}` : "ninguém assumiu"}
                    </p>
                  </div>
                  <p className="inline-flex items-center gap-1 text-sm font-semibold text-red-700 sm:justify-end">
                    <TriangleAlert className="h-4 w-4" aria-hidden />
                    atrasado há {formatarDuracao((agora - new Date(c.prazo_limite).getTime()) / 60000)}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Cartao>

      {/* ── Ao longo do tempo ───────────────────────────────────── */}
      <TituloSecao>Ao longo do tempo</TituloSecao>
      <Cartao>
        <TituloCartao icone={LayoutDashboard} titulo="Evolução diária" subtitulo="Chamados por dia de abertura, com o status atual de cada um" />
        <GraficoDiario dias={ind.porDia} />
      </Cartao>
      <Cartao>
        <TituloCartao icone={Clock} titulo="Por hora do dia" subtitulo="Hora de abertura (horário de Brasília): ajuda a dimensionar os turnos" />
        <GraficoHoras horas={ind.porHora} />
      </Cartao>

      {/* ── Onde estão os chamados ──────────────────────────────── */}
      <TituloSecao>Onde estão os chamados</TituloSecao>
      <Legenda />
      <div className="grid gap-4 lg:grid-cols-2">
        <Cartao>
          <TituloCartao icone={Tag} titulo="Por categoria" subtitulo="Comprimento = total · cores = status · % no prazo e tempo médio ao lado" />
          <Composicao grupos={ind.porCategoria} />
        </Cartao>
        <Cartao>
          <TituloCartao icone={Building2} titulo="Por setor de quem abriu" subtitulo="Os 8 setores com mais chamados (o resto em “Outros setores”)" />
          <Composicao grupos={agruparResto(ind.porSetor, 8, "Outros setores")} />
        </Cartao>
        <Cartao>
          <TituloCartao icone={Inbox} titulo="Por origem" subtitulo="Por onde o chamado chegou" />
          <Composicao grupos={ind.porOrigem} rotulo={(g) => ROTULO_ORIGEM[g.chave as keyof typeof ROTULO_ORIGEM] ?? g.chave} />
        </Cartao>
        <Cartao>
          <TituloCartao icone={Sun} titulo="Por turno" subtitulo="Pela hora de abertura" />
          <Composicao grupos={ind.porTurno} />
        </Cartao>
      </div>

      {/* ── Equipe ──────────────────────────────────────────────── */}
      <TituloSecao>Equipe</TituloSecao>
      <Cartao>
        <TituloCartao icone={Users} titulo="Por técnico (responsável)" subtitulo="Quem assumiu · % no prazo e tempo médio de atendimento ao lado" />
        <Composicao grupos={ind.porTecnico} />
      </Cartao>

      {/* ── Reprovados ──────────────────────────────────────────── */}
      <Cartao id="reprovados" className="scroll-mt-20">
        <TituloCartao
          icone={Ban}
          titulo="Chamados reprovados no período"
          subtitulo="Com o motivo informado por quem reprovou · não entram no cálculo de SLA"
        />
        {cancelados.length === 0 ? (
          <p className="text-sm text-stone-500">Nenhum chamado reprovado com estes filtros.</p>
        ) : (
          <ul className="-mx-2 divide-y divide-stone-100">
            {cancelados.map((c) => (
              <li key={c.numero}>
                <Link
                  href={`/painel/${c.numero}`}
                  className="grid gap-1 rounded-xl px-2 py-3 hover:bg-stone-50 sm:grid-cols-[8rem_1fr_12rem] sm:items-start sm:gap-4"
                >
                  <div>
                    <p className="font-mono text-sm font-bold text-marca-800">{c.numero}</p>
                    <p className="text-xs text-stone-500">Aberto {formatarDataHora(c.aberto_em)}</p>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm text-stone-900">
                      <span className="font-semibold">Motivo:</span> {c.motivo_cancelamento ?? "—"}
                    </p>
                    <p className="truncate text-xs text-stone-500">
                      {c.solicitante_nome} · {c.local} · {c.categoria?.nome ?? "—"}
                    </p>
                  </div>
                  <div className="text-xs text-stone-500 sm:text-right">
                    <p>Reprovado {formatarDataHora(c.cancelado_em)}</p>
                    <p>por {c.cancelador?.nome ?? "—"}</p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Cartao>

      <p className="text-xs text-stone-400">
        Atualizado em {formatarDataHora(new Date(agora))}. Período pela data de abertura; percentuais de prazo sobre os
        finalizados. Reprovados não entram no cálculo de SLA. Mediana: metade dos chamados levou menos que esse tempo.
      </p>
    </div>
  );
}
