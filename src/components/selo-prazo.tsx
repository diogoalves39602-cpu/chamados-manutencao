import { CircleCheck, Clock, CircleX, Hourglass, TriangleAlert } from "lucide-react";
import { CLASSES_PRAZO, estadoPrazo } from "@/lib/chamados/prazo";
import type { SituacaoPrazo, Status } from "@/lib/chamados/rotulos";

/** Selo do contador de prazo: cor + ícone + texto. */
export function SeloPrazo({
  chamado,
  agora,
  grande = false,
}: {
  chamado: { status: Status; prazo_limite: string; situacao_prazo: SituacaoPrazo | null };
  agora: number;
  grande?: boolean;
}) {
  const prazo = estadoPrazo(chamado, agora);
  const Icone =
    prazo.cor === "vermelho"
      ? TriangleAlert
      : prazo.cor === "amarelo"
        ? Hourglass
        : prazo.cor === "verde"
          ? Clock
          : chamado.status === "cancelado"
            ? CircleX
            : CircleCheck;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-mono font-bold tabular-nums ${CLASSES_PRAZO[prazo.cor].selo} ${
        grande ? "px-3.5 py-1.5 text-base" : "px-2.5 py-1 text-sm"
      }`}
    >
      <Icone className={grande ? "h-5 w-5" : "h-4 w-4"} aria-hidden />
      {prazo.texto}
    </span>
  );
}
