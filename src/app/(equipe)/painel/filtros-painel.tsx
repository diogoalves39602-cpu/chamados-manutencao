"use client";

import { useRouter, useSearchParams } from "next/navigation";
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
    <details className="rounded-xl border border-zinc-200 bg-white" open={ativos > 0}>
      <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-zinc-800">
        Filtros {ativos > 0 ? <span className="ml-1 rounded-full bg-blue-100 px-2 text-blue-800">{ativos}</span> : null}
      </summary>
      <div className="grid gap-3 border-t border-zinc-200 p-4 sm:grid-cols-2 lg:grid-cols-5">
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
      </div>
    </details>
  );
}
