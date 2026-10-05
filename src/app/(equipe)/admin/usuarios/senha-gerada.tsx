"use client";

import { useState } from "react";
import { Alerta } from "@/components/ui";

// Mostra a senha inicial uma única vez, para o admin repassar ao técnico.
export function SenhaGerada({ login, senha }: { login: string; senha: string }) {
  const [copiado, setCopiado] = useState(false);
  const texto = `Acesso ao sistema de chamados\nUsuário: ${login}\nSenha inicial: ${senha}\n(você vai trocar a senha no primeiro acesso)`;

  return (
    <Alerta tipo="sucesso">
      <p>
        Usuário <strong>{login}</strong> · senha inicial{" "}
        <code className="rounded bg-white px-1.5 py-0.5 font-mono text-base">{senha}</code>
      </p>
      <p className="mt-1 text-xs">Anote agora: ela não será exibida de novo.</p>
      <button
        type="button"
        className="mt-2 text-xs font-semibold underline"
        onClick={async () => {
          await navigator.clipboard.writeText(texto);
          setCopiado(true);
        }}
      >
        {copiado ? "Copiado!" : "Copiar mensagem para enviar"}
      </button>
    </Alerta>
  );
}
