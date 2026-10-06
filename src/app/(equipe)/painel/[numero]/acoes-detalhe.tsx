"use client";

import { useActionState } from "react";
import { Ban, CircleCheck, Hand, Repeat } from "lucide-react";
import { enviarSemReset } from "@/components/envio";
import { AreaTexto, Alerta, Botao, Campo, Cartao, Selecao } from "@/components/ui";
import type { Status } from "@/lib/chamados/rotulos";
import {
  assumirChamado,
  reprovarChamado,
  finalizarChamado,
  reatribuirChamado,
  type EstadoAcao,
} from "../actions";

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
  const [eReprovar, reprovar, reprovando] = useActionState(reprovarChamado, {} as EstadoAcao);
  const erro = eAssumir.erro ?? eFinalizar.erro ?? eReatribuir.erro ?? eReprovar.erro;
  const ok = eAssumir.ok ?? eReatribuir.ok;

  return (
    <Cartao className="flex flex-col gap-5 border-marca-200">
      <h2 className="font-semibold text-stone-900">Atendimento</h2>
      {erro ? <Alerta>{erro}</Alerta> : null}
      {ok ? <Alerta tipo="sucesso">{ok}</Alerta> : null}

      {status === "aberto" ? (
        <form action={assumir}>
          <input type="hidden" name="id" value={chamadoId} />
          <Botao type="submit" disabled={assumindo} icone={Hand} className="min-h-12 w-full text-base sm:w-auto">
            {assumindo ? "Assumindo…" : "Assumir este chamado"}
          </Botao>
        </form>
      ) : null}

      <form onSubmit={enviarSemReset(finalizar)} className="flex flex-col gap-2">
        <input type="hidden" name="id" value={chamadoId} />
        <AreaTexto
          id="observacao"
          name="observacao"
          rotulo="Finalizar: o que foi feito?"
          placeholder="Ex.: disjuntor trocado e circuito testado"
          rows={3}
          required
          minLength={3}
          maxLength={2000}
        />
        <Botao type="submit" disabled={finalizando} icone={CircleCheck} variante={status === "aberto" ? "secundario" : "primario"}>
          {finalizando ? "Finalizando…" : "Finalizar chamado"}
        </Botao>
      </form>

      {ehAdmin ? (
        <div className="grid gap-5 border-t border-stone-100 pt-5 sm:grid-cols-2">
          <form action={reatribuir} className="flex flex-col gap-2">
            <Selecao id="tecnico" name="tecnico" rotulo="Reatribuir para" required defaultValue="">
              <option value="" disabled>
                Escolha o técnico…
              </option>
              {tecnicos.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nome}
                </option>
              ))}
            </Selecao>
            <input type="hidden" name="id" value={chamadoId} />
            <Campo id="comentario" name="comentario" rotulo="Comentário (opcional)" maxLength={500} />
            <Botao type="submit" variante="secundario" icone={Repeat} disabled={reatribuindo}>
              Reatribuir
            </Botao>
          </form>
          <form
            className="flex flex-col gap-2"
            onSubmit={(e) => {
              if (!confirm("Reprovar este chamado? Quem abriu será avisado com o motivo. Reprovados não entram no cálculo de SLA e não podem ser reabertos.")) {
                e.preventDefault();
                return;
              }
              enviarSemReset(reprovar)(e);
            }}
          >
            <input type="hidden" name="id" value={chamadoId} />
            <AreaTexto id="motivo" name="motivo" rotulo="Reprovar (motivo obrigatório — vai para quem abriu)" rows={3} required minLength={5} maxLength={1000} />
            <Botao type="submit" variante="perigo" icone={Ban} disabled={reprovando}>
              {reprovando ? "Reprovando…" : "Reprovar chamado"}
            </Botao>
          </form>
        </div>
      ) : null}
    </Cartao>
  );
}
