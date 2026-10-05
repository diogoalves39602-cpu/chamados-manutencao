"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { exigirAdmin } from "@/lib/auth/sessao";
import { enviarCartao } from "@/lib/notificacoes/bot";
import { cartaoTeste } from "@/lib/notificacoes/cartoes";
import { criarClienteAdmin } from "@/lib/supabase/admin";
import { criarClienteServidor } from "@/lib/supabase/server";

export type EstadoDestino = { ok?: string; erro?: string };

const URL_FEISHU = /^https:\/\/open\.feishu\.cn\/open-apis\/bot\/v2\/hook\/[A-Za-z0-9-]+$/;
const URL_LARK = /^https:\/\/open\.larksuite\.com\/open-apis\/bot\/v2\/hook\/[A-Za-z0-9-]+$/;

const schema = z
  .object({
    nome: z.string().trim().min(2, "Dê um nome ao destino.").max(80),
    plataforma: z.enum(["feishu", "lark"]),
    webhook_url: z.string().trim(),
    secret_assinatura: z.string().trim().max(200).optional(),
  })
  .refine((d) => (d.plataforma === "feishu" ? URL_FEISHU : URL_LARK).test(d.webhook_url), {
    path: ["webhook_url"],
    message: "URL inválida para a plataforma. Copie o “Webhook” do bot customizado do grupo.",
  });

export async function criarDestino(_: EstadoDestino, formData: FormData): Promise<EstadoDestino> {
  await exigirAdmin();
  const dados = schema.safeParse(Object.fromEntries(formData));
  if (!dados.success) return { erro: dados.error.issues[0]?.message };

  const supabase = await criarClienteServidor(); // RLS: só admin grava destinos
  const { error } = await supabase.from("destinos_notificacao").insert({
    ...dados.data,
    secret_assinatura: dados.data.secret_assinatura || null,
  });
  if (error) {
    return { erro: error.code === "23505" ? "Esse webhook já está cadastrado." : `Não foi possível salvar: ${error.message}` };
  }
  revalidatePath("/admin/notificacoes");
  return { ok: "Destino cadastrado. Use “Enviar teste” para conferir." };
}

export async function alternarDestino(formData: FormData) {
  await exigirAdmin();
  const id = z.uuid().parse(formData.get("id"));
  const ativo = formData.get("ativo") === "true";
  const supabase = await criarClienteServidor();
  await supabase.from("destinos_notificacao").update({ ativo }).eq("id", id);
  revalidatePath("/admin/notificacoes");
}

export async function excluirDestino(formData: FormData) {
  await exigirAdmin();
  const id = z.uuid().parse(formData.get("id"));
  const supabase = await criarClienteServidor();
  await supabase.from("destinos_notificacao").delete().eq("id", id);
  revalidatePath("/admin/notificacoes");
}

export async function testarDestino(_: EstadoDestino, formData: FormData): Promise<EstadoDestino> {
  await exigirAdmin();
  const id = z.uuid().safeParse(formData.get("id"));
  if (!id.success) return { erro: "Destino inválido." };

  const { data: destino } = await criarClienteAdmin()
    .from("destinos_notificacao")
    .select("id, nome, plataforma, webhook_url, secret_assinatura")
    .eq("id", id.data)
    .single();
  if (!destino) return { erro: "Destino não encontrado." };

  const resultado = await enviarCartao(destino, cartaoTeste(destino.nome));
  if (resultado.ok) return { ok: "Mensagem de teste enviada. Confira o grupo." };
  // 19021 = assinatura inválida; 19024 = palavra-chave; 9499 = parâmetro inválido.
  const dica = /19021/.test(resultado.erro ?? "")
    ? " (assinatura: confira o secret e o horário do servidor)"
    : /19024/.test(resultado.erro ?? "")
      ? " (o bot exige palavra-chave: use a verificação por assinatura ou adicione a palavra “chamado”)"
      : "";
  return { erro: `Falhou: ${resultado.erro}${dica}` };
}
