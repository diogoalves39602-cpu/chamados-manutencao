import type { Metadata } from "next";
import { CircleCheck, Clock, Inbox, LogIn, MapPin, UserCheck } from "lucide-react";
import { PaginaPublica } from "@/components/pagina-publica";
import { Cartao, Selo } from "@/components/ui";
import { ROTULO_SITUACAO, ROTULO_STATUS, type Status } from "@/lib/chamados/rotulos";
import { formatarDataHora } from "@/lib/datas";
import { solicitanteAtual } from "@/lib/solicitante/atual";
import { PLATAFORMAS, plataformasAtivas } from "@/lib/solicitante/plataformas";
import { criarClienteAdmin } from "@/lib/supabase/admin";
import { FormAcompanhar } from "./form-acompanhar";

export const metadata: Metadata = {
  title: "Acompanhar chamado",
  description: "Consulte o andamento do seu chamado de manutenção.",
};

const COR: Record<Status, string> = {
  aberto: "bg-marca-100 text-marca-800",
  em_andamento: "bg-indigo-100 text-indigo-800",
  finalizado: "bg-emerald-100 text-emerald-800",
  cancelado: "bg-stone-200 text-stone-700",
};

const ICONE: Record<Status, typeof Inbox> = {
  aberto: Inbox,
  em_andamento: UserCheck,
  finalizado: CircleCheck,
  cancelado: Inbox,
};

export default async function PaginaAcompanhar({ searchParams }: PageProps<"/acompanhar">) {
  const { numero } = await searchParams;
  const solicitante = await solicitanteAtual();
  const plataformas = plataformasAtivas();

  // Chamados de quem está identificado pelo Feishu/Lark (somente os dele).
  const meus = solicitante
    ? (
        await criarClienteAdmin()
          .from("chamados")
          .select("numero, status, local, aberto_em, prazo_limite, finalizado_em, situacao_prazo, categoria:categorias(nome)")
          .eq("solicitante_plataforma", solicitante.plataforma)
          .eq("solicitante_externo_id", solicitante.id)
          .order("aberto_em", { ascending: false })
          .limit(20)
      ).data ?? []
    : [];

  return (
    <PaginaPublica
      titulo={solicitante ? `Seus chamados, ${solicitante.nome.split(" ")[0]}` : "Acompanhar chamado"}
      subtitulo={
        solicitante
          ? `Identificado pela conta do ${PLATAFORMAS[solicitante.plataforma].nome}.`
          : "Informe o número do chamado e o telefone ou e-mail usado na abertura."
      }
    >
      {solicitante ? (
        meus.length === 0 ? (
          <Cartao className="text-center text-sm text-stone-600">Você ainda não abriu nenhum chamado.</Cartao>
        ) : (
          <ul className="flex animate-entrar flex-col gap-2">
            {meus.map((c) => {
              const Icone = ICONE[c.status];
              const categoria = c.categoria as unknown as { nome: string } | null;
              return (
                <li key={c.numero}>
                  <Cartao className="flex items-start gap-3 p-4 sm:p-4">
                    <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${COR[c.status]}`}>
                      <Icone className="h-5 w-5" aria-hidden />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-sm font-bold text-stone-900">{c.numero}</span>
                        <Selo className={COR[c.status]}>{ROTULO_STATUS[c.status]}</Selo>
                      </div>
                      <p className="mt-0.5 flex items-center gap-1 truncate text-sm text-stone-700">
                        <MapPin className="h-3.5 w-3.5 shrink-0 text-stone-400" aria-hidden />
                        {c.local} · {categoria?.nome}
                      </p>
                      <p className="mt-0.5 flex items-center gap-1 text-xs text-stone-500">
                        <Clock className="h-3.5 w-3.5" aria-hidden />
                        {c.status === "finalizado"
                          ? `Concluído em ${formatarDataHora(c.finalizado_em)}${c.situacao_prazo ? ` · ${ROTULO_SITUACAO[c.situacao_prazo].toLowerCase()}` : ""}`
                          : c.status === "cancelado"
                            ? `Aberto em ${formatarDataHora(c.aberto_em)}`
                            : `Aberto em ${formatarDataHora(c.aberto_em)} · prazo ${formatarDataHora(c.prazo_limite)}`}
                      </p>
                    </div>
                  </Cartao>
                </li>
              );
            })}
          </ul>
        )
      ) : plataformas.length > 0 ? (
        <a
          href={`/auth/${plataformas[0]}/entrar?voltar=${encodeURIComponent("/acompanhar")}`}
          className="flex animate-entrar items-center justify-center gap-2 rounded-2xl border border-stone-200 bg-white p-4 text-sm font-semibold text-marca-700 shadow-sm hover:bg-marca-50"
        >
          <LogIn className="h-4 w-4" aria-hidden />
          Entre com o {PLATAFORMAS[plataformas[0]].nome} para ver todos os seus chamados
        </a>
      ) : null}

      <FormAcompanhar numeroInicial={typeof numero === "string" ? numero.slice(0, 20) : ""} />
    </PaginaPublica>
  );
}
