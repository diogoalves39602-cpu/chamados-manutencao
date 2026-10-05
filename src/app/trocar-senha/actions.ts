"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { senhaSchema } from "@/lib/auth/login";
import { obterSessao } from "@/lib/auth/sessao";
import { criarClienteAdmin } from "@/lib/supabase/admin";
import { criarClienteServidor } from "@/lib/supabase/server";

export type EstadoTrocarSenha = { erro?: string; erros?: Partial<Record<"senha" | "confirmacao", string>> };

const schema = z
  .object({ senha: senhaSchema, confirmacao: z.string() })
  .refine((d) => d.senha === d.confirmacao, { path: ["confirmacao"], message: "As senhas não conferem." });

export async function trocarSenha(_: EstadoTrocarSenha, formData: FormData): Promise<EstadoTrocarSenha> {
  const { userId, perfil } = await obterSessao();
  if (!userId || !perfil?.ativo) redirect("/login");

  const resultado = schema.safeParse({ senha: formData.get("senha"), confirmacao: formData.get("confirmacao") });
  if (!resultado.success) {
    const campos = z.flattenError(resultado.error).fieldErrors;
    return { erros: { senha: campos.senha?.[0], confirmacao: campos.confirmacao?.[0] } };
  }

  const supabase = await criarClienteServidor();
  const { error } = await supabase.auth.updateUser({ password: resultado.data.senha });
  if (error) {
    if (error.code === "same_password") return { erros: { senha: "A nova senha precisa ser diferente da atual." } };
    if (error.code === "weak_password") return { erros: { senha: "Senha muito fraca. Use letras e números." } };
    return { erro: "Não foi possível trocar a senha. Tente novamente." };
  }

  if (perfil.deve_trocar_senha) {
    const { error: erroPerfil } = await criarClienteAdmin()
      .from("perfis")
      .update({ deve_trocar_senha: false })
      .eq("id", userId);
    if (erroPerfil) return { erro: "Senha trocada, mas não foi possível liberar o acesso. Tente de novo." };
  }

  redirect("/painel");
}
