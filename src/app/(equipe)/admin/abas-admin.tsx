"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ABAS = [
  { href: "/admin/usuarios", rotulo: "Usuários" },
  { href: "/admin/configuracoes", rotulo: "SLA, categorias e turnos" },
  { href: "/admin/notificacoes", rotulo: "Notificações" },
  { href: "/admin/integracoes", rotulo: "Integrações" },
  { href: "/admin/qrcode", rotulo: "QR Code" },
];

export function AbasAdmin() {
  const caminho = usePathname();
  return (
    <nav className="-mx-4 flex gap-1 overflow-x-auto border-b border-zinc-200 px-4 print:hidden" aria-label="Administração">
      {ABAS.map((a) => {
        const ativa = caminho.startsWith(a.href);
        return (
          <Link
            key={a.href}
            href={a.href}
            aria-current={ativa ? "page" : undefined}
            className={`whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium ${
              ativa ? "border-blue-700 text-blue-800" : "border-transparent text-zinc-600 hover:text-zinc-900"
            }`}
          >
            {a.rotulo}
          </Link>
        );
      })}
    </nav>
  );
}
