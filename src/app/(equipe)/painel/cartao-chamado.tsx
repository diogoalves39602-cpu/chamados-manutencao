"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { enviarSemReset } from "@/components/envio";
import { Alerta, Botao } from "@/components/ui";
import { CLASSES_PRAZO, estadoPrazo } from "@/lib/chamados/prazo";
import type { ChamadoCompleto } from "@/lib/chamados/tipos";
import { COR_STATUS, formatarDuracao, ROTULO_STATUS } from "@/lib/chamados/rotulos";
import { formatarHora } from "@/lib/datas";
import { assumirChamado, finalizarChamado, type EstadoAcao } from "./actions";

export function CartaoChamado({
  chamado: c,
  agora,
  novo,
}: {
  chamado: ChamadoCompleto;
  agora: number;
  novo: boolean;
}) {
  const prazo = estadoPrazo(c, agora);
  const classes = CLASSES_PRAZO[prazo.cor];
  const ativo = c.status === "aberto" || c.status === "em_andamento";
  const decorrido = (c.finalizado_em ? new Date(c.finalizado_em).getTime() : agora) - new Date(c.aberto_em).getTime();

  return (
    <li
      className={`flex flex-col gap-3 rounded-xl border border-l-8 border-zinc-200 bg-white p-4 shadow-sm ${classes.borda} ${
        novo ? "animate-pulse ring-2 ring-blue-500" : ""
      }`}
    >
      <div className="flex flex-wrap items-start gap-2">
        <Link href={`/painel/${c.numero}`} className="min-w-0 flex-1">
          <p className="font-mono text-sm font-bold text-blue-800">{c.numero}</p>
          <p className="truncate text-base font-semibold text-zinc-900">{c.local}</p>
          <p className="text-sm text-zinc-600">
            {c.categoria?.nome} Â· {c.solicitante_nome} ({c.solicitante_setor})
          </p>
        </Link>
        <div className="flex flex-col items-end gap-1">
          <span className={`rounded-full px-2.5 py-1 font-mono text-sm font-bold tabular-nums ${classes.selo}`}>
            {prazo.texto}
          </span>
          <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${COR_STATUS[c.status]}`}>
            {ROTULO_STATUS[c.status]}
          </span>
        </div>
      </div>

      <p className="line-clamp-2 text-sm text-zinc-700">{c.descricao}</p>

      <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-zinc-600 sm:grid-cols-4">
        <div>
          <dt className="text-zinc-400">Aberto Ã s</dt>
          <dd>{formatarHora(c.aberto_em)}</dd>
        </div>
        <div>
          <dt className="text-zinc-400">Prazo</dt>
          <dd>{formatarHora(c.prazo_limite)}</dd>
        </div>
        <div>
          <dt className="text-zinc-400">Decorrido</dt>
          <dd>{formatarDuracao(decorrido / 60000)}</dd>
        </div>
        <div>
          <dt className="text-zinc-400">ResponsÃ¡vel</dt>
          <dd className="truncate">{c.recebido?.nome ?? "â€”"}</dd>
        </div>
      </dl>

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
    <div className="flex flex-col gap-2">
      {erro ? <Alerta>{erro}</Alerta> : null}
      <div className="flex flex-wrap gap-2">
        {c.status === "aberto" ? (
          <form action={assumir}>
            <input type="hidden" name="id" value={c.id} />
            <Botao type="submit" disabled={assumindo}>
              {assumindo ? "Assumindoâ€¦" : "Assumir"}
            </Botao>
          </form>
        ) : null}
        <Botao type="button" variante="secundario" onClick={() => setAbrirFinalizar((v) => !v)}>
          Finalizar
        </Botao>
        <Link
          href={`/painel/${c.numero}`}
          className="inline-flex min-h-11 items-center px-2 text-sm font-medium text-blue-700 hover:underline"
        >
          Detalhes
        </Link>
      </div>
      {abrirFinalizar ? (
        <form onSubmit={enviarSemReset(finalizar)} className="flex flex-col gap-2 rounded-lg border border-zinc-200 bg-zinc-50 p-3">
          <input type="hidden" name="id" value={c.id} />
          <label htmlFor={`obs-${c.id}`} className="text-sm font-medium">
            O que foi feito?
          </label>
          <textarea
            id={`obs-${c.id}`}
            name="observacao"
            rows={3}
            required
            minLength={3}
            maxLength={2000}
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-base outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-200"
          />
          <Botao type="submit" disabled={finalizando}>
            {finalizando ? "Finalizandoâ€¦" : "Confirmar finalizaÃ§Ã£o"}
          </Botao>
        </form>
      ) : null}
    </div>
  );
}
