"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { exigirAdmin } from "@/lib/auth/sessao";
import { criarClienteServidor } from "@/lib/supabase/server";

// Todas as gravações usam a sessão do admin: a RLS do banco é a barreira final.

export type Estado = { ok?: string; erro?: string };

function pronto(mensagem: string): Estado {
  revalidatePath("/admin/configuracoes");
  return { ok: mensagem };
}

const slaSchema = z
  .object({
    sla_minutos: z.coerce.number().int().min(5, "Mínimo de 5 minutos.").max(10080, "Máximo de 7 dias."),
    alerta_minutos_antes: z.coerce.number().int().min(1, "Mínimo de 1 minuto.").max(1440),
  })
  .refine((d) => d.alerta_minutos_antes < d.sla_minutos, {
    message: "O alerta precisa acontecer antes do fim do prazo (menor que o SLA).",
  });

export async function salvarSla(_: Estado, formData: FormData): Promise<Estado> {
  const eu = await exigirAdmin();
  const dados = slaSchema.safeParse(Object.fromEntries(formData));
  if (!dados.success) return { erro: dados.error.issues[0]?.message };

  const supabase = await criarClienteServidor();
  const { error } = await supabase
    .from("configuracoes")
    .update({ ...dados.data, atualizado_por: eu.id })
    .eq("id", true);
  if (error) return { erro: error.message };
  return pronto("Configuração salva. Vale para os chamados abertos a partir de agora.");
}

const nomeCategoria = z.string().trim().min(2, "Nome da categoria: mínimo 2 caracteres.").max(60);

export async function criarCategoria(_: Estado, formData: FormData): Promise<Estado> {
  await exigirAdmin();
  const nome = nomeCategoria.safeParse(formData.get("nome"));
  if (!nome.success) return { erro: nome.error.issues[0]?.message };

  const supabase = await criarClienteServidor();
  const { data: ultima } = await supabase
    .from("categorias")
    .select("ordem")
    .lt("ordem", 99)
    .order("ordem", { ascending: false })
    .limit(1)
    .maybeSingle();
  const { error } = await supabase.from("categorias").insert({ nome: nome.data, ordem: (ultima?.ordem ?? 0) + 1 });
  if (error) return { erro: error.code === "23505" ? "Já existe uma categoria com esse nome." : error.message };
  return pronto(`Categoria “${nome.data}” criada.`);
}

export async function salvarCategoria(_: Estado, formData: FormData): Promise<Estado> {
  await exigirAdmin();
  const id = z.coerce.number().int().positive().safeParse(formData.get("id"));
  const nome = nomeCategoria.safeParse(formData.get("nome"));
  const ordem = z.coerce.number().int().min(0).max(999).safeParse(formData.get("ordem"));
  if (!id.success) return { erro: "Categoria inválida." };
  if (!nome.success) return { erro: nome.error.issues[0]?.message };
  if (!ordem.success) return { erro: "Ordem: use um número de 0 a 999." };

  const supabase = await criarClienteServidor();
  const { error } = await supabase
    .from("categorias")
    .update({ nome: nome.data, ordem: ordem.data, ativo: formData.get("ativo") === "on" })
    .eq("id", id.data);
  if (error) return { erro: error.code === "23505" ? "Já existe uma categoria com esse nome." : error.message };
  return pronto("Categoria salva.");
}

const turnoSchema = z.object({
  nome: z.string().trim().min(2, "Nome do turno: mínimo 2 caracteres.").max(40),
  inicio: z.string().regex(/^\d{2}:\d{2}$/, "Horário inválido."),
  fim: z.string().regex(/^\d{2}:\d{2}$/, "Horário inválido."),
});

export async function salvarTurnos(_: Estado, formData: FormData): Promise<Estado> {
  await exigirAdmin();
  const nomes = formData.getAll("nome");
  const inicios = formData.getAll("inicio");
  const fins = formData.getAll("fim");
  const turnos = z
    .array(turnoSchema)
    .min(1, "Informe ao menos um turno.")
    .safeParse(nomes.map((nome, i) => ({ nome, inicio: inicios[i], fim: fins[i] })));
  if (!turnos.success) return { erro: turnos.error.issues[0]?.message };

  // A validação de cobertura 24h (sem buracos nem sobreposição) é feita no banco.
  const supabase = await criarClienteServidor();
  const { error } = await supabase.rpc("salvar_turnos", { p_turnos: turnos.data });
  if (error) return { erro: error.message };
  return pronto("Turnos salvos. Valem para os chamados abertos a partir de agora.");
}
