"use client";

import { useActionState } from "react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { CircleCheck, Clock, Inbox, Search, UserCheck, Wrench } from "lucide-react";
import { enviarSemReset } from "@/components/envio";
import { Alerta, Botao, Campo, Cartao, Selo } from "@/components/ui";
import { ROTULO_SITUACAO, ROTULO_STATUS } from "@/lib/chamados/rotulos";
import { formatarDataHora } from "@/lib/datas";
import { consultarChamado, type EstadoConsulta, type ResultadoConsulta } from "./actions";

function Etapa({
  icone: Icone,
  titulo,
  detalhe,
  feito,
  ultima = false,
}: {
  icone: LucideIcon;
  titulo: string;
  detalhe?: string;
  feito: boolean;
  ultima?: boolean;
}) {
  return (
    <li className="relative flex gap-3 pb-5 last:pb-0">
      {!ultima ? (
        <span className={`absolute left-[17px] top-9 h-[calc(100%-2.25rem)] w-0.5 ${feito ? "bg-marca-300" : "bg-stone-200"}`} aria-hidden />
      ) : null}
      <span
        className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ${
          feito ? "bg-marca-700 text-white" : "border-2 border-stone-200 bg-white text-stone-300"
        }`}
      >
        <Icone className="h-4 w-4" aria-hidden />
      </span>
      <div className="pt-1.5">
        <p className={`text-sm font-semibold ${feito ? "text-stone-900" : "text-stone-400"}`}>{titulo}</p>
        {detalhe ? <p className="text-xs text-stone-500">{detalhe}</p> : null}
      </div>
    </li>
  );
}

function Resultado({ c }: { c: ResultadoConsulta }) {
  const cancelado = c.status === "cancelado";
  const finalizado = c.status === "finalizado";
  return (
    <Cartao className="flex animate-entrar flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-mono text-2xl font-bold text-stone-900">{c.numero}</p>
          <p className="text-sm text-stone-600">
            {c.categoria} · {c.local}
          </p>
        </div>
        <Selo className={cancelado ? "bg-stone-200 text-stone-700" : finalizado ? "bg-emerald-100 text-emerald-800" : "bg-marca-100 text-marca-800"}>
          {ROTULO_STATUS[c.status]}
        </Selo>
      </div>

      {cancelado ? (
        <Alerta tipo="aviso">Este chamado foi cancelado pela equipe de manutenção.</Alerta>
      ) : (
        <ol>
          <Etapa icone={Inbox} titulo="Chamado recebido" detalhe={formatarDataHora(c.aberto_em)} feito />
          <Etapa
            icone={UserCheck}
            titulo={c.recebido_em ? `Em atendimento${c.responsavel ? ` por ${c.responsavel}` : ""}` : "Aguardando um técnico"}
            detalhe={c.recebido_em ? formatarDataHora(c.recebido_em) : undefined}
            feito={Boolean(c.recebido_em)}
          />
          <Etapa
            icone={CircleCheck}
            titulo={finalizado ? "Concluído" : "Conclusão"}
            detalhe={
              finalizado
                ? `${formatarDataHora(c.finalizado_em)}${c.situacao_prazo ? ` · ${ROTULO_SITUACAO[c.situacao_prazo].toLowerCase()}` : ""}`
                : `Prazo: ${formatarDataHora(c.prazo_limite)}`
            }
            feito={finalizado}
            ultima
          />
        </ol>
      )}

      {c.observacao_finalizacao ? (
        <div className="rounded-xl bg-emerald-50 p-3">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-emerald-800">
            <Wrench className="h-3.5 w-3.5" aria-hidden />O que foi feito
          </p>
          <p className="mt-1 whitespace-pre-wrap text-sm text-emerald-950">{c.observacao_finalizacao}</p>
        </div>
      ) : null}

      {!finalizado && !cancelado ? (
        <p className="flex items-center gap-1.5 text-xs text-stone-500">
          <Clock className="h-3.5 w-3.5" aria-hidden />
          Prazo limite: {formatarDataHora(c.prazo_limite)}
        </p>
      ) : null}
    </Cartao>
  );
}

export function FormAcompanhar({ numeroInicial }: { numeroInicial: string }) {
  const [estado, acao, pendente] = useActionState(consultarChamado, {} as EstadoConsulta);

  return (
    <>
      <Cartao className="animate-entrar">
        <form onSubmit={enviarSemReset(acao)} className="flex flex-col gap-4">
          {estado.erro ? <Alerta>{estado.erro}</Alerta> : null}
          <div className="grid gap-4 sm:grid-cols-2">
            <Campo
              id="numero"
              name="numero"
              rotulo="Número do chamado"
              placeholder="CH-000123"
              defaultValue={numeroInicial}
              autoCapitalize="characters"
              required
              className="font-mono"
            />
            <Campo id="contato" name="contato" rotulo="Telefone ou e-mail informado" autoComplete="tel" required />
          </div>
          <Botao type="submit" disabled={pendente} icone={Search}>
            {pendente ? "Consultando…" : "Consultar"}
          </Botao>
        </form>
      </Cartao>
      {estado.chamado ? <Resultado c={estado.chamado} /> : null}
      <Link href="/abrir-chamado" className="mx-auto text-sm font-medium text-marca-700 hover:underline">
        Abrir um novo chamado
      </Link>
    </>
  );
}
