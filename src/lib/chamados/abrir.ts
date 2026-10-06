import "server-only";
import { randomUUID } from "node:crypto";
import { after } from "next/server";
import { criarClienteAdmin } from "@/lib/supabase/admin";
import { notificarNovos } from "@/lib/notificacoes/enviar";
import { BUCKET_FOTOS } from "./constantes";
import type { NovoChamado } from "./validacao";
import type { Origem } from "./rotulos";

const EXTENSAO: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

/** Envia a foto para o bucket privado e devolve o caminho (aaaa/mm/uuid.ext). */
export async function salvarFoto(foto: File): Promise<string> {
  const agora = new Date();
  const caminho = `${agora.getUTCFullYear()}/${String(agora.getUTCMonth() + 1).padStart(2, "0")}/${randomUUID()}.${EXTENSAO[foto.type] ?? "jpg"}`;
  const { error } = await criarClienteAdmin()
    .storage.from(BUCKET_FOTOS)
    .upload(caminho, foto, { contentType: foto.type, upsert: false });
  if (error) throw new Error(`Falha ao salvar a foto: ${error.message}`);
  return caminho;
}

/**
 * Ponto único de abertura de chamado (formulário, Feishu, Lark, API).
 * Prazo, turno e número são definidos pelo banco. A notificação ao grupo sai
 * logo após a resposta; se falhar, o cron reenvia no minuto seguinte.
 */
export async function registrarChamado(
  dados: NovoChamado,
  origem: Origem,
  fotoPath?: string,
  identidade?: { plataforma: "feishu" | "lark"; id: string },
) {
  const { data, error } = await criarClienteAdmin().rpc("abrir_chamado", {
    p_solicitante_nome: dados.solicitante_nome,
    p_solicitante_setor: dados.solicitante_setor,
    p_solicitante_contato: dados.solicitante_contato,
    p_local: dados.local,
    p_categoria_id: dados.categoria_id,
    p_descricao: dados.descricao,
    p_origem: origem,
    p_foto_path: fotoPath,
    p_solicitante_plataforma: identidade?.plataforma,
    p_solicitante_externo_id: identidade?.id,
  });
  if (error || !data) throw new Error(error?.message ?? "Falha ao abrir o chamado.");

  after(async () => {
    try {
      await notificarNovos(data.id);
    } catch (e) {
      console.error("Notificação de novo chamado falhou (o cron tentará de novo):", e);
    }
  });

  return { id: data.id, numero: data.numero, aberto_em: data.aberto_em, prazo_limite: data.prazo_limite };
}
