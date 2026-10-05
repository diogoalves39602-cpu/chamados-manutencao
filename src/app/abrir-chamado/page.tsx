import type { Metadata } from "next";
import { descreverSla } from "@/lib/chamados/rotulos";
import { criarClienteAdmin } from "@/lib/supabase/admin";
import { criarClienteServidor } from "@/lib/supabase/server";
import { FormAbrirChamado } from "./form-abrir-chamado";

export const metadata: Metadata = {
  title: "Abrir chamado",
  description: "Abra um chamado para a equipe de manutenção. Atendimento 24h por dia.",
};

// SLA vigente (configuracoes é restrita à equipe pela RLS; lido no servidor).
async function slaMinutos() {
  try {
    const { data } = await criarClienteAdmin().from("configuracoes").select("sla_minutos").single();
    return data?.sla_minutos ?? 120;
  } catch {
    return 120;
  }
}

export default async function PaginaAbrirChamado() {
  const supabase = await criarClienteServidor();
  const [{ data: categorias }, sla] = await Promise.all([
    supabase.from("categorias").select("id, nome").eq("ativo", true).order("ordem").order("nome"),
    slaMinutos(),
  ]);
  const prazo = descreverSla(sla);

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-5 px-4 py-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Abrir chamado de manutenção</h1>
        <p className="mt-1 text-sm text-zinc-600">
          A equipe atende 24 horas por dia. Prazo de solução: até {prazo} após a abertura.
        </p>
      </div>
      <FormAbrirChamado categorias={categorias ?? []} />
    </main>
  );
}
