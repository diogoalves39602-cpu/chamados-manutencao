import type { Metadata } from "next";
import { Suspense, type ReactNode } from "react";
import { Cartao } from "@/components/ui";
import { exigirEquipe } from "@/lib/auth/sessao";
import { listarCategorias, listarTecnicos } from "@/lib/chamados/consultas";
import { formatarDuracao } from "@/lib/chamados/rotulos";
import { formatarData, formatarDataHora, ROTULO_PERIODO } from "@/lib/datas";
import {
  filtrosParaQuery,
  formatarPct,
  lerFiltrosDashboard,
  obterIndicadores,
  pct,
  pctDentro,
  pctFora,
  PERIODOS_DASHBOARD,
  slaProjetado,
} from "@/lib/indicadores";
import { criarClienteServidor } from "@/lib/supabase/server";
import { FiltrosDashboard } from "./filtros-dashboard";
import { COR, GraficoDiario, Ranking } from "./graficos";

export const metadata: Metadata = { title: "Indicadores" };

function Bloco({ rotulo, valor, detalhe, destaque }: { rotulo: string; valor: ReactNode; detalhe?: ReactNode; destaque?: "alerta" }) {
  return (
    <div className={`rounded-xl border bg-white p-4 ${destaque === "alerta" ? "border-red-300 bg-red-50" : "border-zinc-200"}`}>
      <p className="text-xs font-medium text-zinc-500">{rotulo}</p>
      <p className={`mt-1 text-2xl font-semibold ${destaque === "alerta" ? "text-red-700" : "text-zinc-900"}`}>{valor}</p>
      {detalhe ? <p className="mt-0.5 text-xs text-zinc-500">{detalhe}</p> : null}
    </div>
  );
}

