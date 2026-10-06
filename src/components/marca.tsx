import Image from "next/image";
import logo from "../../public/logo.png";

// Logo do sistema (J&T Express) ao lado do nome.
export function Marca({ claro = false, compacta = false }: { claro?: boolean; compacta?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <Image
        src={logo}
        alt=""
        width={36}
        height={36}
        priority
        className={`h-9 w-9 shrink-0 rounded-xl shadow-sm ${claro ? "ring-2 ring-white/70" : ""}`}
      />
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
