import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import {
  ArrowLeft,
  BadgeCheck,
  Ban,
  CalendarDays,
  CircleCheck,
  Clock,
  Hand,
  Hash,
  History,
  Inbox,
  Mail,
  MapPin,
  MessageCircle,
  MessageSquareText,
  Phone,
  Repeat,
  Sun,
  Tag,
  Timer,
  User,
  UserCheck,
} from "lucide-react";
import { IconeCategoria } from "@/components/icone-categoria";
import { Cartao, Selo } from "@/components/ui";
import { exigirEquipe } from "@/lib/auth/sessao";
import { BUCKET_FOTOS } from "@/lib/chamados/constantes";
import { SELECT_CHAMADO } from "@/lib/chamados/consultas";
import { COR_STATUS, formatarDuracao, ROTULO_ORIGEM, ROTULO_SITUACAO, ROTULO_STATUS } from "@/lib/chamados/rotulos";
import { dadosModelo } from "@/lib/chamados/modelos-mensagem";
import type { ChamadoCompleto } from "@/lib/chamados/tipos";
import { emailDe, linkWhatsapp, telefoneDe } from "@/lib/contato";
import { formatarDataHora } from "@/lib/datas";
import { configPlataforma, ehPlataforma, PLATAFORMAS } from "@/lib/solicitante/plataformas";
import { criarClienteServidor } from "@/lib/supabase/server";
import { urlBase } from "@/lib/url";
import { AcoesDetalhe } from "./acoes-detalhe";
import { ContadorPrazo } from "./contador-prazo";
import { EnviarMensagem } from "./enviar-mensagem";

export async function generateMetadata({ params }: PageProps<"/painel/[numero]">): Promise<Metadata> {
  const { numero } = await params;
  return { title: decodeURIComponent(numero) };
}

const ACOES: Record<string, { rotulo: string; icone: LucideIcon; cor: string }> = {
  aberto: { rotulo: "Chamado aberto", icone: Inbox, cor: "bg-sky-600" },
  assumido: { rotulo: "Assumido", icone: Hand, cor: "bg-indigo-600" },
  reatribuido: { rotulo: "Reatribuído", icone: Repeat, cor: "bg-violet-600" },
  finalizado: { rotulo: "Finalizado", icone: CircleCheck, cor: "bg-emerald-600" },
  cancelado: { rotulo: "Cancelado", icone: Ban, cor: "bg-stone-500" },
};

/** Links para contatar o solicitante: telefone (ligar/WhatsApp) ou e-mail. */
function LinksContato({ contato }: { contato: string }) {
  const email = emailDe(contato);
  const telefone = telefoneDe(contato);
  const whatsapp = linkWhatsapp(contato);
  const classe =
    "inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-2.5 text-xs font-semibold text-stone-700 hover:border-marca-300 hover:text-marca-800";
  return (
    <div className="mt-1.5 flex flex-wrap gap-1.5">
      {telefone ? (
        <a href={`tel:${telefone}`} className={classe}>
          <Phone className="h-3.5 w-3.5" aria-hidden />
          Ligar
        </a>
      ) : null}
      {whatsapp ? (
        <a href={whatsapp} target="_blank" rel="noreferrer" className={classe}>
          <MessageCircle className="h-3.5 w-3.5" aria-hidden />
          WhatsApp
        </a>
      ) : null}
      {email ? (
        <a href={`mailto:${email}`} className={classe}>
          <Mail className="h-3.5 w-3.5" aria-hidden />
          E-mail
        </a>
      ) : null}
    </div>
  );
}

function Info({ icone: Icone, rotulo, children }: { icone: LucideIcon; rotulo: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <Icone className="mt-0.5 h-4 w-4 shrink-0 text-stone-400" aria-hidden />
      <div className="min-w-0">
        <dt className="text-xs font-medium text-stone-500">{rotulo}</dt>
        <dd className="text-sm text-stone-900">{children}</dd>
      </div>
    </div>
  );
}

