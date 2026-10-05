import type { Metadata } from "next";
import { PaginaPublica } from "@/components/pagina-publica";
import { FormLogin } from "./form-login";

export const metadata: Metadata = { title: "Entrar" };

const MENSAGENS: Record<string, string> = {
  inativo: "Seu acesso está desativado. Procure o administrador.",
  saiu: "Você saiu do sistema.",
};

export default async function PaginaLogin({ searchParams }: PageProps<"/login">) {
  const { voltar, motivo } = await searchParams;
  const destino = typeof voltar === "string" && voltar.startsWith("/") && !voltar.startsWith("//") ? voltar : "/painel";
  const aviso = typeof motivo === "string" ? MENSAGENS[motivo] : undefined;

  return (
    <PaginaPublica titulo="Área da equipe" subtitulo="Entre com seu usuário ou matrícula." largura="max-w-md">
      <FormLogin destino={destino} aviso={aviso} />
    </PaginaPublica>
  );
}
