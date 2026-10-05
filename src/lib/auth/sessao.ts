import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { criarClienteServidor } from "@/lib/supabase/server";
import type { Tables } from "@/lib/supabase/database.types";

export type Perfil = Tables<"perfis">;

// Uma consulta por requisição, compartilhada entre layout e páginas.
export const obterSessao = cache(async () => {
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (error || !userId) return { userId: null, perfil: null };

  const { data: perfil } = await supabase.from("perfis").select("*").eq("id", userId).maybeSingle();
  return { userId, perfil };
});

// Garante membro ativo da equipe com senha já trocada.
export async function exigirEquipe(): Promise<Perfil> {
  const { userId, perfil } = await obterSessao();
  if (!userId) redirect("/login");
  if (!perfil || !perfil.ativo) redirect("/sair?motivo=inativo");
  if (perfil.deve_trocar_senha) redirect("/trocar-senha");
  return perfil;
}

export async function exigirAdmin(): Promise<Perfil> {
  const perfil = await exigirEquipe();
  if (perfil.papel !== "admin") redirect("/painel");
  return perfil;
}
