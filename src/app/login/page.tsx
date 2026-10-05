import type { Metadata } from "next";
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
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 px-4 py-10">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Equipe de manutenção</h1>
        <p className="mt-1 text-sm text-zinc-600">Entre com seu usuário ou matrícula.</p>
      </div>
      <FormLogin destino={destino} aviso={aviso} />
    </main>
  );
}
