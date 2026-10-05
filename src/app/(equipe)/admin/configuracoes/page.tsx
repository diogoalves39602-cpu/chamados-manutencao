import type { Metadata } from "next";
import { Sun, Tag, Timer } from "lucide-react";
import { Cartao } from "@/components/ui";
import { formatarDataHora } from "@/lib/datas";
import { criarClienteServidor } from "@/lib/supabase/server";
import { EditorTurnos, FormCategoria, FormNovaCategoria, FormSla } from "./formularios";

export const metadata: Metadata = { title: "SLA, categorias e turnos" };

export default async function PaginaConfiguracoes() {
  const supabase = await criarClienteServidor();
  const [{ data: config }, { data: categorias }, { data: turnos }] = await Promise.all([
    supabase.from("configuracoes").select("sla_minutos, alerta_minutos_antes, atualizado_em").single(),
    supabase.from("categorias").select("id, nome, ativo, ordem").order("ordem").order("nome"),
    supabase.from("turnos").select("nome, inicio, fim").order("ordem"),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <Cartao>
        <h1 className="flex items-center gap-2 text-lg font-semibold"><Timer className="h-5 w-5 text-marca-700" aria-hidden />Prazo (SLA) e alerta</h1>
        <p className="mb-4 text-sm text-stone-600">
          Relógio corrido, 24/7, sem pausa em fins de semana ou feriados. Mudanças valem só para chamados novos.
          {config ? ` Última alteração: ${formatarDataHora(config.atualizado_em)}.` : ""}
        </p>
        <FormSla sla={config?.sla_minutos ?? 120} alerta={config?.alerta_minutos_antes ?? 30} />
      </Cartao>

      <Cartao>
        <h2 className="flex items-center gap-2 text-lg font-semibold"><Tag className="h-5 w-5 text-marca-700" aria-hidden />Categorias</h2>
        <p className="mb-4 text-sm text-stone-600">
          Desative em vez de excluir: os chamados antigos continuam com a categoria original. “Outros” recebe categorias
          desconhecidas vindas das integrações.
        </p>
        <div className="flex flex-col gap-2">
          {categorias?.map((c) => <FormCategoria key={c.id} categoria={c} />)}
        </div>
        <div className="mt-4 border-t border-stone-200 pt-4">
          <FormNovaCategoria />
        </div>
      </Cartao>

      <Cartao>
        <h2 className="flex items-center gap-2 text-lg font-semibold"><Sun className="h-5 w-5 text-marca-700" aria-hidden />Turnos</h2>
        <p className="mb-4 text-sm text-stone-600">
          O turno do chamado é definido pela hora de abertura (horário de Brasília). Os turnos precisam cobrir as 24 horas,
          sem buracos nem sobreposição. O início entra no turno e o fim não (ex.: 14:00 em ponto já é do turno seguinte).
        </p>
        <EditorTurnos
          turnos={(turnos ?? []).map((t) => ({ nome: t.nome, inicio: t.inicio.slice(0, 5), fim: t.fim.slice(0, 5) }))}
        />
      </Cartao>
    </div>
  );
}
