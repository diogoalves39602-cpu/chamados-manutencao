"use client";

import { useState } from "react";
import { Alerta } from "@/components/ui";

// Mostra a senha inicial uma única vez, para o admin repassar ao técnico.
export function SenhaGerada({ login, senha }: { login: string; senha: string }) {
  const [copiado, setCopiado] = useState(false);

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
          // Link único do sistema (o mesmo endereço em que o admin está).
          const texto = [
            "Acesso ao sistema de chamados de manutenção",
            `Link: ${window.location.origin}`,
            `Usuário: ${login}`,
            `Senha inicial: ${senha}`,
            "No primeiro acesso, entre em “Área da equipe” e crie sua senha.",
            "Dica: instale no celular (Chrome → ⋮ → Instalar app; iPhone → Compartilhar → Adicionar à Tela de Início).",
          ].join("\n");
          await navigator.clipboard.writeText(texto);
          setCopiado(true);
        }}
      >
        {copiado ? "Copiado!" : "Copiar mensagem para enviar"}
      </button>
    </Alerta>
  );
}
