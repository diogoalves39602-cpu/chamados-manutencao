"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, ListChecks, Plug, QrCode, Settings, Users } from "lucide-react";

const ABAS = [
  { href: "/admin/chamados", rotulo: "Chamados", icone: ListChecks },
  { href: "/admin/usuarios", rotulo: "Usuários", icone: Users },
  { href: "/admin/configuracoes", rotulo: "SLA, categorias e turnos", icone: Settings },
  { href: "/admin/notificacoes", rotulo: "Notificações", icone: Bell },
  { href: "/admin/integracoes", rotulo: "Integrações", icone: Plug },
  { href: "/admin/qrcode", rotulo: "QR Code", icone: QrCode },
];

export function AbasAdmin() {
  const caminho = usePathname();
  return (
    <nav className="-mx-4 overflow-x-auto px-4 print:hidden" aria-label="Administração">
      <ul className="flex w-max gap-1 rounded-2xl border border-stone-200 bg-white p-1 shadow-sm">
        {ABAS.map(({ href, rotulo, icone: Icone }) => {
          const ativa = caminho.startsWith(href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={ativa ? "page" : undefined}
                className={`inline-flex items-center gap-2 whitespace-nowrap rounded-xl px-3.5 py-2 text-sm font-semibold transition-colors ${
                  ativa ? "bg-marca-700 text-white shadow-sm" : "text-stone-600 hover:bg-stone-100 hover:text-stone-900"
                }`}
              >
                <Icone className="h-4 w-4" aria-hidden />
                {rotulo}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
