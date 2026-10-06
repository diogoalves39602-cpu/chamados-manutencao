import Link from "next/link";
import type { ReactNode } from "react";
import { Marca } from "./marca";

// Moldura das páginas públicas (início, abrir chamado, acompanhar, login):
// faixa vermelha com o logo e o conteúdo num cartão sobreposto.
export function PaginaPublica({
  titulo,
  subtitulo,
  largura = "max-w-lg",
  children,
}: {
  titulo: ReactNode;
  subtitulo?: ReactNode;
  largura?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-1 flex-col">
      <div className="fundo-marca px-4 pb-28 pt-5 text-white">
        <div className={`mx-auto flex w-full ${largura} flex-col gap-6`}>
          <Link href="/" className="w-fit rounded-xl focus-visible:outline-2 focus-visible:outline-white">
            <Marca claro />
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{titulo}</h1>
            {subtitulo ? <p className="mt-1.5 text-sm text-marca-100 sm:text-base">{subtitulo}</p> : null}
          </div>
        </div>
      </div>
      <main className={`mx-auto -mt-20 flex w-full ${largura} flex-1 flex-col gap-4 px-4 pb-10`}>{children}</main>
      <footer className="pb-6 text-center text-xs text-stone-400">
        <p>Atendimento 24 horas, todos os dias</p>
        <p className="mt-1">Desenvolvido por Diogo Alves</p>
      </footer>
    </div>
  );
}
