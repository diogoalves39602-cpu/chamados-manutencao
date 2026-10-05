"use client";

import { SeloPrazo } from "@/components/selo-prazo";
import { useAgora, useChamadosTempoReal } from "@/components/tempo-real";
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
  return <SeloPrazo chamado={chamado} agora={agora} grande />;
}
