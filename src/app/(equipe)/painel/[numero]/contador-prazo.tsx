"use client";

import { useAgora, useChamadosTempoReal } from "@/components/tempo-real";
import { CLASSES_PRAZO, estadoPrazo } from "@/lib/chamados/prazo";
import type { SituacaoPrazo, Status } from "@/lib/chamados/rotulos";

// Contador ao vivo + atualização da página quando o chamado muda (outro técnico assumiu etc.).
export function ContadorPrazo({
  chamado,
  agoraServidor,
}: {
  chamado: { status: Status; prazo_limite: string; situacao_prazo: SituacaoPrazo | null };
  agoraServidor: number;
}) {
  const agora = useAgora(agoraServidor);
  useChamadosTempoReal();
  const prazo = estadoPrazo(chamado, agora);
  return (
    <span className={`rounded-full px-3 py-1 font-mono text-sm font-bold tabular-nums ${CLASSES_PRAZO[prazo.cor].selo}`}>
      {prazo.texto}
    </span>
  );
}
