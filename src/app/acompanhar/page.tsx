import type { Metadata } from "next";
import { PaginaPublica } from "@/components/pagina-publica";
import { FormAcompanhar } from "./form-acompanhar";

export const metadata: Metadata = {
  title: "Acompanhar chamado",
  description: "Consulte o andamento do seu chamado de manutenção.",
};

export default async function PaginaAcompanhar({ searchParams }: PageProps<"/acompanhar">) {
  const { numero } = await searchParams;
  return (
    <PaginaPublica titulo="Acompanhar chamado" subtitulo="Informe o número do chamado e o telefone ou e-mail usado na abertura.">
      <FormAcompanhar numeroInicial={typeof numero === "string" ? numero.slice(0, 20) : ""} />
    </PaginaPublica>
  );
}
