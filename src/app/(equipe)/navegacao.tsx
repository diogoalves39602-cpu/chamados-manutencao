"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ClipboardList, LayoutDashboard, Settings } from "lucide-react";

const ITENS = [
  { href: "/painel", rotulo: "Painel", icone: ClipboardList },
  { href: "/dashboard", rotulo: "Indicadores", icone: LayoutDashboard },
  { href: "/admin", rotulo: "Admin", icone: Settings, soAdmin: true },
];

function useItens(ehAdmin: boolean) {
  const caminho = usePathname();
  return ITENS.filter((i) => !i.soAdmin || ehAdmin).map((i) => ({ ...i, ativo: caminho.startsWith(i.href) }));
}

/** Abas no cabeçalho (telas médias e grandes). */
export function NavegacaoTopo({ ehAdmin }: { ehAdmin: boolean }) {
  const itens = useItens(ehAdmin);
  return (
    <nav className="hidden items-center gap-1 sm:flex" aria-label="Principal">
      {itens.map(({ href, rotulo, icone: Icone, ativo }) => (
        <Link
          key={href}
          href={href}
          aria-current={ativo ? "page" : undefined}
          className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-semibold transition-colors ${
            ativo ? "bg-white text-marca-800 shadow-sm" : "text-marca-50 hover:bg-white/10"
          }`}
        >
          <Icone className="h-4 w-4" aria-hidden />
          {rotulo}
        </Link>
      ))}
    </nav>
  );
}

/** Barra inferior fixa (celular), ao alcance do polegar. */
export function NavegacaoInferior({ ehAdmin }: { ehAdmin: boolean }) {
  const itens = useItens(ehAdmin);
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-20 border-t border-stone-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur sm:hidden print:hidden"
      aria-label="Principal"
    >
      <ul className="flex">
        {itens.map(({ href, rotulo, icone: Icone, ativo }) => (
          <li key={href} className="flex-1">
            <Link
              href={href}
              aria-current={ativo ? "page" : undefined}
              className={`flex flex-col items-center gap-0.5 py-2 text-[11px] font-semibold ${ativo ? "text-marca-700" : "text-stone-500"}`}
            >
              <span className={`grid h-8 w-14 place-items-center rounded-full transition-colors ${ativo ? "bg-marca-100" : ""}`}>
                <Icone className="h-5 w-5" aria-hidden />
              </span>
              {rotulo}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
