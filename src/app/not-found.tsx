import Link from "next/link";
import { SearchX } from "lucide-react";
import { Marca } from "@/components/marca";

export default function NaoEncontrado() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-4 px-4 py-16 text-center">
      <Marca />
      <span className="mt-4 grid h-16 w-16 place-items-center rounded-full bg-stone-200 text-stone-500">
        <SearchX className="h-8 w-8" aria-hidden />
      </span>
      <h1 className="text-xl font-bold text-stone-900">Página não encontrada</h1>
      <p className="text-sm text-stone-600">O endereço não existe ou o chamado não foi encontrado.</p>
      <div className="flex gap-2">
        <Link href="/" className="inline-flex min-h-11 items-center rounded-xl bg-marca-700 px-4 text-sm font-semibold text-white hover:bg-marca-800">
          Ir para o início
        </Link>
        <Link href="/painel" className="inline-flex min-h-11 items-center rounded-xl px-4 text-sm font-semibold text-stone-600 hover:bg-stone-200/60">
          Painel da equipe
        </Link>
      </div>
    </main>
  );
}
