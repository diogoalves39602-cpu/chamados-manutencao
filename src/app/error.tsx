"use client";

import { useEffect } from "react";
import Link from "next/link";
import { RefreshCw, TriangleAlert } from "lucide-react";
import { Botao } from "@/components/ui";

// Erro inesperado em qualquer página: mensagem em português e opção de tentar de novo.
export default function Erro({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-4 px-4 py-16 text-center">
      <span className="grid h-16 w-16 place-items-center rounded-full bg-marca-100 text-marca-700">
        <TriangleAlert className="h-8 w-8" aria-hidden />
      </span>
      <h1 className="text-xl font-bold text-stone-900">Algo deu errado</h1>
      <p className="text-sm text-stone-600">
        Não foi possível carregar esta página. Verifique a internet e tente de novo.
        {error.digest ? <span className="mt-1 block font-mono text-xs text-stone-400">Código: {error.digest}</span> : null}
      </p>
      <div className="flex gap-2">
        <Botao type="button" icone={RefreshCw} onClick={() => retry()}>
          Tentar de novo
        </Botao>
        <Link href="/" className="inline-flex min-h-11 items-center rounded-xl px-4 text-sm font-semibold text-stone-600 hover:bg-stone-200/60">
          Início
        </Link>
      </div>
    </main>
  );
}
