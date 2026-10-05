import type { Metadata } from "next";
import { Suspense, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import {
  CircleCheck,
  FileSpreadsheet,
  Hand,
  Hourglass,
  Inbox,
  LayoutDashboard,
  ListChecks,
  Timer,
  TriangleAlert,
  Wrench,
  XCircle,
} from "lucide-react";
import { CabecalhoPagina, Cartao } from "@/components/ui";
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

      {/* Indicador principal */}
      <section className="fundo-marca grid gap-5 overflow-hidden rounded-2xl p-5 text-white shadow-lg shadow-marca-900/20 sm:grid-cols-[auto_1fr] sm:items-center sm:p-6">
        <div>
          <p className="text-sm font-medium text-marca-100">Finalizados dentro do prazo</p>
          <p className="text-6xl font-bold tracking-tight">{formatarPct(pctPrincipal)}</p>
          <p className="mt-1 text-sm text-marca-100">
            {t.dentro.toLocaleString("pt-BR")} de {t.finalizados.toLocaleString("pt-BR")} finalizados
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
              Fora do prazo <strong>{formatarPct(pctFora(t))}</strong> ({t.fora.toLocaleString("pt-BR")})
            </span>
          </div>
          <p className="border-t border-stone-100 pt-2 text-xs text-stone-500">
            SLA projetado (atrasados ainda em aberto contam como fora):{" "}
            <strong className="text-stone-800">{formatarPct(slaProjetado(t))}</strong>
          </p>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Bloco
          icone={TriangleAlert}
          rotulo="Atrasados agora"
          valor={ind.atrasadosAgora.toLocaleString("pt-BR")}
          detalhe="Fila atual com prazo estourado"
          alerta={ind.atrasadosAgora > 0}
        />
        <Bloco
          icone={ListChecks}
          rotulo="Abertos no período"
          valor={t.total.toLocaleString("pt-BR")}
          detalhe={t.cancelados ? `${t.cancelados} cancelados (fora do SLA)` : "Nenhum cancelado"}
        />
        <Bloco icone={Timer} rotulo="Tempo médio de atendimento" valor={formatarDuracao(t.tempo_medio_total)} detalhe="Abertura até finalização" />
        <Bloco icone={Hand} rotulo="Tempo médio até assumir" valor={formatarDuracao(t.tempo_medio_assumir)} detalhe="Abertura até alguém assumir" />
        <Bloco icone={Inbox} rotulo="Aguardando" valor={t.abertos.toLocaleString("pt-BR")} detalhe={`${formatarPct(pct(t.abertos, t.total))} do total`} />
        <Bloco icone={Wrench} rotulo="Em andamento" valor={t.em_andamento.toLocaleString("pt-BR")} detalhe={`${formatarPct(pct(t.em_andamento, t.total))} do total`} />
        <Bloco icone={CircleCheck} rotulo="Finalizados" valor={t.finalizados.toLocaleString("pt-BR")} detalhe={`${formatarPct(pct(t.finalizados, t.total))} do total`} />
        <Bloco
          icone={t.atrasados ? Hourglass : XCircle}
          rotulo="Ainda na fila"
          valor={ativos.toLocaleString("pt-BR")}
          detalhe={t.atrasados ? `${t.atrasados} já estouraram o prazo` : "Nenhum atrasado"}
        />
      </div>

      <Cartao>
        <TituloCartao icone={LayoutDashboard} titulo="Evolução diária" subtitulo="Chamados por dia de abertura" />
        <GraficoDiario dias={ind.porDia} />
      </Cartao>

      <div className="grid gap-4 lg:grid-cols-2">
        <Cartao>
          <TituloCartao icone={ListChecks} titulo="Por categoria" subtitulo="Barra = total · % no prazo e tempo médio ao lado" />
          <Ranking grupos={ind.porCategoria} />
        </Cartao>
        <Cartao>
          <TituloCartao icone={Hand} titulo="Por técnico (responsável)" subtitulo="Barra = total · % no prazo e tempo médio ao lado" />
          <Ranking grupos={ind.porTecnico} />
        </Cartao>
        <Cartao className="lg:col-span-2">
          <TituloCartao icone={Timer} titulo="Por turno" subtitulo="Pela hora de abertura (horário de Brasília)" />
          <Ranking grupos={ind.porTurno} />
        </Cartao>
      </div>

      <p className="text-xs text-stone-400">Atualizado em {formatarDataHora(new Date())}. Cancelados não entram no cálculo de SLA.</p>
    </div>
  );
}
