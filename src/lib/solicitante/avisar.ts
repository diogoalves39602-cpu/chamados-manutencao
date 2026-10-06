import "server-only";
import { enviarMensagemUsuario, explicarErroFeishu } from "@/lib/notificacoes/feishu-usuario";
import { criarClienteAdmin } from "@/lib/supabase/admin";
import { configPlataforma, ehPlataforma } from "./plataformas";

export type ResultadoAviso = "enviada" | "falhou" | "sem_feishu";

/**
 * Manda uma mensagem pelo bot do Feishu/Lark para quem abriu o chamado (se entrou
 * com a conta) e registra em mensagens_solicitante. Nunca lança erro: o chamado
 * já foi atualizado e o aviso é um extra.
 */
export async function avisarSolicitante(
  c: { id: string; solicitante_plataforma: string | null; solicitante_externo_id: string | null },
  texto: string,
  enviadoPor: string,
): Promise<ResultadoAviso> {
  const cfg = ehPlataforma(c.solicitante_plataforma) ? configPlataforma(c.solicitante_plataforma) : null;
  if (!cfg || !c.solicitante_externo_id) return "sem_feishu";

  let falha: string | undefined;
  try {
    await enviarMensagemUsuario(cfg, c.solicitante_externo_id, texto);
  } catch (e) {
    console.error("aviso ao solicitante:", e);
    falha = explicarErroFeishu(e);
  }
  const { error } = await criarClienteAdmin().from("mensagens_solicitante").insert({
    chamado_id: c.id,
    canal: "feishu",
    texto,
    status: falha ? "falhou" : "enviada",
    erro: falha ?? null,
    enviado_por: enviadoPor,
  });
  if (error) console.error("registro do aviso:", error.message);
  return falha ? "falhou" : "enviada";
}
