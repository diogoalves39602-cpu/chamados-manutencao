import type { ComponentProps, ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { CircleAlert, CircleCheck, Info, TriangleAlert } from "lucide-react";

// Componentes básicos, mobile-first (alvos de toque ≥ 44px). Cor da marca: marca-* (vermelho).

export function Cartao({ className = "", ...props }: ComponentProps<"section">) {
  return (
    <section
      className={`rounded-2xl border border-stone-200/80 bg-white p-4 shadow-[0_1px_2px_rgb(0_0_0/0.04),0_4px_16px_-8px_rgb(0_0_0/0.08)] sm:p-6 ${className}`}
      {...props}
    />
  );
}

type Variante = "primario" | "secundario" | "perigo" | "fantasma";

const estilosBotao: Record<Variante, string> = {
  primario:
    "bg-marca-700 text-white shadow-sm shadow-marca-900/20 hover:bg-marca-800 active:bg-marca-900 disabled:bg-marca-300 disabled:shadow-none",
  secundario:
    "border border-stone-300 bg-white text-stone-800 hover:border-stone-400 hover:bg-stone-50 disabled:text-stone-400",
  // Ação destrutiva: contorno, para não se confundir com o botão principal (também vermelho).
  perigo: "border border-red-300 bg-white text-red-700 hover:bg-red-50 disabled:text-red-300",
  fantasma: "text-stone-700 hover:bg-stone-100",
};

export function Botao({
  variante = "primario",
  icone: Icone,
  className = "",
  children,
  ...props
}: ComponentProps<"button"> & { variante?: Variante; icone?: LucideIcon }) {
  return (
    <button
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marca-600 disabled:cursor-not-allowed ${estilosBotao[variante]} ${className}`}
      {...props}
    >
      {Icone ? <Icone className="h-4 w-4 shrink-0" aria-hidden /> : null}
      {children}
    </button>
  );
}

const classeCampo =
  "min-h-11 w-full rounded-xl border border-stone-300 bg-white px-3 text-base text-stone-900 outline-none transition-colors placeholder:text-stone-400 focus:border-marca-600 focus:ring-4 focus:ring-marca-100 aria-invalid:border-red-500";

export function Campo({
  rotulo,
  erro,
  ajuda,
  id,
  className = "",
  ...props
}: ComponentProps<"input"> & { rotulo: string; erro?: string; ajuda?: ReactNode; id: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-stone-800">
        {rotulo}
      </label>
      <input
        id={id}
        aria-invalid={erro ? true : undefined}
        aria-describedby={erro ? `${id}-erro` : undefined}
        className={`${classeCampo} ${className}`}
        {...props}
      />
      {ajuda && !erro ? <p className="text-xs text-stone-500">{ajuda}</p> : null}
      {erro ? (
        <p id={`${id}-erro`} className="flex items-center gap-1 text-xs font-medium text-red-600">
          <CircleAlert className="h-3.5 w-3.5" aria-hidden />
          {erro}
        </p>
      ) : null}
    </div>
  );
}

export function AreaTexto({
  rotulo,
  erro,
  id,
  ...props
}: ComponentProps<"textarea"> & { rotulo: string; erro?: string; id: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-stone-800">
        {rotulo}
      </label>
      <textarea
        id={id}
        aria-invalid={erro ? true : undefined}
        className={`${classeCampo} py-2.5`}
        {...props}
      />
      {erro ? (
        <p className="flex items-center gap-1 text-xs font-medium text-red-600">
          <CircleAlert className="h-3.5 w-3.5" aria-hidden />
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
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-stone-800">
        {rotulo}
      </label>
      <select id={id} className={`${classeCampo} pr-8`} {...props}>
        {children}
      </select>
    </div>
  );
}

const ALERTAS = {
  erro: { classe: "border-red-200 bg-red-50 text-red-800", icone: TriangleAlert },
  sucesso: { classe: "border-emerald-200 bg-emerald-50 text-emerald-800", icone: CircleCheck },
  aviso: { classe: "border-amber-200 bg-amber-50 text-amber-900", icone: Info },
};

export function Alerta({ tipo = "erro", children }: { tipo?: keyof typeof ALERTAS; children: ReactNode }) {
  const { classe, icone: Icone } = ALERTAS[tipo];
  return (
    <div role={tipo === "erro" ? "alert" : "status"} className={`flex gap-2.5 rounded-xl border px-3 py-2.5 text-sm ${classe}`}>
      <Icone className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

/** Selo (badge) com ícone opcional. */
export function Selo({
  children,
  className = "bg-stone-100 text-stone-700",
  icone: Icone,
}: {
  children: ReactNode;
  className?: string;
  icone?: LucideIcon;
}) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${className}`}>
      {Icone ? <Icone className="h-3.5 w-3.5" aria-hidden /> : null}
      {children}
    </span>
  );
}

/** Título de página com subtítulo e ações à direita. */
export function CabecalhoPagina({
  titulo,
  subtitulo,
  icone: Icone,
  acoes,
}: {
  titulo: ReactNode;
  subtitulo?: ReactNode;
  icone?: LucideIcon;
  acoes?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div className="flex min-w-0 items-center gap-3">
        {Icone ? (
          <span className="hidden h-11 w-11 shrink-0 place-items-center rounded-xl bg-marca-50 text-marca-700 sm:grid">
            <Icone className="h-5 w-5" aria-hidden />
          </span>
        ) : null}
        <div className="min-w-0">
          <h1 className="text-xl font-bold tracking-tight text-stone-900 sm:text-2xl">{titulo}</h1>
          {subtitulo ? <p className="mt-0.5 text-sm text-stone-600">{subtitulo}</p> : null}
        </div>
      </div>
      {acoes ? <div className="flex flex-wrap gap-2">{acoes}</div> : null}
    </div>
  );
}

export function Vazio({ icone: Icone, titulo, children }: { icone: LucideIcon; titulo: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-stone-300 bg-white/60 px-6 py-12 text-center">
      <span className="grid h-12 w-12 place-items-center rounded-full bg-stone-100 text-stone-400">
        <Icone className="h-6 w-6" aria-hidden />
      </span>
      <p className="font-semibold text-stone-800">{titulo}</p>
      {children ? <div className="text-sm text-stone-500">{children}</div> : null}
    </div>
  );
}
