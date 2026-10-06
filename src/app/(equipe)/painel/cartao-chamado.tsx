"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { BadgeCheck, ChevronRight, CircleCheck, Clock, Hand, MapPin, User, UserCheck } from "lucide-react";
import { enviarSemReset } from "@/components/envio";
import { IconeCategoria } from "@/components/icone-categoria";
import { SeloPrazo } from "@/components/selo-prazo";
import { AreaTexto, Alerta, Botao, Selo } from "@/components/ui";
import { CLASSES_PRAZO, estadoPrazo } from "@/lib/chamados/prazo";
import type { ChamadoCompleto } from "@/lib/chamados/tipos";
import { COR_STATUS, formatarDuracao, ROTULO_STATUS } from "@/lib/chamados/rotulos";
import { formatarHora } from "@/lib/datas";
import { assumirChamado, finalizarChamado, type EstadoAcao } from "./actions";

export function CartaoChamado({
  chamado: c,
  agora,
  novo,
  meu,
}: {
  chamado: ChamadoCompleto;
  agora: number;
  novo: boolean;
  meu: boolean;
}) {
  const classes = CLASSES_PRAZO[estadoPrazo(c, agora).cor];
  const ativo = c.status === "aberto" || c.status === "em_andamento";
  const decorrido = (c.finalizado_em ? new Date(c.finalizado_em).getTime() : agora) - new Date(c.aberto_em).getTime();

  return (
    <li
      className={`flex flex-col gap-3 rounded-2xl border border-l-[6px] border-stone-200 p-4 shadow-sm transition-shadow hover:shadow-md ${classes.borda} ${classes.fundo} ${
        novo ? "animate-entrar ring-2 ring-marca-500 ring-offset-2" : ""
      }`}
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-stone-100 text-stone-600">
          <IconeCategoria nome={c.categoria?.nome} className="h-5 w-5" />
        </span>
        <Link href={`/painel/${c.numero}`} className="group min-w-0 flex-1">
          <p className="flex items-center gap-1.5 font-mono text-xs font-bold text-marca-700">
            {c.numero}
            {meu ? <Selo className="bg-marca-100 font-sans text-marca-800">Meu</Selo> : null}
          </p>
          <p className="flex items-center gap-1 text-base font-semibold text-stone-900 group-hover:underline">
            <MapPin className="h-4 w-4 shrink-0 text-stone-400" aria-hidden />
            <span className="truncate">{c.local}</span>
          </p>
          <p className="truncate text-sm text-stone-500">{c.categoria?.nome}</p>
        </Link>
        <SeloPrazo chamado={c} agora={agora} />
      </div>

      <p className="line-clamp-2 text-sm text-stone-700">{c.descricao}</p>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-stone-500">
        <span className="inline-flex items-center gap-1">
          <User className="h-3.5 w-3.5" aria-hidden />
          {c.solicitante_nome} · {c.solicitante_setor}
          {c.solicitante_externo_id ? (
            <BadgeCheck className="h-3.5 w-3.5 text-emerald-600" aria-label="Identificado pelo Feishu/Lark" />
          ) : null}
        </span>
        <span className="inline-flex items-center gap-1">
          <UserCheck className="h-3.5 w-3.5" aria-hidden />
          {c.recebido?.nome ?? "Ninguém assumiu"}
        </span>
        <span className="inline-flex items-center gap-1">
          <Clock className="h-3.5 w-3.5" aria-hidden />
          Aberto {formatarHora(c.aberto_em)} · prazo {formatarHora(c.prazo_limite)} · {formatarDuracao(decorrido / 60000)} decorridos
        </span>
        <span className={`ml-auto rounded-full px-2 py-0.5 font-semibold ${COR_STATUS[c.status]}`}>{ROTULO_STATUS[c.status]}</span>
      </div>

      {ativo ? <AcoesRapidas chamado={c} /> : null}
    </li>
  );
}

function AcoesRapidas({ chamado: c }: { chamado: ChamadoCompleto }) {
  const [estadoAssumir, assumir, assumindo] = useActionState(assumirChamado, {} as EstadoAcao);
  const [estadoFinalizar, finalizar, finalizando] = useActionState(finalizarChamado, {} as EstadoAcao);
  const [abrirFinalizar, setAbrirFinalizar] = useState(false);
  const erro = estadoAssumir.erro ?? estadoFinalizar.erro;

  return (
    <div className="flex flex-col gap-2 border-t border-stone-100 pt-3">
      {erro ? <Alerta>{erro}</Alerta> : null}
      <div className="flex flex-wrap gap-2">
        {c.status === "aberto" ? (
          <form action={assumir} className="flex-1 sm:flex-none">
            <input type="hidden" name="id" value={c.id} />
            <Botao type="submit" disabled={assumindo} icone={Hand} className="w-full">
              {assumindo ? "Assumindo…" : "Assumir"}
            </Botao>
          </form>
        ) : null}
        <Botao
          type="button"
          variante={c.status === "aberto" ? "secundario" : "primario"}
          icone={CircleCheck}
          className="flex-1 sm:flex-none"
          onClick={() => setAbrirFinalizar((v) => !v)}
          aria-expanded={abrirFinalizar}
        >
          Finalizar
        </Botao>
        <Link
          href={`/painel/${c.numero}`}
          className="ml-auto inline-flex min-h-11 items-center gap-1 rounded-xl px-3 text-sm font-semibold text-stone-600 hover:bg-stone-100"
        >
          Detalhes
          <ChevronRight className="h-4 w-4" aria-hidden />
        </Link>
      </div>
      {abrirFinalizar ? (
        <form onSubmit={enviarSemReset(finalizar)} className="flex animate-entrar flex-col gap-2 rounded-xl border border-stone-200 bg-stone-50 p-3">
          <input type="hidden" name="id" value={c.id} />
          <AreaTexto id={`obs-${c.id}`} name="observacao" rotulo="O que foi feito?" rows={3} required minLength={3} maxLength={2000} />
          <Botao type="submit" disabled={finalizando} icone={CircleCheck}>
            {finalizando ? "Finalizando…" : "Confirmar finalização"}
          </Botao>
        </form>
      ) : null}
    </div>
  );
}
