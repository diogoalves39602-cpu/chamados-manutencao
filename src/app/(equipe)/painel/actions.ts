"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { exigirAdmin, exigirEquipe } from "@/lib/auth/sessao";
import { dadosModelo, textoReprovado } from "@/lib/chamados/modelos-mensagem";
import { enviarMensagemUsuario, explicarErroFeishu } from "@/lib/notificacoes/feishu-usuario";
import { configPlataforma, ehPlataforma } from "@/lib/solicitante/plataformas";
import { criarClienteServidor } from "@/lib/supabase/server";
import { urlBase } from "@/lib/url";

// As regras (quem pode, transições, cálculo do SLA) estão nas RPCs do banco.
// Aqui só validamos a entrada e traduzimos o resultado para a tela.

export type EstadoAcao = { ok?: string; erro?: string };

const id = z.uuid();

function concluir(numero: string | undefined, mensagem: string): EstadoAcao {
  revalidatePath("/painel");
  if (numero) revalidatePath(`/painel/${numero}`);
  return { ok: mensagem };
}

export async function assumirChamado(_: EstadoAcao, formData: FormData): Promise<EstadoAcao> {
  await exigirEquipe();
  const chamadoId = id.safeParse(formData.get("id"));
  if (!chamadoId.success) return { erro: "Chamado inválido." };

  const supabase = await criarClienteServidor();
  const { data, error } = await supabase.rpc("assumir_chamado", { p_chamado_id: chamadoId.data });
  if (error) return { erro: error.message };
  return concluir(data.numero, `Você assumiu o ${data.numero}.`);
}

export async function finalizarChamado(_: EstadoAcao, formData: FormData): Promise<EstadoAcao> {
  await exigirEquipe();
  const chamadoId = id.safeParse(formData.get("id"));
  const observacao = z.string().trim().min(3, "Descreva o que foi feito (mínimo 3 caracteres).").max(2000)
    .safeParse(formData.get("observacao"));
  if (!chamadoId.success) return { erro: "Chamado inválido." };
  if (!observacao.success) return { erro: observacao.error.issues[0]?.message };

  const supabase = await criarClienteServidor();
  const { data, error } = await supabase.rpc("finalizar_chamado", {
    p_chamado_id: chamadoId.data,
    p_observacao: observacao.data,
  });
  if (error) return { erro: error.message };
  const situacao = data.situacao_prazo === "dentro_do_prazo" ? "dentro do prazo" : "fora do prazo";
  return concluir(data.numero, `${data.numero} finalizado ${situacao}.`);
}

export async function reatribuirChamado(_: EstadoAcao, formData: FormData): Promise<EstadoAcao> {
  await exigirAdmin();
  const chamadoId = id.safeParse(formData.get("id"));
  const tecnico = id.safeParse(formData.get("tecnico"));
  const comentario = String(formData.get("comentario") ?? "").trim().slice(0, 500);
  if (!chamadoId.success) return { erro: "Chamado inválido." };
  if (!tecnico.success) return { erro: "Escolha o técnico." };

  const supabase = await criarClienteServidor();
  const { data, error } = await supabase.rpc("reatribuir_chamado", {
    p_chamado_id: chamadoId.data,
    p_tecnico_id: tecnico.data,
    p_comentario: comentario || undefined,
  });
  if (error) return { erro: error.message };
  return concluir(data.numero, `${data.numero} reatribuído.`);
}

/**
 * Reprova o chamado (status "cancelado" no banco, com o motivo) e avisa quem abriu:
 * pelo bot do Feishu/Lark quando a pessoa entrou com a conta; senão, a tela de
 * detalhes abre com a mensagem pronta para o WhatsApp.
 */
export async function reprovarChamado(_: EstadoAcao, formData: FormData): Promise<EstadoAcao> {
  const eu = await exigirAdmin();
  const chamadoId = id.safeParse(formData.get("id"));
  const motivo = z.string().trim().min(5, "Informe o motivo da reprovação (mínimo 5 caracteres).").max(1000)
    .safeParse(formData.get("motivo"));
  if (!chamadoId.success) return { erro: "Chamado inválido." };
  if (!motivo.success) return { erro: motivo.error.issues[0]?.message };

  const supabase = await criarClienteServidor();
  const { data, error } = await supabase.rpc("cancelar_chamado", {
    p_chamado_id: chamadoId.data,
    p_motivo: motivo.data,
  });
  if (error) return { erro: error.message.replace(/cancelamento/g, "reprovação") };

  let aviso: "feishu" | "falhou" | "manual" = "manual";
  const cfg = ehPlataforma(data.solicitante_plataforma) ? configPlataforma(data.solicitante_plataforma) : null;
  if (cfg && data.solicitante_externo_id) {
    const texto = textoReprovado(dadosModelo(data, await urlBase()));
    let falha: string | undefined;
    try {
      await enviarMensagemUsuario(cfg, data.solicitante_externo_id, texto);
    } catch (e) {
      console.error("aviso de reprovação:", e);
      falha = explicarErroFeishu(e);
    }
    await supabase.from("mensagens_solicitante").insert({
      chamado_id: data.id,
      canal: "feishu",
      texto,
      status: falha ? "falhou" : "enviada",
      erro: falha ?? null,
      enviado_por: eu.id,
    });
    aviso = falha ? "falhou" : "feishu";
  }

  revalidatePath("/painel");
  revalidatePath(`/painel/${data.numero}`);
  redirect(`/painel/${data.numero}?reprovado=${aviso}`);
}
