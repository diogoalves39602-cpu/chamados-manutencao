import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ArrowRight, Search, ShieldCheck, Wrench } from "lucide-react";
import { PaginaPublica } from "@/components/pagina-publica";

function Opcao({
  href,
  icone: Icone,
  titulo,
  texto,
  destaque = false,
}: {
  href: string;
  icone: LucideIcon;
  titulo: string;
  texto: string;
  destaque?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`group flex items-center gap-4 rounded-2xl border p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marca-600 ${
        destaque ? "border-white/25 bg-marca-700 text-white shadow-lg shadow-marca-900/30 ring-1 ring-black/5" : "border-stone-200 bg-white text-stone-900"
      }`}
    >
      <span
        className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl ${
          destaque ? "bg-white/15 text-white" : "bg-marca-50 text-marca-700"
        }`}
      >
        <Icone className="h-6 w-6" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-base font-semibold">{titulo}</span>
        <span className={`block text-sm ${destaque ? "text-marca-100" : "text-stone-500"}`}>{texto}</span>
      </span>
      <ArrowRight className="h-5 w-5 shrink-0 transition-transform group-hover:translate-x-0.5" aria-hidden />
    </Link>
  );
}

export default function Inicio() {
  return (
    <PaginaPublica
      titulo="Como podemos ajudar?"
      subtitulo="Problema de manutenção? Abra um chamado: a equipe atende em até 2 horas, 24h por dia."
    >
      <div className="flex flex-col gap-3 animate-entrar">
        <Opcao href="/abrir-chamado" icone={Wrench} titulo="Abrir um chamado" texto="Elétrica, hidráulica, ar, TI e mais" destaque />
        <Opcao href="/acompanhar" icone={Search} titulo="Acompanhar meu chamado" texto="Consulte o status pelo número" />
      </div>
      <Link
        href="/login"
        className="mx-auto mt-4 inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-stone-500 hover:bg-stone-200/60 hover:text-stone-800"
      >
        <ShieldCheck className="h-4 w-4" aria-hidden />
        Área da equipe de manutenção
      </Link>
    </PaginaPublica>
  );
}
