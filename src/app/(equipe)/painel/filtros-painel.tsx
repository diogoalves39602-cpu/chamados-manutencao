"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { ChevronDown, Filter, RotateCcw } from "lucide-react";
import { Selecao } from "@/components/ui";

type Opcao = { valor: string; rotulo: string };

export function FiltrosPainel({
  filtros,
}: {
  filtros: { nome: string; rotulo: string; opcoes: Opcao[]; padrao: string }[];
}) {
  const router = useRouter();
  const params = useSearchParams();
  const ativos = filtros.filter((f) => (params.get(f.nome) ?? f.padrao) !== f.padrao).length;

  function mudar(nome: string, valor: string, padrao: string) {
    const novos = new URLSearchParams(params);
    if (valor === padrao) novos.delete(nome);
    else novos.set(nome, valor);
    const qs = novos.toString();
    router.replace(qs ? `?${qs}` : "?", { scroll: false });
  }

  return (
    <details className="group rounded-2xl border border-stone-200 bg-white shadow-sm" open={ativos > 0}>
      <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-sm font-semibold text-stone-800 [&::-webkit-details-marker]:hidden">
        <Filter className="h-4 w-4 text-stone-500" aria-hidden />
        Filtros
        {ativos > 0 ? <span className="rounded-full bg-marca-700 px-2 text-xs text-white">{ativos}</span> : null}
        <ChevronDown className="ml-auto h-4 w-4 text-stone-400 transition-transform group-open:rotate-180" aria-hidden />
      </summary>
      <div className="grid gap-3 border-t border-stone-100 p-4 sm:grid-cols-2 lg:grid-cols-5">
        {filtros.map((f) => (
          <Selecao
            key={f.nome}
            id={`filtro-${f.nome}`}
            rotulo={f.rotulo}
            value={params.get(f.nome) ?? f.padrao}
            onChange={(e) => mudar(f.nome, e.target.value, f.padrao)}
          >
            {f.opcoes.map((o) => (
              <option key={o.valor} value={o.valor}>
                {o.rotulo}
              </option>
            ))}
          </Selecao>
        ))}
        {ativos > 0 ? (
          <button
            type="button"
            onClick={() => router.replace("?", { scroll: false })}
            className="inline-flex items-center gap-1.5 justify-self-start rounded-lg px-2 py-1.5 text-sm font-medium text-marca-700 hover:bg-marca-50 sm:col-span-2 lg:col-span-5"
          >
            <RotateCcw className="h-4 w-4" aria-hidden />
            Limpar filtros
          </button>
        ) : null}
      </div>
    </details>
  );
}
