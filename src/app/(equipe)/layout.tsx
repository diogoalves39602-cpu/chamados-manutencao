import Link from "next/link";
import { exigirEquipe } from "@/lib/auth/sessao";

export default async function LayoutEquipe({ children }: LayoutProps<"/">) {
  const perfil = await exigirEquipe();

  const links = [
    { href: "/painel", rotulo: "Painel" },
    { href: "/dashboard", rotulo: "Indicadores" },
    ...(perfil.papel === "admin" ? [{ href: "/admin/usuarios", rotulo: "Admin" }] : []),
  ];

  return (
    <div className="flex flex-1 flex-col">
      <header className="sticky top-0 z-10 border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-2">
          <Link href="/painel" className="text-sm font-bold text-blue-800">
            Chamados
          </Link>
          <nav className="flex flex-1 gap-1 overflow-x-auto">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="rounded-md px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100"
              >
                {l.rotulo}
              </Link>
            ))}
          </nav>
          <details className="relative">
            <summary className="cursor-pointer list-none rounded-md px-2 py-2 text-sm text-zinc-700 hover:bg-zinc-100">
              {perfil.nome.split(" ")[0]} ▾
            </summary>
            <div className="absolute right-0 mt-1 w-44 rounded-lg border border-zinc-200 bg-white p-1 shadow-lg">
              <Link href="/trocar-senha" className="block rounded-md px-3 py-2 text-sm hover:bg-zinc-100">
                Trocar senha
              </Link>
              <form action="/sair" method="post">
                <button type="submit" className="w-full rounded-md px-3 py-2 text-left text-sm text-red-700 hover:bg-red-50">
                  Sair
                </button>
              </form>
            </div>
          </details>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">{children}</main>
    </div>
  );
}
