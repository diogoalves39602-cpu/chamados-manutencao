"use client";

import { useActionState } from "react";
import { enviarSemReset } from "@/components/envio";
import { Alerta, Botao, Cartao, Selecao } from "@/components/ui";
import type { Status } from "@/lib/chamados/rotulos";
import {
  assumirChamado,
  cancelarChamado,
  finalizarChamado,
  reatribuirChamado,
  type EstadoAcao,
} from "../actions";

const classeTexto =
  "rounded-lg border border-zinc-300 bg-white px-3 py-2 text-base outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-200";

export function AcoesDetalhe({
  chamadoId,
  status,
  ehAdmin,
  tecnicos,
}: {
  chamadoId: string;
  status: Status;
  ehAdmin: boolean;
  tecnicos: { id: string; nome: string }[];
}) {
  const [eAssumir, assumir, assumindo] = useActionState(assumirChamado, {} as EstadoAcao);
  const [eFinalizar, finalizar, finalizando] = useActionState(finalizarChamado, {} as EstadoAcao);
  const [eReatribuir, reatribuir, reatribuindo] = useActionState(reatribuirChamado, {} as EstadoAcao);
  const [eCancelar, cancelar, cancelando] = useActionState(cancelarChamado, {} as EstadoAcao);
  const erro = eAssumir.erro ?? eFinalizar.erro ?? eReatribuir.erro ?? eCancelar.erro;
  const ok = eAssumir.ok ?? eReatribuir.ok;

  return (
    <Cartao className="flex flex-col gap-4">
      <h2 className="font-semibold">Ações</h2>
      {erro ? <Alerta>{erro}</Alerta> : null}
      {ok ? <Alerta tipo="sucesso">{ok}</Alerta> : null}

      {status === "aberto" ? (
        <form action={assumir}>
          <input type="hidden" name="id" value={chamadoId} />
          <Botao type="submit" disabled={assumindo} className="w-full sm:w-auto">
            {assumindo ? "Assumindo…" : "Assumir este chamado"}
          </Botao>
        </form>
      ) : null}

      <form onSubmit={enviarSemReset(finalizar)} className="flex flex-col gap-2">
        <input type="hidden" name="id" value={chamadoId} />
        <label htmlFor="observacao" className="text-sm font-medium">
          Finalizar: o que foi feito?
        </label>
        <textarea id="observacao" name="observacao" rows={3} required minLength={3} maxLength={2000} className={classeTexto} />
        <Botao type="submit" disabled={finalizando}>
          {finalizando ? "Finalizando…" : "Finalizar chamado"}
        </Botao>
      </form>

      {ehAdmin ? (
        <div className="grid gap-4 border-t border-zinc-200 pt-4 sm:grid-cols-2">
          <form action={reatribuir} className="flex flex-col gap-2">
            <input type="hidden" name="id" value={chamadoId} />
            <Selecao id="tecnico" name="tecnico" rotulo="Reatribuir para" required defaultValue="">
              <option value="" disabled>
                Escolha…
              </option>
              {tecnicos.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nome}
                </option>
              ))}
            </Selecao>
            <input name="comentario" placeholder="Comentário (opcional)" maxLength={500} className={`${classeTexto} min-h-11`} />
            <Botao type="submit" variante="secundario" disabled={reatribuindo}>
              Reatribuir
            </Botao>
          </form>
          <form
            className="flex flex-col gap-2"
            onSubmit={(e) => {
              if (!confirm("Cancelar este chamado? Cancelados não entram no cálculo de SLA e não podem ser reabertos.")) {
                e.preventDefault();
                return;
              }
              enviarSemReset(cancelar)(e);
            }}
          >
            <input type="hidden" name="id" value={chamadoId} />
            <label htmlFor="motivo" className="text-sm font-medium">
              Cancelar (motivo obrigatório)
            </label>
            <textarea id="motivo" name="motivo" rows={2} required minLength={5} maxLength={1000} className={classeTexto} />
            <Botao type="submit" variante="perigo" disabled={cancelando}>
              Cancelar chamado
            </Botao>
          </form>
        </div>
      ) : null}
    </Cartao>
  );
}
