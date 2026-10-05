import Link from "next/link";
import { ChevronDown, KeyRound, LogOut } from "lucide-react";
import { Marca } from "@/components/marca";
import { exigirEquipe } from "@/lib/auth/sessao";
import { iniciais } from "@/lib/iniciais";
import { NavegacaoInferior, NavegacaoTopo } from "./navegacao";

export default async function LayoutEquipe({ children }: LayoutProps<"/">) {
  const perfil = await exigirEquipe();
  const ehAdmin = perfil.papel === "admin";

  return (
    <div className="flex flex-1 flex-col">
      <header className="fundo-marca sticky top-0 z-20 text-white shadow-md shadow-marca-900/20 print:hidden">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-2.5">
          <Link href="/painel" className="rounded-xl focus-visible:outline-2 focus-visible:outline-white">
            <Marca claro />
          </Link>
          <div className="flex-1">
            <NavegacaoTopo ehAdmin={ehAdmin} />
          </div>
          <details className="group relative">
            <summary className="flex cursor-pointer list-none items-center gap-2 rounded-xl px-1.5 py-1 hover:bg-white/10 [&::-webkit-details-marker]:hidden">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-white text-sm font-bold text-marca-700">
                {iniciais(perfil.nome)}
              </span>
              <span className="hidden text-left leading-tight md:block">
                <span className="block text-sm font-semibold">{perfil.nome.split(" ")[0]}</span>
                <span className="block text-[11px] text-marca-100">{ehAdmin ? "Administrador" : "Técnico"}</span>
              </span>
              <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" aria-hidden />
            </summary>
            <div className="absolute right-0 mt-2 w-56 overflow-hidden rounded-2xl border border-stone-200 bg-white p-1.5 text-stone-800 shadow-xl">
              <div className="px-3 py-2">
                <p className="text-sm font-semibold">{perfil.nome}</p>
                <p className="font-mono text-xs text-stone-500">{perfil.login}</p>
              </div>
              <hr className="my-1 border-stone-100" />
              <Link href="/trocar-senha" className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm hover:bg-stone-100">
                <KeyRound className="h-4 w-4 text-stone-500" aria-hidden />
                Trocar senha
              </Link>
              <form action="/sair" method="post">
                <button type="submit" className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm text-red-700 hover:bg-red-50">
                  <LogOut className="h-4 w-4" aria-hidden />
                  Sair
                </button>
              </form>
            </div>
          </details>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-28 pt-5 sm:pb-10 sm:pt-6">{children}</main>
      <NavegacaoInferior ehAdmin={ehAdmin} />
    </div>
  );
}
