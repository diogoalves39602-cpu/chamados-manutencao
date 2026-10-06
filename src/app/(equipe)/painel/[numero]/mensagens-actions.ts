"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { exigirEquipe } from "@/lib/auth/sessao";
import { enviarMensagemUsuario, explicarErroFeishu } from "@/lib/notificacoes/feishu-usuario";
import { configPlataforma, ehPlataforma, PLATAFORMAS } from "@/lib/solicitante/plataformas";
import { criarClienteServidor } from "@/lib/supabase/server";

export type EstadoMensagem = { ok?: string; erro?: string };

const entrada = z.object({
  chamadoId: z.uuid(),
  texto: z.string().trim().min(1, "Escreva a mensagem.").max(2000, "Mensagem muito longa (máx. 2000 caracteres)."),
});

/** Envia a mensagem pelo bot do Feishu/Lark para quem abriu o chamado identificado. */
export async function enviarPeloFeishu(_: EstadoMensagem, formData: FormData): Promise<EstadoMensagem> {
  const eu = await exigirEquipe();
  const dados = entrada.safeParse({ chamadoId: formData.get("chamadoId"), texto: formData.get("texto") });
  if (!dados.success) return { erro: dados.error.issues[0]?.message };

  const supabase = await criarClienteServidor();
  const { data: c } = await supabase
    .from("chamados")
    .select("numero, solicitante_plataforma, solicitante_externo_id")
    .eq("id", dados.data.chamadoId)
    .single();
  if (!c) return { erro: "Chamado não encontrado." };
  if (!ehPlataforma(c.solicitante_plataforma) || !c.solicitante_externo_id) {
    return { erro: "Este solicitante não entrou com o Feishu ao abrir o chamado. Use o WhatsApp ou ligue." };
  }
  const cfg = configPlataforma(c.solicitante_plataforma);
  if (!cfg) return { erro: `O app do ${PLATAFORMAS[c.solicitante_plataforma].nome} não está configurado no servidor.` };

  let erro: string | undefined;
  try {
    await enviarMensagemUsuario(cfg, c.solicitante_externo_id, dados.data.texto);
  } catch (e) {
    console.error("mensagem feishu:", e);
    erro = explicarErroFeishu(e);
  }

  await supabase.from("mensagens_solicitante").insert({
    chamado_id: dados.data.chamadoId,
    canal: "feishu",
    texto: dados.data.texto,
    status: erro ? "falhou" : "enviada",
    erro: erro ?? null,
    enviado_por: eu.id,
  });
  revalidatePath(`/painel/${c.numero}`);
  return erro ? { erro } : { ok: `Mensagem enviada no ${PLATAFORMAS[c.solicitante_plataforma].nome}.` };
}

/** Registra no histórico que a conversa foi aberta no WhatsApp com o texto pronto. */
export async function registrarWhatsapp(chamadoId: string, texto: string) {
  const eu = await exigirEquipe();
  const dados = entrada.safeParse({ chamadoId, texto });
  if (!dados.success) return;
  const supabase = await criarClienteServidor();
  await supabase.from("mensagens_solicitante").insert({
    chamado_id: dados.data.chamadoId,
    canal: "whatsapp",
    texto: dados.data.texto,
    status: "aberta_no_whatsapp",
    enviado_por: eu.id,
  });
  const { data } = await supabase.from("chamados").select("numero").eq("id", dados.data.chamadoId).single();
  if (data) revalidatePath(`/painel/${data.numero}`);
}