export default async function Dashboard({ searchParams }: PageProps<"/dashboard">) {
  await exigirEquipe();
  const filtros = lerFiltrosDashboard(await searchParams);
  const supabase = await criarClienteServidor();
  const [ind, categorias, tecnicos, { data: turnos }] = await Promise.all([
    obterIndicadores(filtros),
    listarCategorias(),
    listarTecnicos(),
    supabase.from("turnos").select("nome").order("ordem"),
  ]);
  const t = ind.total;
  const ativos = t.abertos + t.em_andamento;
  const pctPrincipal = pctDentro(t);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-zinc-900">Indicadores de SLA</h1>
          <p className="text-sm text-zinc-600">
            {ROTULO_PERIODO[filtros.periodo.chave]} · {formatarData(filtros.periodo.inicio)} a{" "}
            {formatarData(new Date(filtros.periodo.fim.getTime() - 1))} (data de abertura)
          </p>
        </div>
        <a
          href={`/api/exportar?${filtrosParaQuery(filtros)}`}
          className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-green-700 px-4 text-sm font-semibold text-white hover:bg-green-800"
        >
          ⬇ Exportar Excel
        </a>
      </div>

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

      {/* Indicador principal */}
      <Cartao className="grid gap-4 sm:grid-cols-[auto_1fr] sm:items-center">
        <div>
          <p className="text-sm font-medium text-zinc-600">Finalizados dentro do prazo</p>
          <p className="text-6xl font-bold text-zinc-900">{formatarPct(pctPrincipal)}</p>
          <p className="mt-1 text-sm text-zinc-600">
            {t.dentro.toLocaleString("pt-BR")} de {t.finalizados.toLocaleString("pt-BR")} finalizados
          </p>
        </div>
        <div className="flex flex-col gap-2">
          <div className="flex h-4 w-full gap-[2px] overflow-hidden rounded" role="img" aria-label={`${formatarPct(pctPrincipal)} no prazo, ${formatarPct(pctFora(t))} fora do prazo`}>
            {t.dentro > 0 ? <div style={{ flexGrow: t.dentro, background: COR.dentro }} /> : null}
            {t.fora > 0 ? <div style={{ flexGrow: t.fora, background: COR.fora }} /> : null}
            {t.finalizados === 0 ? <div className="flex-1 bg-zinc-200" /> : null}
          </div>
          <div className="flex flex-wrap justify-between gap-2 text-sm">
            <span className="inline-flex items-center gap-1.5 text-zinc-700">
              <span className="h-2.5 w-2.5 rounded-sm" style={{ background: COR.dentro }} aria-hidden />
              No prazo {formatarPct(pctPrincipal)}
            </span>
            <span className="inline-flex items-center gap-1.5 text-zinc-700">
              <span className="h-2.5 w-2.5 rounded-sm" style={{ background: COR.fora }} aria-hidden />
              Fora do prazo {formatarPct(pctFora(t))} ({t.fora.toLocaleString("pt-BR")})
            </span>
          </div>
          <p className="text-xs text-zinc-500">
            SLA projetado (contando os atrasados ainda em aberto como fora do prazo):{" "}
            <strong className="text-zinc-800">{formatarPct(slaProjetado(t))}</strong>
          </p>
        </div>
      </Cartao>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Bloco
          rotulo="Atrasados agora"
          valor={ind.atrasadosAgora.toLocaleString("pt-BR")}
          detalhe="Na fila com prazo estourado (independe do período)"
          destaque={ind.atrasadosAgora > 0 ? "alerta" : undefined}
        />
        <Bloco rotulo="Chamados abertos no período" valor={t.total.toLocaleString("pt-BR")} detalhe={t.cancelados ? `${t.cancelados} cancelados (fora do SLA)` : undefined} />
        <Bloco rotulo="Tempo médio de atendimento" valor={formatarDuracao(t.tempo_medio_total)} detalhe="Abertura até finalização" />
        <Bloco rotulo="Tempo médio até assumir" valor={formatarDuracao(t.tempo_medio_assumir)} detalhe="Abertura até alguém assumir" />
        <Bloco rotulo="Em aberto" valor={t.abertos.toLocaleString("pt-BR")} detalhe={`${formatarPct(pct(t.abertos, t.total))} do total`} />
        <Bloco rotulo="Em andamento" valor={t.em_andamento.toLocaleString("pt-BR")} detalhe={`${formatarPct(pct(t.em_andamento, t.total))} do total`} />
        <Bloco rotulo="Finalizados" valor={t.finalizados.toLocaleString("pt-BR")} detalhe={`${formatarPct(pct(t.finalizados, t.total))} do total`} />
        <Bloco
          rotulo="Ainda na fila"
          valor={ativos.toLocaleString("pt-BR")}
          detalhe={t.atrasados ? `${t.atrasados} já estouraram o prazo` : "Nenhum atrasado"}
        />
      </div>

      <Cartao>
        <h2 className="mb-3 font-semibold">Evolução diária</h2>
        <GraficoDiario dias={ind.porDia} />
      </Cartao>

      <div className="grid gap-4 lg:grid-cols-2">
        <Cartao>
          <h2 className="font-semibold">Chamados por categoria</h2>
          <p className="mb-3 text-xs text-zinc-500">Barra = total de chamados · % no prazo e tempo médio ao lado</p>
          <Ranking grupos={ind.porCategoria} />
        </Cartao>
        <Cartao>
          <h2 className="font-semibold">Chamados por técnico (responsável)</h2>
          <p className="mb-3 text-xs text-zinc-500">Barra = total de chamados · % no prazo e tempo médio ao lado</p>
          <Ranking grupos={ind.porTecnico} />
        </Cartao>
        <Cartao className="lg:col-span-2">
          <h2 className="font-semibold">Chamados por turno</h2>
          <p className="mb-3 text-xs text-zinc-500">Turno calculado pela hora de abertura (horário de Brasília)</p>
          <Ranking grupos={ind.porTurno} />
        </Cartao>
      </div>

      <p className="text-xs text-zinc-400">Atualizado em {formatarDataHora(new Date())}. Cancelados não entram no cálculo de SLA.</p>
    </div>
  );
}
