import { Wrench } from "lucide-react";

// Logo do sistema: chave de manutenção num quadrado arredondado.
export function Marca({ claro = false, compacta = false }: { claro?: boolean; compacta?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <span
        className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl shadow-sm ${
          claro ? "bg-white text-marca-700" : "bg-marca-700 text-white"
        }`}
        aria-hidden
      >
        <Wrench className="h-5 w-5" strokeWidth={2.4} />
      </span>
      {compacta ? null : (
        <span className="flex flex-col leading-tight">
          <span className={`text-[15px] font-bold tracking-tight ${claro ? "text-white" : "text-stone-900"}`}>
            Chamados
          </span>
          <span className={`text-[11px] font-medium uppercase tracking-wider ${claro ? "text-marca-100" : "text-stone-500"}`}>
            Manutenção
          </span>
        </span>
      )}
    </span>
  );
}
