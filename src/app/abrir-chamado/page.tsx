import type { Metadata } from "next";
import { PaginaPublica } from "@/components/pagina-publica";
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

  return (
    <PaginaPublica
      titulo="Abrir chamado"
      subtitulo={`A equipe atende 24 horas por dia. Prazo de solução: até ${descreverSla(sla)} após a abertura.`}
    >
      <FormAbrirChamado categorias={categorias ?? []} />
    </PaginaPublica>
  );
}
