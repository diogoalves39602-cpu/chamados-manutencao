import type { Metadata } from "next";
import { Cartao } from "@/components/ui";
import { exigirEquipe } from "@/lib/auth/sessao";

export const metadata: Metadata = { title: "Painel" };

// Placeholder: a fila em tempo real chega na etapa 3.
export default async function Painel() {
  const perfil = await exigirEquipe();
  return (
    <Cartao>
      <h1 className="text-lg font-semibold">Olá, {perfil.nome}</h1>
      <p className="mt-1 text-sm text-zinc-600">A fila de chamados em tempo real será implementada na etapa 3.</p>
    </Cartao>
  );
}
