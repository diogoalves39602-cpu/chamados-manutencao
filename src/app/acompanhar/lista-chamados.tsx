import { Ban, ChevronDown, CircleCheck, Clock, FileText, Inbox, MapPin, UserCheck, Wrench } from "lucide-react";
import { Selo } from "@/components/ui";
import { formatarDuracao, ROTULO_SITUACAO, ROTULO_STATUS, type Status } from "@/lib/chamados/rotulos";
import { formatarDataHora } from "@/lib/datas";
import type { ChamadoSolicitante } from "@/lib/solicitante/chamados";

// Lista de chamados do solicitante (login do Feishu ou busca por telefone/e-mail).
// Cada chamado abre ao tocar e mostra os detalhes. Sem hooks: usada no servidor e no cliente.

export type { ChamadoSolicitante };

const ESTILO: Record<Status, { cor: string; icone: typeof Inbox }> = {
  aberto: { cor: "bg-marca-100 text-marca-800", icone: Inbox },
  em_andamento: { cor: "bg-indigo-100 text-indigo-800", icone: UserCheck },
  finalizado: { cor: "bg-emerald-100 text-emerald-800", icone: CircleCheck },
  cancelado: { cor: "bg-stone-200 text-stone-700", icone: Ban },
};

function andamento(c: ChamadoSolicitante) {
  switch (c.status) {
    case "aberto":
      return `Aguardando um técnico · prazo ${formatarDataHora(c.prazo_limite)}`;
    case "em_andamento":
      return `${c.tecnico ?? "Um técnico"} está atendendo · prazo ${formatarDataHora(c.prazo_limite)}`;
    case "finalizado":
      return `Concluído em ${formatarDataHora(c.finalizado_em)}${c.situacao_prazo ? ` · ${ROTULO_SITUACAO[c.situacao_prazo].toLowerCase()}` : ""}`;
    case "cancelado":
      return "Cancelado pela equipe de manutenção";
  }
}

type Etapa = { titulo: string; quando: string | null; feito: boolean };

function etapas(c: ChamadoSolicitante): Etapa[] {
  const lista: Etapa[] = [{ titulo: "Chamado aberto", quando: c.aberto_em, feito: true }];
  if (c.status === "cancelado") {
    if (c.recebido_em) lista.push({ titulo: `Atendido por ${c.tecnico ?? "técnico"}`, quando: c.recebido_em, feito: true });
    lista.push({ titulo: "Cancelado", quando: c.cancelado_em, feito: true });
    return lista;
  }
  lista.push({
    titulo: c.recebido_em ? `Atendido por ${c.tecnico ?? "técnico"}` : "Aguardando um técnico",
    quando: c.recebido_em,
    feito: !!c.recebido_em,
  });
  lista.push({
    titulo: c.finalizado_em ? "Concluído" : `Prazo para conclusão: ${formatarDataHora(c.prazo_limite)}`,
    quando: c.finalizado_em,
    feito: !!c.finalizado_em,
  });
  return lista;
}