export default async function DetalheChamado({ params }: PageProps<"/painel/[numero]">) {
  const perfil = await exigirEquipe();
  const numero = decodeURIComponent((await params).numero).toUpperCase();
  if (!/^CH-\d{6,}$/.test(numero)) notFound();

  const supabase = await criarClienteServidor();
  const { data } = await supabase.from("chamados").select(SELECT_CHAMADO).eq("numero", numero).maybeSingle();
  if (!data) notFound();
  const c = data as unknown as ChamadoCompleto;

  const [{ data: historico }, { data: tecnicos }, foto, { data: mensagens }, base] = await Promise.all([
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
    supabase
      .from("mensagens_solicitante")
      .select("id, canal, texto, status, erro, enviado_em, autor:perfis!mensagens_solicitante_enviado_por_fkey(nome)")
      .eq("chamado_id", c.id)
      .order("enviado_em"),
    urlBase(),
  ]);
  const plataformaSolicitante =
    ehPlataforma(c.solicitante_plataforma) && c.solicitante_externo_id && configPlataforma(c.solicitante_plataforma)
      ? PLATAFORMAS[c.solicitante_plataforma].nome
      : null;

  const ativo = c.status === "aberto" || c.status === "em_andamento";
  const agora = new Date(); // Server Component: renderiza uma vez por requisição

  return (
    <div className="flex flex-col gap-4">
      <Link
        href="/painel"
        className="inline-flex w-fit items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-medium text-stone-600 hover:bg-stone-200/60"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Voltar ao painel
      </Link>

      <Cartao className="flex flex-wrap items-center gap-4">
        <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-marca-50 text-marca-700">
          <IconeCategoria nome={c.categoria?.nome} className="h-7 w-7" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-mono text-xl font-bold text-marca-800">{c.numero}</h1>
            <Selo className={COR_STATUS[c.status]}>{ROTULO_STATUS[c.status]}</Selo>
            {c.situacao_prazo ? (
              <Selo className={c.situacao_prazo === "dentro_do_prazo" ? "bg-emerald-100 text-emerald-800" : "bg-orange-100 text-orange-800"}>
                {ROTULO_SITUACAO[c.situacao_prazo]}
              </Selo>
            ) : null}
          </div>
          <p className="mt-0.5 text-lg font-semibold text-stone-900">{c.local}</p>
          <p className="text-sm text-stone-500">{c.categoria?.nome}</p>
        </div>
        <ContadorPrazo
          chamado={{ status: c.status, prazo_limite: c.prazo_limite, situacao_prazo: c.situacao_prazo }}
          agoraServidor={agora.getTime()}
        />
      </Cartao>

      <div className="grid gap-4 lg:grid-cols-[1fr_21rem]">
        <div className="flex flex-col gap-4">
          <Cartao>
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-500">Descrição do problema</h2>
            <p className="whitespace-pre-wrap text-base leading-relaxed text-stone-900">{c.descricao}</p>
            {foto.data?.signedUrl ? (
              <a href={foto.data.signedUrl} target="_blank" rel="noreferrer" className="mt-4 block w-fit">
                {/* eslint-disable-next-line @next/next/no-img-element -- URL assinada temporária do Storage */}
                <img src={foto.data.signedUrl} alt="Foto enviada pelo solicitante" className="max-h-80 rounded-xl border border-stone-200" />
              </a>
            ) : null}
            {c.observacao_finalizacao ? (
              <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                <h3 className="flex items-center gap-1.5 text-xs font-semibold text-emerald-800">
                  <CircleCheck className="h-3.5 w-3.5" aria-hidden />
                  O que foi feito
                </h3>
                <p className="mt-1 whitespace-pre-wrap text-sm text-emerald-950">{c.observacao_finalizacao}</p>
              </div>
            ) : null}
            {c.motivo_cancelamento ? (
              <div className="mt-4 rounded-xl border border-stone-200 bg-stone-50 p-3">
                <h3 className="flex items-center gap-1.5 text-xs font-semibold text-stone-600">
                  <Ban className="h-3.5 w-3.5" aria-hidden />
                  Motivo do cancelamento
                </h3>
                <p className="mt-1 whitespace-pre-wrap text-sm">{c.motivo_cancelamento}</p>
              </div>
            ) : null}
          </Cartao>

          {ativo ? (
            <AcoesDetalhe chamadoId={c.id} status={c.status} ehAdmin={perfil.papel === "admin"} tecnicos={tecnicos ?? []} />
          ) : null}

          <EnviarMensagem
            chamadoId={c.id}
            contato={c.solicitante_contato}
            dados={dadosModelo(c, base)}
            feishu={plataformaSolicitante}
          />

          {mensagens?.length ? (
            <Cartao>
              <h2 className="mb-3 flex items-center gap-2 font-semibold text-stone-900">
                <MessageSquareText className="h-4 w-4 text-stone-500" aria-hidden />
                Mensagens enviadas ao solicitante
              </h2>
              <ul className="flex flex-col gap-3">
                {mensagens.map((m) => (
                  <li key={m.id} className="rounded-xl border border-stone-200 p-3">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-stone-500">
                      <Selo className={m.canal === "feishu" ? "bg-sky-100 text-sky-800" : "bg-emerald-100 text-emerald-800"}>
                        {m.canal === "feishu" ? "Feishu" : "WhatsApp"}
                      </Selo>
                      <span>
                        {formatarDataHora(m.enviado_em)}
                        {m.autor ? ` · por ${m.autor.nome}` : ""}
                      </span>
                      <span
                        className={`ml-auto font-semibold ${m.status === "falhou" ? "text-red-700" : m.status === "enviada" ? "text-emerald-700" : "text-stone-600"}`}
                      >
                        {m.status === "enviada" ? "Enviada" : m.status === "falhou" ? "Falhou" : "Aberta no WhatsApp"}
                      </span>
                    </div>
                    <p className="mt-1.5 whitespace-pre-wrap text-sm text-stone-800">{m.texto}</p>
                    {m.erro ? <p className="mt-1 text-xs text-red-700">{m.erro}</p> : null}
                  </li>
                ))}
              </ul>
            </Cartao>
          ) : null}

          <Cartao>
            <h2 className="mb-4 flex items-center gap-2 font-semibold text-stone-900">
              <History className="h-4 w-4 text-stone-500" aria-hidden />
              Histórico
            </h2>
            <ol className="flex flex-col">
              {historico?.map((h, i) => {
                const acao = ACOES[h.acao] ?? ACOES.aberto;
                const Icone = acao.icone;
                const ultimo = i === (historico?.length ?? 0) - 1;
                return (
                  <li key={h.id} className="relative flex gap-3 pb-5 last:pb-0">
                    {!ultimo ? <span className="absolute left-[15px] top-8 h-[calc(100%-2rem)] w-0.5 bg-stone-200" aria-hidden /> : null}
                    <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-white ${acao.cor}`}>
                      <Icone className="h-4 w-4" aria-hidden />
                    </span>
                    <div className="min-w-0 pt-0.5">
                      <p className="text-sm font-semibold text-stone-900">
                        {acao.rotulo}
                        {h.acao === "reatribuido" && h.responsavel ? (
                          <span className="font-normal text-stone-600"> para {h.responsavel.nome}</span>
                        ) : null}
                      </p>
                      <p className="text-xs text-stone-500">
                        {formatarDataHora(h.criado_em)}
                        {h.usuario ? ` · por ${h.usuario.nome}` : ""}
                      </p>
                      {h.comentario ? (
                        <p className="mt-1.5 whitespace-pre-wrap rounded-lg bg-stone-50 px-3 py-2 text-sm text-stone-700">{h.comentario}</p>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ol>
          </Cartao>
        </div>

        <Cartao className="h-fit">
          <dl className="flex flex-col gap-4">
            <Info icone={User} rotulo="Solicitante">
              {c.solicitante_nome} · {c.solicitante_setor}
              {c.solicitante_plataforma ? (
                <span className="mt-1 flex">
                  <Selo className="bg-emerald-100 text-emerald-800" icone={BadgeCheck}>
                    Verificado pelo {c.solicitante_plataforma === "lark" ? "Lark" : "Feishu"}
                  </Selo>
                </span>
              ) : null}
              {c.solicitante_externo_id ? (
                <span className="mt-0.5 block break-all font-mono text-[11px] text-stone-500" title="ID da pessoa no Feishu (open_id)">
                  ID Feishu: {c.solicitante_externo_id}
                </span>
              ) : null}
              <span className="block text-stone-600">{c.solicitante_contato}</span>
              <LinksContato contato={c.solicitante_contato} />
            </Info>
            <Info icone={MapPin} rotulo="Local">{c.local}</Info>
            <Info icone={Tag} rotulo="Categoria · origem">
              {c.categoria?.nome ?? "—"} · {ROTULO_ORIGEM[c.origem]}
            </Info>
            <Info icone={Sun} rotulo="Turno">{c.turno}</Info>
            <hr className="border-stone-100" />
            <Info icone={CalendarDays} rotulo="Aberto em">{formatarDataHora(c.aberto_em)}</Info>
            <Info icone={Clock} rotulo="Prazo limite">
              {formatarDataHora(c.prazo_limite)} <span className="text-stone-500">(SLA {formatarDuracao(c.sla_minutos)})</span>
            </Info>
            <Info icone={UserCheck} rotulo="Responsável">
              {c.recebido ? (
                <>
                  {c.recebido.nome}
                  <span className="block text-stone-500">
                    assumiu em {formatarDataHora(c.recebido_em)} · {formatarDuracao(c.tempo_ate_assumir_minutos)} após abrir
                  </span>
                </>
              ) : (
                "Ninguém assumiu ainda"
              )}
            </Info>
            {c.status === "finalizado" ? (
              <Info icone={Timer} rotulo="Finalizado">
                {formatarDataHora(c.finalizado_em)} por {c.finalizador?.nome ?? "—"}
                <span className="block text-stone-500">Tempo total: {formatarDuracao(c.tempo_total_minutos)}</span>
              </Info>
            ) : null}
            {c.status === "cancelado" ? (
              <Info icone={Ban} rotulo="Cancelado">
                {formatarDataHora(c.cancelado_em)} por {c.cancelador?.nome ?? "—"}
              </Info>
            ) : null}
            <Info icone={Hash} rotulo="Número">
              <span className="font-mono">{c.numero}</span>
            </Info>
          </dl>
        </Cartao>
      </div>
    </div>
  );
}
