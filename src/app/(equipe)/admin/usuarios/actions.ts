"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { env } from "@/lib/env";
import { loginParaEmail, loginSchema, senhaSchema } from "@/lib/auth/login";
import { exigirAdmin } from "@/lib/auth/sessao";
import { criarClienteAdmin } from "@/lib/supabase/admin";

// Toda action revalida o admin: layouts não protegem Server Actions.

export type EstadoForm = {
  ok?: string;
  erro?: string;
  erros?: Record<string, string | undefined>;
  senhaGerada?: { login: string; senha: string };
};

const BANIMENTO_PERMANENTE = "876000h"; // ~100 anos

const criarSchema = z.object({
  login: loginSchema,
  nome: z.string().trim().min(2, "Informe o nome completo.").max(120),
  papel: z.enum(["tecnico", "admin"]),
  senha: senhaSchema,
});

function primeirosErros(erro: z.ZodError) {
  const campos = z.flattenError(erro).fieldErrors as Record<string, string[] | undefined>;
  return Object.fromEntries(Object.entries(campos).map(([k, v]) => [k, v?.[0]]));
}

export async function criarUsuario(_: EstadoForm, formData: FormData): Promise<EstadoForm> {
  await exigirAdmin();
  const dados = criarSchema.safeParse(Object.fromEntries(formData));
  if (!dados.success) return { erros: primeirosErros(dados.error) };

  const { login, nome, papel, senha } = dados.data;
  const admin = criarClienteAdmin();

  const { data: existente } = await admin.from("perfis").select("id").eq("login", login).maybeSingle();
  if (existente) return { erros: { login: "Já existe um usuário com esse login." } };

  const { data: criado, error } = await admin.auth.admin.createUser({
    email: loginParaEmail(login, env.NEXT_PUBLIC_AUTH_EMAIL_DOMAIN),
    password: senha,
    email_confirm: true, // sem envio de e-mail
    app_metadata: { login },
    user_metadata: { nome },
  });
  if (error || !criado.user) {
    if (error?.code === "email_exists") return { erros: { login: "Já existe um usuário com esse login." } };
    if (error?.code === "weak_password") return { erros: { senha: "Senha muito fraca." } };
    return { erro: `Não foi possível criar o usuário: ${error?.message ?? "erro desconhecido"}` };
  }

  const { error: erroPerfil } = await admin
    .from("perfis")
    .insert({ id: criado.user.id, login, nome, papel, deve_trocar_senha: true });
  if (erroPerfil) {
    await admin.auth.admin.deleteUser(criado.user.id); // desfaz para não deixar usuário órfão
    return { erro: `Não foi possível criar o perfil: ${erroPerfil.message}` };
  }

  revalidatePath("/admin/usuarios");
  return { ok: `Usuário ${login} criado.`, senhaGerada: { login, senha } };
}

const idSchema = z.uuid();

export async function redefinirSenha(_: EstadoForm, formData: FormData): Promise<EstadoForm> {
  await exigirAdmin();
  const id = idSchema.safeParse(formData.get("id"));
  const senha = senhaSchema.safeParse(formData.get("senha"));
  if (!id.success) return { erro: "Usuário inválido." };
  if (!senha.success) return { erros: { senha: senha.error.issues[0]?.message } };

  const admin = criarClienteAdmin();
  const { data: perfil } = await admin.from("perfis").select("login").eq("id", id.data).single();
  if (!perfil) return { erro: "Usuário não encontrado." };

  const { error } = await admin.auth.admin.updateUserById(id.data, { password: senha.data });
  if (error) return { erro: `Não foi possível redefinir: ${error.message}` };

  await admin.from("perfis").update({ deve_trocar_senha: true }).eq("id", id.data);
  revalidatePath("/admin/usuarios");
  return { ok: "Senha redefinida.", senhaGerada: { login: perfil.login, senha: senha.data } };
}

export async function alterarAtivo(_: EstadoForm, formData: FormData): Promise<EstadoForm> {
  const eu = await exigirAdmin();
  const id = idSchema.safeParse(formData.get("id"));
  if (!id.success) return { erro: "Usuário inválido." };
  const ativo = formData.get("ativo") === "true";
  if (id.data === eu.id && !ativo) return { erro: "Você não pode desativar a si mesmo." };

  const admin = criarClienteAdmin();
  // Perfil primeiro: o trigger impede desativar o último admin.
  const { error } = await admin.from("perfis").update({ ativo }).eq("id", id.data);
  if (error) return { erro: error.message };

  // Banir no Auth impede novo login e renovação da sessão.
  const { error: erroBan } = await admin.auth.admin.updateUserById(id.data, {
    ban_duration: ativo ? "none" : BANIMENTO_PERMANENTE,
  });
  if (erroBan) {
    await admin.from("perfis").update({ ativo: !ativo }).eq("id", id.data);
    return { erro: `Não foi possível ${ativo ? "reativar" : "desativar"}: ${erroBan.message}` };
  }
  revalidatePath("/admin/usuarios");
  return { ok: ativo ? "Usuário reativado." : "Usuário desativado." };
}

export async function alterarPapel(_: EstadoForm, formData: FormData): Promise<EstadoForm> {
  const eu = await exigirAdmin();
  const id = idSchema.safeParse(formData.get("id"));
  const papel = z.enum(["tecnico", "admin"]).safeParse(formData.get("papel"));
  if (!id.success || !papel.success) return { erro: "Dados inválidos." };
  if (id.data === eu.id && papel.data !== "admin") {
    return { erro: "Você não pode remover o seu próprio acesso de admin." };
  }

  const { error } = await criarClienteAdmin().from("perfis").update({ papel: papel.data }).eq("id", id.data);
  if (error) return { erro: error.message };
  revalidatePath("/admin/usuarios");
  return { ok: papel.data === "admin" ? "Agora é administrador." : "Agora é técnico." };
}
