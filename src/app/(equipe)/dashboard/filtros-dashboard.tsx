"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Campo, Selecao } from "@/components/ui";

type Opcao = { valor: string; rotulo: string };

export function FiltrosDashboard({
  periodos,
  categorias,
  tecnicos,
  turnos,
  de,
  ate,
}: {
  periodos: Opcao[];
  categorias: Opcao[];
  tecnicos: Opcao[];
  turnos: Opcao[];
  de: string;
  ate: string;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const periodo = params.get("periodo") ?? "7d";

  function mudar(mudancas: Record<string, string>) {
    const novos = new URLSearchParams(params);
    for (const [k, v] of Object.entries(mudancas)) {
      if (v) novos.set(k, v);
      else novos.delete(k);
    }
    if (novos.get("periodo") !== "personalizado") {
      novos.delete("de");
      novos.delete("ate");
    }
    router.replace(`?${novos.toString()}`, { scroll: false });
  }

  return (
    <div className="grid gap-3 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-4">
      <Selecao id="f-periodo" rotulo="Período" value={periodo} onChange={(e) => mudar({ periodo: e.target.value })}>
        {periodos.map((o) => (
          <option key={o.valor} value={o.valor}>
            {o.rotulo}
          </option>
        ))}
      </Selecao>
      <Selecao id="f-categoria" rotulo="Categoria" value={params.get("categoria") ?? ""} onChange={(e) => mudar({ categoria: e.target.value })}>
        <option value="">Todas</option>
        {categorias.map((o) => (
          <option key={o.valor} value={o.valor}>
            {o.rotulo}
          </option>
        ))}
      </Selecao>
      <Selecao id="f-tecnico" rotulo="Técnico" value={params.get("tecnico") ?? ""} onChange={(e) => mudar({ tecnico: e.target.value })}>
        <option value="">Todos</option>
        {tecnicos.map((o) => (
          <option key={o.valor} value={o.valor}>
            {o.rotulo}
          </option>
        ))}
      </Selecao>
      <Selecao id="f-turno" rotulo="Turno" value={params.get("turno") ?? ""} onChange={(e) => mudar({ turno: e.target.value })}>
        <option value="">Todos</option>
        {turnos.map((o) => (
          <option key={o.valor} value={o.valor}>
            {o.rotulo}
          </option>
        ))}
      </Selecao>
      {periodo === "personalizado" ? (
        <>
          <Campo id="f-de" type="date" rotulo="De" defaultValue={de} onChange={(e) => e.target.value && mudar({ periodo, de: e.target.value, ate })} />
          <Campo id="f-ate" type="date" rotulo="Até" defaultValue={ate} onChange={(e) => e.target.value && mudar({ periodo, de, ate: e.target.value })} />
        </>
      ) : null}
    </div>
  );
}
