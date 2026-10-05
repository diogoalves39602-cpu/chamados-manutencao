import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { obterSessao } from "@/lib/auth/sessao";
import { FormTrocarSenha } from "./form-trocar-senha";

export const metadata: Metadata = { title: "Trocar senha" };

export default async function PaginaTrocarSenha() {
  const { userId, perfil } = await obterSessao();
  if (!userId) redirect("/login");
  if (!perfil || !perfil.ativo) redirect("/sair?motivo=inativo");

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 px-4 py-10">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Trocar senha</h1>
        <p className="mt-1 text-sm text-zinc-600">
          {perfil.deve_trocar_senha
            ? `Olá, ${perfil.nome}. Antes de continuar, crie uma senha pessoal.`
            : "Escolha uma nova senha."}
        </p>
      </div>
      <FormTrocarSenha obrigatoria={perfil.deve_trocar_senha} />
    </main>
  );
}