function Detalhes({ c }: { c: ChamadoSolicitante }) {
  return (
    <div className="flex flex-col gap-4 border-t border-stone-100 px-4 pb-4 pt-4">
      {c.status === "finalizado" && c.observacao_finalizacao ? (
        <div className="rounded-xl bg-emerald-50 p-3">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-emerald-800">
            <Wrench className="h-3.5 w-3.5" aria-hidden />O que foi feito
          </p>
          <p className="mt-1 whitespace-pre-wrap text-sm text-emerald-950">{c.observacao_finalizacao}</p>
          {c.tempo_total_minutos != null ? (
            <p className="mt-2 text-xs text-emerald-800">Resolvido em {formatarDuracao(c.tempo_total_minutos)} após a abertura.</p>
          ) : null}
        </div>
      ) : null}

      {c.status === "cancelado" && c.motivo_cancelamento ? (
        <div className="rounded-xl bg-stone-100 p-3">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-stone-700">
            <Ban className="h-3.5 w-3.5" aria-hidden />
            Por que foi cancelado
          </p>
          <p className="mt-1 whitespace-pre-wrap text-sm text-stone-900">{c.motivo_cancelamento}</p>
        </div>
      ) : null}

      <div>
        <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-stone-500">
          <FileText className="h-3.5 w-3.5" aria-hidden />
          Problema informado
        </p>
        <p className="mt-1 whitespace-pre-wrap text-sm text-stone-800">{c.descricao}</p>
        {c.foto_url ? (
          <a href={c.foto_url} target="_blank" rel="noreferrer" className="mt-3 block w-fit">
            {/* eslint-disable-next-line @next/next/no-img-element -- URL assinada temporária do Storage */}
            <img src={c.foto_url} alt="Foto enviada na abertura" className="max-h-56 rounded-xl border border-stone-200" />
          </a>
        ) : null}
      </div>

      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">Andamento</p>
        <ol className="mt-2 flex flex-col">
          {etapas(c).map((e, i, todas) => (
            <li key={e.titulo} className="relative flex gap-3 pb-3 last:pb-0">
              {i < todas.length - 1 ? (
                <span className={`absolute left-[5px] top-4 h-full w-0.5 ${e.feito ? "bg-marca-200" : "bg-stone-200"}`} aria-hidden />
              ) : null}
              <span
                className={`relative mt-1 h-3 w-3 shrink-0 rounded-full ${
                  e.feito ? (c.status === "cancelado" && i === todas.length - 1 ? "bg-stone-500" : "bg-marca-600") : "border-2 border-stone-300 bg-white"
                }`}
                aria-hidden
              />
              <div>
                <p className={`text-sm ${e.feito ? "font-medium text-stone-900" : "text-stone-500"}`}>{e.titulo}</p>
                {e.quando ? <p className="text-xs text-stone-500">{formatarDataHora(e.quando)}</p> : null}
              </div>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

function Item({ c, aberto, destaque }: { c: ChamadoSolicitante; aberto: boolean; destaque: boolean }) {
  const { cor, icone: Icone } = ESTILO[c.status];
  return (
    <details
      open={aberto}
      className={`group overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm ${destaque ? "ring-2 ring-marca-500" : ""}`}
    >
      <summary className="flex cursor-pointer list-none items-start gap-3 p-4 hover:bg-stone-50 [&::-webkit-details-marker]:hidden">
        <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${cor}`}>
          <Icone className="h-5 w-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-sm font-bold text-stone-900">{c.numero}</span>
            <Selo className={cor}>{ROTULO_STATUS[c.status]}</Selo>
          </div>
          <p className="mt-0.5 flex items-center gap-1 text-sm text-stone-700">
            <MapPin className="h-3.5 w-3.5 shrink-0 text-stone-400" aria-hidden />
            <span className="truncate">
              {c.local} · {c.categoria}
            </span>
          </p>
          <p className="mt-0.5 flex items-center gap-1 text-xs text-stone-500">
            <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden />
            Aberto em {formatarDataHora(c.aberto_em)}
          </p>
          <p className="mt-1 text-xs font-medium text-stone-700">{andamento(c)}</p>
        </div>
        <span className="mt-1 flex shrink-0 items-center gap-1 text-xs font-semibold text-marca-700">
          <span className="group-open:hidden">Detalhes</span>
          <span className="hidden group-open:inline">Fechar</span>
          <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" aria-hidden />
        </span>
      </summary>
      <Detalhes c={c} />
    </details>
  );
}

export function ListaChamados({ chamados, destacar }: { chamados: ChamadoSolicitante[]; destacar?: string }) {
  return (
    <div className="flex animate-entrar flex-col gap-2">
      <p className="px-1 text-sm text-stone-600">Toque em um chamado para ver os detalhes.</p>
      <ul className="flex flex-col gap-2">
        {chamados.map((c) => (
          <li key={c.numero}>
            <Item c={c} destaque={c.numero === destacar} aberto={c.numero === destacar || chamados.length === 1} />
          </li>
        ))}
      </ul>
    </div>
  );
}
