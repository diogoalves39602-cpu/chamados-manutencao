import type { ComponentProps, ReactNode } from "react";

// Componentes básicos, mobile-first (alvos de toque ≥ 44px).

export function Cartao({ className = "", ...props }: ComponentProps<"section">) {
  return (
    <section
      className={`rounded-xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-6 ${className}`}
      {...props}
    />
  );
}

type Variante = "primario" | "secundario" | "perigo";

const estilosBotao: Record<Variante, string> = {
  primario: "bg-blue-700 text-white hover:bg-blue-800 disabled:bg-blue-300",
  secundario: "border border-zinc-300 bg-white text-zinc-800 hover:bg-zinc-50 disabled:text-zinc-400",
  perigo: "bg-red-600 text-white hover:bg-red-700 disabled:bg-red-300",
};

export function Botao({
  variante = "primario",
  className = "",
  ...props
}: ComponentProps<"button"> & { variante?: Variante }) {
  return (
    <button
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold transition-colors disabled:cursor-not-allowed ${estilosBotao[variante]} ${className}`}
      {...props}
    />
  );
}

export function Campo({
  rotulo,
  erro,
  ajuda,
  id,
  ...props
}: ComponentProps<"input"> & { rotulo: string; erro?: string; ajuda?: ReactNode; id: string }) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-medium text-zinc-800">
        {rotulo}
      </label>
      <input
        id={id}
        aria-invalid={erro ? true : undefined}
        aria-describedby={erro ? `${id}-erro` : undefined}
        className="min-h-11 rounded-lg border border-zinc-300 bg-white px-3 text-base text-zinc-900 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-200 aria-invalid:border-red-500"
        {...props}
      />
      {ajuda && !erro ? <p className="text-xs text-zinc-500">{ajuda}</p> : null}
      {erro ? (
        <p id={`${id}-erro`} className="text-xs text-red-600">
          {erro}
        </p>
      ) : null}
    </div>
  );
}

export function Selecao({
  rotulo,
  id,
  children,
  ...props
}: ComponentProps<"select"> & { rotulo: string; id: string }) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-medium text-zinc-800">
        {rotulo}
      </label>
      <select
        id={id}
        className="min-h-11 rounded-lg border border-zinc-300 bg-white px-3 text-base text-zinc-900 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-200"
        {...props}
      >
        {children}
      </select>
    </div>
  );
}

export function Alerta({ tipo = "erro", children }: { tipo?: "erro" | "sucesso" | "aviso"; children: ReactNode }) {
  const estilos = {
    erro: "border-red-200 bg-red-50 text-red-800",
    sucesso: "border-green-200 bg-green-50 text-green-800",
    aviso: "border-amber-200 bg-amber-50 text-amber-900",
  }[tipo];
  return (
    <div role={tipo === "erro" ? "alert" : "status"} className={`rounded-lg border px-3 py-2 text-sm ${estilos}`}>
      {children}
    </div>
  );
}
