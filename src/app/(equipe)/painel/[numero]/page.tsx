import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Cartao } from "@/components/ui";
import { exigirEquipe } from "@/lib/auth/sessao";
import { BUCKET_FOTOS } from "@/lib/chamados/constantes";
import { SELECT_CHAMADO } from "@/lib/chamados/consultas";
import { COR_STATUS, formatarDuracao, ROTULO_ORIGEM, ROTULO_SITUACAO, ROTULO_STATUS } from "@/lib/chamados/rotulos";
import type { ChamadoCompleto } from "@/lib/chamados/tipos";
import { formatarDataHora } from "@/lib/datas";
import { criarClienteServidor } from "@/lib/supabase/server";
import { AcoesDetalhe } from "./acoes-detalhe";
import { ContadorPrazo } from "./contador-prazo";

export async function generateMetadata({ params }: PageProps<"/painel/[numero]">): Promise<Metadata> {
  const { numero } = await params;
  return { title: decodeURIComponent(numero) };
}

const ROTULO_ACAO: Record<string, string> = {
  aberto: "Chamado aberto",
  assumido: "Assumido",
  reatribuido: "Reatribuído",
  finalizado: "Finalizado",
  cancelado: "Cancelado",
};

export default async function DetalheChamado({ params }: PageProps<"/painel/[numero]">) {
  const perfil = await exigirEquipe();
  const numero = decodeURIComponent((await params).numero).toUpperCase();
  if (!/^CH-\d{6,}$/.test(numero)) notFound();

  const supabase = await criarClienteServidor();
  const { data } = await supabase.from("chamados").select(SELECT_CHAMADO).eq("numero", numero).maybeSingle();
  if (!data) notFound();
  const c = data as unknown as ChamadoCompleto;

  const [{ data: historico }, { data: tecnicos }, foto] = await Promise.all([
    supabase
      .from("chamado_historico")
      .select(
        "id, acao, status_de, status_para, comentario, criado_em, usuario:perfis!chamado_historico_usuario_id_fkey(nome), responsavel:perfis!chamado_historico_responsavel_id_fkey(nome)",
      )
      .eq("chamado_id", c.id)
      .order("criado_em"),
    perfil.papel === "admin"
      ? supabase.from("perfis").select("id, nome").eq("ativo", true).order("nome")
      : Promise.resolve({ data: [] as { id: string; nome: string }[] }),
    c.foto_path
      ? supabase.storage.from(BUCKET_FOTOS).createSignedUrl(c.foto_path, 60 * 60)
      : Promise.resolve({ data: null }),
  ]);

  const ativo = c.status === "aberto" || c.status === "em_andamento";
  const agora = new Date(); // Server Component: renderiza uma vez por requisição

  const campos: [string, string][] = [
    ["Solicitante", `${c.solicitante_nome} (${c.solicitante_setor})`],
    ["Contato", c.solicitante_contato],
    ["Local", c.local],
    ["Categoria", c.categoria?.nome ?? "—"],
    ["Origem", ROTULO_ORIGEM[c.origem]],
    ["Turno", c.turno],
    ["Aberto em", formatarDataHora(c.aberto_em)],
    ["Prazo limite", `${formatarDataHora(c.prazo_limite)} (SLA ${formatarDuracao(c.sla_minutos)})`],
    ["Recebido por", c.recebido ? `${c.recebido.nome} em ${formatarDataHora(c.recebido_em)}` : "—"],
    ["Tempo até assumir", formatarDuracao(c.tempo_ate_assumir_minutos)],
  ];
  if (c.status === "finalizado") {
    campos.push(
      ["Finalizado por", `${c.finalizador?.nome ?? "—"} em ${formatarDataHora(c.finalizado_em)}`],
      ["Tempo total", formatarDuracao(c.tempo_total_minutos)],
      ["Situação do prazo", c.situacao_prazo ? ROTULO_SITUACAO[c.situacao_prazo] : "—"],
    );
  }
  if (c.status === "cancelado") {
    campos.push(["Cancelado por", `${c.cancelador?.nome ?? "—"} em ${formatarDataHora(c.cancelado_em)}`]);
  }

  return (
    <div className="flex flex-col gap-4">
      <Link href="/painel" className="text-sm text-blue-700 hover:underline">
        ← Voltar ao painel
      </Link>

      <div className="flex flex-wrap items-center gap-3">
        <h1 className="font-mono text-2xl font-bold text-zinc-900">{c.numero}</h1>
        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${COR_STATUS[c.status]}`}>
          {ROTULO_STATUS[c.status]}
        </span>
        <ContadorPrazo
          chamado={{ status: c.status, prazo_limite: c.prazo_limite, situacao_prazo: c.situacao_prazo }}
          agoraServidor={agora.getTime()}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_22rem]">
        <div className="flex flex-col gap-4">
          <Cartao>
            <h2 className="mb-2 text-sm font-semibold text-zinc-500">Descrição</h2>
            <p className="whitespace-pre-wrap text-base text-zinc-900">{c.descricao}</p>
            {foto.data?.signedUrl ? (
              <a href={foto.data.signedUrl} target="_blank" rel="noreferrer" className="mt-3 block">
                {/* eslint-disable-next-line @next/next/no-img-element -- URL assinada temporária do Storage */}
                <img src={foto.data.signedUrl} alt="Foto enviada pelo solicitante" className="max-h-80 rounded-lg border border-zinc-200" />
              </a>
            ) : null}
            {c.observacao_finalizacao ? (
              <div className="mt-4 rounded-lg bg-green-50 p-3">
                <h3 className="text-xs font-semibold text-green-800">Observação da finalização</h3>
                <p className="whitespace-pre-wrap text-sm text-green-900">{c.observacao_finalizacao}</p>
              </div>
            ) : null}
            {c.motivo_cancelamento ? (
              <div className="mt-4 rounded-lg bg-zinc-100 p-3">
                <h3 className="text-xs font-semibold text-zinc-600">Motivo do cancelamento</h3>
                <p className="whitespace-pre-wrap text-sm">{c.motivo_cancelamento}</p>
              </div>
            ) : null}
          </Cartao>

          {ativo ? (
            <AcoesDetalhe chamadoId={c.id} status={c.status} ehAdmin={perfil.papel === "admin"} tecnicos={tecnicos ?? []} />
          ) : null}

          <Cartao>
            <h2 className="mb-3 font-semibold">Histórico</h2>
            <ol className="relative flex flex-col gap-4 border-l-2 border-zinc-200 pl-4">
              {historico?.map((h) => (
                <li key={h.id} className="relative">
                  <span className="absolute -left-[1.4rem] top-1.5 h-2.5 w-2.5 rounded-full bg-blue-600" aria-hidden />
                  <p className="text-sm font-semibold text-zinc-900">
                    {ROTULO_ACAO[h.acao] ?? h.acao}
                    {h.status_de ? (
                      <span className="font-normal text-zinc-500">
                        {" "}
                        · {ROTULO_STATUS[h.status_de]} → {ROTULO_STATUS[h.status_para]}
                      </span>
                    ) : null}
                  </p>
                  <p className="text-xs text-zinc-500">
                    {formatarDataHora(h.criado_em)}
                    {h.usuario ? ` · por ${h.usuario.nome}` : ""}
                    {h.acao === "reatribuido" && h.responsavel ? ` · para ${h.responsavel.nome}` : ""}
                  </p>
                  {h.comentario ? <p className="mt-1 whitespace-pre-wrap text-sm text-zinc-700">{h.comentario}</p> : null}
                </li>
              ))}
            </ol>
          </Cartao>
        </div>

        <Cartao className="h-fit">
          <dl className="flex flex-col gap-3">
            {campos.map(([rotulo, valor]) => (
              <div key={rotulo}>
                <dt className="text-xs font-medium text-zinc-500">{rotulo}</dt>
                <dd className="text-sm text-zinc-900">{valor}</dd>
              </div>
            ))}
          </dl>
        </Cartao>
      </div>
    </div>
  );
}
