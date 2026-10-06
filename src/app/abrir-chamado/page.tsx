import type { Metadata } from "next";
import { LoginPlataforma } from "@/components/login-plataforma";
import { PaginaPublica } from "@/components/pagina-publica";
import { descreverSla } from "@/lib/chamados/rotulos";
import { solicitanteAtual } from "@/lib/solicitante/atual";
import { formularioExigeLogin, plataformasAtivas } from "@/lib/solicitante/plataformas";
import { criarClienteAdmin } from "@/lib/supabase/admin";
import { criarClienteServidor } from "@/lib/supabase/server";
import { FormAbrirChamado } from "./form-abrir-chamado";

export const metadata: Metadata = {
  title: "Abrir chamado",
  description: "Abra um chamado para a equipe de manutenção. Atendimento 24h por dia.",
};

// SLA vigente (configuracoes é restrita à equipe pela RLS; lido no servidor).
async function slaMinutos() {
  try {
    const { data } = await criarClienteAdmin().from("configuracoes").select("sla_minutos").single();
    return data?.sla_minutos ?? 120;
  } catch {
    return 120;
  }
}

export default async function PaginaAbrirChamado({ searchParams }: PageProps<"/abrir-chamado">) {
  const { login } = await searchParams;
  const [solicitante, sla] = await Promise.all([solicitanteAtual(), slaMinutos()]);
  const subtitulo = `A equipe atende 24 horas por dia. Prazo de solução: até ${descreverSla(sla)} após a abertura.`;

  // Com o Feishu/Lark configurado, só abre chamado quem está identificado.
  if (!solicitante && formularioExigeLogin()) {
    return (
      <PaginaPublica titulo="Abrir chamado" subtitulo={subtitulo}>
        <LoginPlataforma
          plataformas={plataformasAtivas()}
          voltar="/abrir-chamado"
          motivo={typeof login === "string" ? login : undefined}
        />
      </PaginaPublica>
    );
  }

  const supabase = await criarClienteServidor();
  const { data: categorias } = await supabase
    .from("categorias")
    .select("id, nome")
    .eq("ativo", true)
    .order("ordem")
    .order("nome");

  return (
    <PaginaPublica titulo="Abrir chamado" subtitulo={subtitulo}>
      <FormAbrirChamado
        categorias={categorias ?? []}
        ofertaLogin={solicitante ? [] : plataformasAtivas()}
        identidade={
          solicitante
            ? {
                nome: solicitante.nome,
                plataforma: solicitante.plataforma,
                contato: solicitante.celular ?? solicitante.email ?? "",
              }
            : undefined
        }
      />
    </PaginaPublica>
  );
}
