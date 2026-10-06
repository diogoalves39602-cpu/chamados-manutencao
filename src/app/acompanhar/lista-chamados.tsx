import { Ban, CircleCheck, Clock, Inbox, MapPin, UserCheck, Wrench } from "lucide-react";
import { Cartao, Selo } from "@/components/ui";
import { ROTULO_SITUACAO, ROTULO_STATUS, type SituacaoPrazo, type Status } from "@/lib/chamados/rotulos";
import { formatarDataHora } from "@/lib/datas";

// Lista de chamados do solicitante (login do Feishu ou busca por telefone/e-mail).
// Sem hooks: usada tanto no servidor quanto no cliente.

export type ChamadoSolicitante = {
  numero: string;
  status: Status;
  local: string;
  categoria: string;
  aberto_em: string;
  prazo_limite: string;
  recebido_em: string | null;
  finalizado_em: string | null;
  situacao_prazo: SituacaoPrazo | null;
  observacao_finalizacao: string | null;
};

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
      return `Em atendimento desde ${formatarDataHora(c.recebido_em)} · prazo ${formatarDataHora(c.prazo_limite)}`;
    case "finalizado":
      return `Concluído em ${formatarDataHora(c.finalizado_em)}${c.situacao_prazo ? ` · ${ROTULO_SITUACAO[c.situacao_prazo].toLowerCase()}` : ""}`;
    case "cancelado":
      return "Cancelado pela equipe de manutenção";
  }
}

function Item({ c, destaque }: { c: ChamadoSolicitante; destaque: boolean }) {
  const { cor, icone: Icone } = ESTILO[c.status];
  return (
    <Cartao className={`flex flex-col gap-2 p-4 sm:p-4 ${destaque ? "ring-2 ring-marca-500" : ""}`}>
      <div className="flex items-start gap-3">
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
      </div>
      {c.observacao_finalizacao ? (
        <div className="rounded-xl bg-emerald-50 p-3">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-emerald-800">
            <Wrench className="h-3.5 w-3.5" aria-hidden />O que foi feito
          </p>
          <p className="mt-1 whitespace-pre-wrap text-sm text-emerald-950">{c.observacao_finalizacao}</p>
        </div>
      ) : null}
    </Cartao>
  );
}

export function ListaChamados({ chamados, destacar }: { chamados: ChamadoSolicitante[]; destacar?: string }) {
  return (
    <ul className="flex animate-entrar flex-col gap-2">
      {chamados.map((c) => (
        <li key={c.numero}>
          <Item c={c} destaque={c.numero === destacar} />
        </li>
      ))}
    </ul>
  );
}
