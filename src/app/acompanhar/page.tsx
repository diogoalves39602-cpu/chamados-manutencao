import type { Metadata } from "next";
import { LogIn } from "lucide-react";
import { PaginaPublica } from "@/components/pagina-publica";
import { Cartao } from "@/components/ui";
import { solicitanteAtual } from "@/lib/solicitante/atual";
import { PLATAFORMAS, plataformasAtivas, type Plataforma } from "@/lib/solicitante/plataformas";
import { criarClienteAdmin } from "@/lib/supabase/admin";
import { FormAcompanhar } from "./form-acompanhar";
import { ListaChamados, type ChamadoSolicitante } from "./lista-chamados";

export const metadata: Metadata = {
  title: "Acompanhar chamado",
  description: "Consulte o andamento dos seus chamados de manutenção.",
};

// Chamados de quem está identificado pelo Feishu/Lark (somente os dele).
async function chamadosDoSolicitante(plataforma: Plataforma, id: string): Promise<ChamadoSolicitante[]> {
  const { data } = await criarClienteAdmin()
    .from("chamados")
    .select(
      "numero, status, local, aberto_em, prazo_limite, recebido_em, finalizado_em, situacao_prazo, observacao_finalizacao, categoria:categorias(nome)",
    )
    .eq("solicitante_plataforma", plataforma)
    .eq("solicitante_externo_id", id)
    .order("aberto_em", { ascending: false })
    .limit(20);
  return (data ?? []).map(({ categoria, ...c }) => ({
    ...c,
    categoria: (categoria as unknown as { nome: string } | null)?.nome ?? "—",
  }));
}

export default async function PaginaAcompanhar({ searchParams }: PageProps<"/acompanhar">) {
  const { numero } = await searchParams;
  const destacar = typeof numero === "string" ? numero.toUpperCase().slice(0, 20) : undefined;
  const solicitante = await solicitanteAtual();
  const plataformas = plataformasAtivas();
  const meus = solicitante ? await chamadosDoSolicitante(solicitante.plataforma, solicitante.id) : [];

  return (
    <PaginaPublica
      titulo={solicitante ? `Seus chamados, ${solicitante.nome.split(" ")[0]}` : "Acompanhar meus chamados"}
      subtitulo={
        solicitante
          ? `Identificado pela conta do ${PLATAFORMAS[solicitante.plataforma].nome}.`
          : "Não precisa do número: entre com o Feishu ou informe o telefone ou e-mail usado na abertura."
      }
    >
      {solicitante ? (
        meus.length === 0 ? (
          <Cartao className="text-center text-sm text-stone-600">
            Nenhum chamado aberto com sua conta do {PLATAFORMAS[solicitante.plataforma].nome} ainda. Se abriu sem entrar,
            busque pelo telefone ou e-mail abaixo.
          </Cartao>
        ) : (
          <ListaChamados chamados={meus} destacar={destacar} />
        )
      ) : plataformas.length > 0 ? (
        <div className="flex animate-entrar flex-col gap-2">
          {plataformas.map((p) => (
            <a
              key={p}
              href={`/auth/${p}/entrar?voltar=${encodeURIComponent("/acompanhar")}`}
              className="flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-white/60 bg-white p-4 text-base font-semibold text-marca-800 shadow-lg shadow-marca-900/20 hover:bg-marca-50"
            >
              <LogIn className="h-5 w-5" aria-hidden />
              Entrar com {PLATAFORMAS[p].nome} e ver meus chamados
            </a>
          ))}
          <p className="text-center text-xs font-medium uppercase tracking-wide text-stone-400">ou</p>
        </div>
      ) : null}

      <FormAcompanhar destacar={destacar} />
    </PaginaPublica>
  );
}
