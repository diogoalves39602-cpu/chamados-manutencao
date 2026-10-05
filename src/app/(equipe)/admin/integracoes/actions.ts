"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { exigirAdmin } from "@/lib/auth/sessao";
import { sha256 } from "@/lib/seguranca";
import { criarClienteAdmin } from "@/lib/supabase/admin";
import { criarClienteServidor } from "@/lib/supabase/server";

export type EstadoToken = { erro?: string; tokenGerado?: { nome: string; origem: string; token: string } };

const schema = z.object({
  nome: z.string().trim().min(2, "Dê um nome (ex.: Base Feishu – Manutenção).").max(80),
  origem: z.enum(["feishu", "lark", "api"]),
});

export async function criarToken(_: EstadoToken, formData: FormData): Promise<EstadoToken> {
  const eu = await exigirAdmin();
  const dados = schema.safeParse(Object.fromEntries(formData));
  if (!dados.success) return { erro: dados.error.issues[0]?.message };

  // 256 bits aleatórios. Só o hash vai para o banco; o token aparece uma única vez.
  const token = `chm_${dados.data.origem}_${randomBytes(32).toString("base64url")}`;
  const { error } = await criarClienteAdmin().from("tokens_integracao").insert({
    nome: dados.data.nome,
    origem: dados.data.origem,
    token_hash: sha256(token),
    prefixo: token.slice(0, 16),
    criado_por: eu.id,
  });
  if (error) return { erro: `Não foi possível criar o token: ${error.message}` };

  revalidatePath("/admin/integracoes");
  return { tokenGerado: { nome: dados.data.nome, origem: dados.data.origem, token } };
}

export async function revogarToken(formData: FormData) {
  await exigirAdmin();
  const id = z.uuid().parse(formData.get("id"));
  // RLS: só admin atualiza tokens.
  const supabase = await criarClienteServidor();
  await supabase
    .from("tokens_integracao")
    .update({ ativo: false, revogado_em: new Date().toISOString() })
    .eq("id", id);
  revalidatePath("/admin/integracoes");
}
