import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PaginaPublica } from "@/components/pagina-publica";
import { obterSessao } from "@/lib/auth/sessao";
import { FormTrocarSenha } from "./form-trocar-senha";

export const metadata: Metadata = { title: "Trocar senha" };

export default async function PaginaTrocarSenha() {
  const { userId, perfil } = await obterSessao();
  if (!userId) redirect("/login");
  if (!perfil || !perfil.ativo) redirect("/sair?motivo=inativo");

  return (
    <PaginaPublica
      titulo={perfil.deve_trocar_senha ? `Bem-vindo, ${perfil.nome.split(" ")[0]}!` : "Trocar senha"}
      subtitulo={
        perfil.deve_trocar_senha
          ? "Antes de continuar, crie uma senha pessoal. Anote-a: o administrador não consegue vê-la."
          : "Escolha uma nova senha."
      }
      largura="max-w-md"
    >
      <FormTrocarSenha obrigatoria={perfil.deve_trocar_senha} />
    </PaginaPublica>
  );
}
