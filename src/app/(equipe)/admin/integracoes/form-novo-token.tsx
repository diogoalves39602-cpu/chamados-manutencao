"use client";

import { useActionState, useState } from "react";
import { Alerta, Botao, Campo, Selecao } from "@/components/ui";
import { criarToken, type EstadoToken } from "./actions";

export function FormNovoToken() {
  const [estado, acao, pendente] = useActionState(criarToken, {} as EstadoToken);
  const [copiado, setCopiado] = useState(false);

  return (
    <div className="flex flex-col gap-4">
      {estado.erro ? <Alerta>{estado.erro}</Alerta> : null}
      {estado.tokenGerado ? (
        <Alerta tipo="sucesso">
          <p>
            Token de <strong>{estado.tokenGerado.nome}</strong> criado. Copie agora: ele não será exibido de novo.
          </p>
          <code className="mt-2 block break-all rounded bg-white px-2 py-1.5 font-mono text-xs">
            {estado.tokenGerado.token}
          </code>
          <button
            type="button"
            className="mt-2 text-xs font-semibold underline"
            onClick={async () => {
              await navigator.clipboard.writeText(estado.tokenGerado!.token);
              setCopiado(true);
            }}
          >
            {copiado ? "Copiado!" : "Copiar token"}
          </button>
        </Alerta>
      ) : null}
      <form action={acao} className="grid gap-4 sm:grid-cols-[1fr_auto_auto] sm:items-end">
        <Campo id="nome-token" name="nome" rotulo="Nome do canal" placeholder="Ex.: Base Feishu – Manutenção" required />
        <Selecao id="origem-token" name="origem" rotulo="Origem" defaultValue="feishu">
          <option value="feishu">Feishu</option>
          <option value="lark">Lark</option>
          <option value="api">API (outros)</option>
        </Selecao>
        <Botao type="submit" disabled={pendente}>
          {pendente ? "Gerando…" : "Gerar token"}
        </Botao>
      </form>
    </div>
  );
}
